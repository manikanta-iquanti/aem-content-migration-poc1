"use strict";

const path = require("path");
const fs = require("fs-extra");
const axios = require("axios");
const { loadAemConfig, ROOT } = require("./lib/aem-config");
const {
  urlKey,
  damPathForUrl,
  collectAllAssetUrls,
  rewriteItemAssetRefs,
  mimeAllowed,
  extensionFromMime,
  filenameFromUrl,
  hashUrl,
} = require("./lib/asset-migration");

const CONFIG_PATH = path.join(ROOT, "config", "config.json");

/**
 * @param {Array<{ url: string, usedBy: Set<string> }>} entries
 * @param {number} concurrency
 * @param {(entry: { url: string, usedBy: Set<string> }) => Promise<object>} worker
 */
async function mapPool(entries, concurrency, worker) {
  const results = [];
  let idx = 0;
  async function runOne() {
    while (idx < entries.length) {
      const i = idx++;
      results[i] = await worker(entries[i]);
    }
  }
  const runners = Array.from(
    { length: Math.min(concurrency, entries.length) },
    () => runOne()
  );
  await Promise.all(runners);
  return results;
}

/**
 * @param {import('./lib/aem-config').loadAemConfig extends Function ? ReturnType<typeof loadAemConfig> : never} aem
 * @param {object} config
 */
async function migrateAssets(aem, config) {
  const bundleExists = await fs.pathExists(aem.bundleFile);
  if (!bundleExists) {
    throw new Error(`Run generate first. Missing: ${aem.bundleFile}`);
  }

  const bundle = await fs.readJson(aem.bundleFile);
  const items = Array.isArray(bundle.items) ? bundle.items : [];
  const sourceBase =
    config.source?.baseUrl?.replace(/\/$/, "") ||
    config.extract?.documents?.linkBaseUrl?.replace(/\/$/, "") ||
    "";

  const urlMap = collectAllAssetUrls(items, sourceBase);
  const entries = [...urlMap.values()];

  if (entries.length === 0) {
    const manifest = {
      generatedAt: new Date().toISOString(),
      damRoot: aem.damRoot,
      entries: [],
      summary: { total: 0, ok: 0, failed: 0, skipped: 0 },
    };
    await fs.ensureDir(path.dirname(aem.assetManifestFile));
    await fs.writeJson(aem.assetManifestFile, manifest, { spaces: 2 });
    console.log("No image URLs found in bundle; manifest written.");
    return manifest;
  }

  await fs.ensureDir(aem.assets.localCacheDir);

  const auth =
    config.source?.username && config.source?.applicationPassword
      ? {
          username: config.source.username,
          password: config.source.applicationPassword,
        }
      : undefined;

  const usedBasenames = new Set();
  /** @type {Map<string, string>} */
  const damPathByUrlKey = new Map();
  for (const entry of entries) {
    const key = urlKey(entry.url);
    if (!damPathByUrlKey.has(key)) {
      damPathByUrlKey.set(
        key,
        damPathForUrl(aem.damRoot, entry.url, usedBasenames)
      );
    }
  }

  const damRootNorm = aem.damRoot.replace(/\/+$/, "");

  const manifestEntries = await mapPool(
    entries,
    aem.assets.maxConcurrentDownloads,
    async (entry) => {
      const sourceUrl = entry.url;
      const usedBy = [...entry.usedBy];

      let damPath = damPathByUrlKey.get(urlKey(sourceUrl)) || "";
      const cacheName = `${hashUrl(sourceUrl)}-${filenameFromUrl(sourceUrl)}`;
      const cacheFile = path.join(aem.assets.localCacheDir, cacheName);

      try {
        if (await fs.pathExists(cacheFile)) {
          const stat = await fs.stat(cacheFile);
          if (stat.size > 0) {
            const mimeType = mimeFromExt(path.extname(cacheFile));
            return {
              sourceUrl,
              damPath,
              localFile: cacheFile,
              status: "ok",
              bytes: stat.size,
              mimeType,
              usedBy,
              cached: true,
            };
          }
        }

        const res = await axios.get(sourceUrl, {
          responseType: "arraybuffer",
          timeout: 30000,
          maxRedirects: 5,
          auth,
          validateStatus: (s) => s >= 200 && s < 400,
        });

        const mimeType =
          String(res.headers["content-type"] || "").split(";")[0].trim() ||
          mimeFromExt(path.extname(filenameFromUrl(sourceUrl)));

        if (!mimeAllowed(mimeType, aem.assets.allowedMimePrefixes)) {
          return {
            sourceUrl,
            damPath,
            localFile: "",
            status: "skipped",
            error: `MIME not allowed: ${mimeType}`,
            bytes: 0,
            mimeType,
            usedBy,
          };
        }

        let ext = extensionFromMime(mimeType);
        if (!ext) ext = path.extname(filenameFromUrl(sourceUrl)) || ".jpg";
        if (!damPath.toLowerCase().endsWith(ext.toLowerCase())) {
          const base = path.basename(damPath).replace(/\.[^./]+$/, "");
          damPath = `${damRootNorm}/${base}${ext}`;
        }

        await fs.writeFile(cacheFile, Buffer.from(res.data));
        const stat = await fs.stat(cacheFile);

        return {
          sourceUrl,
          damPath,
          localFile: cacheFile,
          status: "ok",
          bytes: stat.size,
          mimeType,
          usedBy,
          cached: false,
        };
      } catch (err) {
        return {
          sourceUrl,
          damPath,
          localFile: "",
          status: "failed",
          error: err.message || String(err),
          bytes: 0,
          mimeType: "",
          usedBy,
        };
      }
    }
  );

  /** @type {Map<string, string>} */
  const urlToDam = new Map();
  for (const e of manifestEntries) {
    if (e.status === "ok" && e.damPath) {
      urlToDam.set(urlKey(e.sourceUrl), e.damPath);
    }
  }

  const rewrittenItems = items.map((item) =>
    rewriteItemAssetRefs(item, urlToDam, sourceBase)
  );

  const nextBundle = { ...bundle, items: rewrittenItems };
  await fs.writeJson(aem.bundleFile, nextBundle, { spaces: 2 });

  const summary = {
    total: manifestEntries.length,
    ok: manifestEntries.filter((e) => e.status === "ok").length,
    failed: manifestEntries.filter((e) => e.status === "failed").length,
    skipped: manifestEntries.filter((e) => e.status === "skipped").length,
  };

  const manifest = {
    generatedAt: new Date().toISOString(),
    damRoot: aem.damRoot,
    entries: manifestEntries,
    summary,
  };

  await fs.ensureDir(path.dirname(aem.assetManifestFile));
  await fs.writeJson(aem.assetManifestFile, manifest, { spaces: 2 });

  console.log(
    `Asset migration: ${summary.ok} ok, ${summary.failed} failed, ${summary.skipped} skipped (of ${summary.total})`
  );
  console.log(`Wrote ${aem.assetManifestFile}`);
  console.log(`Updated bundle: ${aem.bundleFile}`);

  return manifest;
}

function mimeFromExt(ext) {
  const map = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".avif": "image/avif",
  };
  return map[String(ext || "").toLowerCase()] || "application/octet-stream";
}

async function main() {
  const config = await fs.readJson(CONFIG_PATH);
  const aem = loadAemConfig(config);

  if (!aem.assets.enabled) {
    console.log("aem.assets.enabled is false; skipping asset migration.");
    return;
  }

  await migrateAssets(aem, config);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}

module.exports = { migrateAssets };
