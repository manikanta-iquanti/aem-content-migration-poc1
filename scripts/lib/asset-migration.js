"use strict";

const crypto = require("crypto");
const { URL } = require("url");
const { parse } = require("node-html-parser");

/**
 * @param {string} baseUrl
 * @param {string} src
 */
function absUrl(baseUrl, src) {
  if (!src || typeof src !== "string") return "";
  const t = src.trim();
  if (!t || t.startsWith("data:")) return "";
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("//")) return `https:${t}`;
  try {
    const base = String(baseUrl || "").trim() || "http://localhost/";
    return new URL(t, base.endsWith("/") ? base : `${base}/`).href;
  } catch {
    return "";
  }
}

/**
 * @param {string} url
 */
function urlKey(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.href;
  } catch {
    return String(url).trim();
  }
}

/**
 * @param {string} url
 */
function filenameFromUrl(url) {
  try {
    const u = new URL(url);
    const base = pathBasename(u.pathname);
    if (base && base !== "/") return sanitizeFilename(base);
  } catch {
    /* ignore */
  }
  return "asset.bin";
}

function pathBasename(p) {
  const parts = String(p || "").split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

/**
 * @param {string} name
 */
function sanitizeFilename(name) {
  let s = String(name)
    .replace(/[?#].*$/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!s) s = "asset.bin";
  if (!/\.[a-z0-9]{2,5}$/i.test(s)) s = `${s}.jpg`;
  return s.slice(0, 120);
}

/**
 * @param {string} url
 */
function hashUrl(url) {
  return crypto.createHash("sha256").update(urlKey(url)).digest("hex").slice(0, 12);
}

/**
 * DAM path: flat under damRoot (e.g. /content/dam/site/wp-migration/santorini.jpg).
 * @param {string} damRoot
 * @param {string} sourceUrl
 * @param {Set<string>} [usedBasenames] tracks filenames already assigned this run
 */
function damPathForUrl(damRoot, sourceUrl, usedBasenames) {
  const root = damRoot.replace(/\/+$/, "");
  let file = filenameFromUrl(sourceUrl);
  if (usedBasenames && usedBasenames.has(file.toLowerCase())) {
    file = `${hashUrl(sourceUrl)}-${file}`;
  }
  if (usedBasenames) {
    usedBasenames.add(file.toLowerCase());
  }
  return `${root}/${file}`;
}

/**
 * @param {object} item Bundle item
 * @param {string} sourceBaseUrl
 * @returns {{ url: string, slug: string }[]}
 */
function collectAssetUrlsFromItem(item, sourceBaseUrl) {
  const slug = String(item.slug || item.sourceId || "post");
  const seen = new Set();
  const out = [];

  function add(raw) {
    const absolute = absUrl(sourceBaseUrl, raw);
    if (!absolute) return;
    const key = urlKey(absolute);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ url: absolute, slug });
  }

  if (item.meridian && typeof item.meridian === "object" && item.meridian.image) {
    add(item.meridian.image);
  }

  const blocks = Array.isArray(item.aemBlocks) ? item.aemBlocks : [];
  for (const block of blocks) {
    if (block && block.type === "image" && block.src) {
      add(block.src);
    }
  }

  const html = item.content || item.contentHtml || "";
  if (html && typeof html === "string") {
    try {
      const root = parse(html, { script: true, style: true });
      for (const img of root.querySelectorAll("img")) {
        const src = img.getAttribute("src");
        if (src) add(src);
      }
    } catch {
      const re = /<img[^>]+src=["']([^"']+)["']/gi;
      let m;
      while ((m = re.exec(html)) !== null) {
        add(m[1]);
      }
    }
  }

  return out;
}

/**
 * @param {object[]} items
 * @param {string} sourceBaseUrl
 */
function collectAllAssetUrls(items, sourceBaseUrl) {
  /** @type {Map<string, { url: string, usedBy: Set<string> }>} */
  const map = new Map();
  for (const item of items) {
    const slug = String(item.slug || item.sourceId || "post");
    for (const { url } of collectAssetUrlsFromItem(item, sourceBaseUrl)) {
      const key = urlKey(url);
      if (!map.has(key)) {
        map.set(key, { url, usedBy: new Set() });
      }
      map.get(key).usedBy.add(slug);
    }
  }
  return map;
}

/**
 * @param {object} item
 * @param {Map<string, string>} urlToDam
 * @param {string} sourceBaseUrl
 */
function rewriteItemAssetRefs(item, urlToDam, sourceBaseUrl) {
  const next = { ...item };

  if (next.meridian && typeof next.meridian === "object") {
    const m = { ...next.meridian };
    if (m.image) {
      const abs = absUrl(sourceBaseUrl, m.image);
      const dam = urlToDam.get(urlKey(abs));
      if (dam) {
        m.originalImage = m.image;
        m.image = dam;
      }
    }
    next.meridian = m;
  }

  if (Array.isArray(next.aemBlocks)) {
    next.aemBlocks = next.aemBlocks.map((block) => {
      if (!block || block.type !== "image" || !block.src) return block;
      const abs = absUrl(sourceBaseUrl, block.src);
      const dam = urlToDam.get(urlKey(abs));
      if (!dam) return block;
      return {
        ...block,
        originalSrc: block.src,
        src: dam,
      };
    });
  }

  const htmlKey = next.content != null ? "content" : "contentHtml";
  const html = next[htmlKey];
  if (typeof html === "string" && html.length > 0) {
    let updated = html;
    for (const [key, dam] of urlToDam) {
      if (updated.includes(key)) {
        updated = updated.split(key).join(dam);
      }
      try {
        const u = new URL(key);
        const rel = u.pathname + u.search;
        if (rel && updated.includes(rel)) {
          updated = updated.split(rel).join(dam);
        }
      } catch {
        /* ignore */
      }
    }
    next[htmlKey] = updated;
  }

  return next;
}

/**
 * @param {string} mimeType
 * @param {string[]} allowedPrefixes
 */
function mimeAllowed(mimeType, allowedPrefixes) {
  const m = String(mimeType || "").toLowerCase();
  if (!m) return true;
  return allowedPrefixes.some((p) => m.startsWith(String(p).toLowerCase()));
}

/**
 * @param {string} contentType
 */
function extensionFromMime(contentType) {
  const m = String(contentType || "").split(";")[0].trim().toLowerCase();
  const map = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "image/avif": ".avif",
  };
  return map[m] || "";
}

module.exports = {
  absUrl,
  urlKey,
  filenameFromUrl,
  hashUrl,
  damPathForUrl,
  collectAssetUrlsFromItem,
  collectAllAssetUrls,
  rewriteItemAssetRefs,
  mimeAllowed,
  extensionFromMime,
};
