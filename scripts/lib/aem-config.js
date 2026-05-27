"use strict";

const path = require("path");

const ROOT = path.join(__dirname, "..", "..");

/**
 * @param {object} config Full config.json object
 */
function loadAemConfig(config) {
  const defaults = {
    blueprintPath: path.join(
      ROOT,
      "data",
      "aem-node-context",
      "jcr_root",
      "content",
      "my-aem-site53",
      "us",
      "en",
      "article",
      ".content.xml"
    ),
    parentJcrPath: "/content/my-aem-site53/us/en",
    damRoot: "/content/dam/my-aem-site53/wp-migration",
    packageGroup: "wp_migration",
    packageName: "wp-to-aem-pages",
    packageVersion: "1.0.0",
    bundleFile: path.join(ROOT, "data", "transformed", "migration-bundle.json"),
    assetManifestFile: path.join(
      ROOT,
      "data",
      "transformed",
      "asset-manifest.json"
    ),
    outputZip: path.join(ROOT, "data", "transformed", "wp-to-aem-migration.zip"),
    authorUrl: "http://localhost:8080",
    contextDir: path.join(ROOT, "data", "aem-node-context"),
    assets: {
      enabled: true,
      localCacheDir: path.join(ROOT, "data", "assets", "cache"),
      maxConcurrentDownloads: 5,
      allowedMimePrefixes: ["image/"],
    },
  };
  const aem = config.aem && typeof config.aem === "object" ? config.aem : {};
  const assetsIn =
    aem.assets && typeof aem.assets === "object" ? aem.assets : {};

  function resolvePath(p, fallback) {
    if (!p) return fallback;
    return path.isAbsolute(p) ? p : path.join(ROOT, p);
  }

  return {
    blueprintPath: resolvePath(aem.blueprintPath, defaults.blueprintPath),
    parentJcrPath: aem.parentJcrPath ?? defaults.parentJcrPath,
    damRoot: normalizeDamRoot(aem.damRoot ?? defaults.damRoot),
    packageGroup: aem.packageGroup ?? defaults.packageGroup,
    packageName: aem.packageName ?? defaults.packageName,
    packageVersion: aem.packageVersion ?? defaults.packageVersion,
    bundleFile: resolvePath(aem.bundleFile, defaults.bundleFile),
    assetManifestFile: resolvePath(
      aem.assetManifestFile,
      defaults.assetManifestFile
    ),
    outputZip: resolvePath(aem.outputZip, defaults.outputZip),
    authorUrl: aem.authorUrl ?? defaults.authorUrl,
    contextDir: resolvePath(aem.contextDir, defaults.contextDir),
    bodyRenderer: aem.bodyRenderer === "meridian" ? "meridian" : "legacy",
    assets: {
      enabled: assetsIn.enabled !== false,
      localCacheDir: resolvePath(
        assetsIn.localCacheDir,
        defaults.assets.localCacheDir
      ),
      maxConcurrentDownloads:
        Number(assetsIn.maxConcurrentDownloads) > 0
          ? Number(assetsIn.maxConcurrentDownloads)
          : defaults.assets.maxConcurrentDownloads,
      allowedMimePrefixes: Array.isArray(assetsIn.allowedMimePrefixes)
        ? assetsIn.allowedMimePrefixes
        : defaults.assets.allowedMimePrefixes,
    },
  };
}

function normalizeDamRoot(damRoot) {
  let r = String(damRoot || "/content/dam/wp-migration").trim();
  if (!r.startsWith("/")) r = `/${r}`;
  return r.replace(/\/+$/, "");
}

module.exports = { loadAemConfig, normalizeDamRoot, ROOT };
