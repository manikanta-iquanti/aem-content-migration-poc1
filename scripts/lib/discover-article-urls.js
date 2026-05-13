"use strict";

const axios = require("axios");
const { parse } = require("node-html-parser");

const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_USER_AGENT =
  "wp-migration-ai/1.0 (+https://local.migration.tool)";

/**
 * Default: one segment after /articles/ (Next [slug] style). Listing /articles is excluded.
 * @param {string} pathname
 */
function defaultPathnameMatch(pathname) {
  const p = (pathname || "").replace(/\/+$/, "") || "/";
  if (p === "/articles") return false;
  return /^\/articles\/[^/]+$/i.test(p);
}

/**
 * @param {string} indexUrl  e.g. http://localhost:8081/articles
 * @param {object} [options]
 * @param {number} [options.timeoutMs]
 * @param {string} [options.userAgent]
 * @param {function(string): boolean} [options.pathnameMatch]
 * @param {number} [options.maxUrls]  safety cap
 * @returns {Promise<string[]>}  absolute URLs, stable order, deduped
 */
async function discoverArticleUrlsFromIndex(indexUrl, options = {}) {
  const trimmed = String(indexUrl || "").trim();
  if (!trimmed) return [];

  const timeoutMs = Number(options.timeoutMs) || DEFAULT_TIMEOUT_MS;
  const userAgent = options.userAgent || DEFAULT_USER_AGENT;
  const maxUrls = Number(options.maxUrls) || 500;
  const pathnameMatch =
    typeof options.pathnameMatch === "function"
      ? options.pathnameMatch
      : defaultPathnameMatch;

  const res = await axios.get(trimmed, {
    timeout: timeoutMs,
    headers: { "User-Agent": userAgent },
  });

  const contentType = String(res.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("text/html")) {
    throw new Error(
      `discoverIndexUrl: expected HTML from ${trimmed}, got "${contentType || "unknown"}".`
    );
  }

  const origin = new URL(trimmed).origin;
  const seen = new Set();
  const out = [];

  const root = parse(res.data, { script: true, style: true });
  const candidates = root.querySelectorAll("[href]");
  for (const el of candidates) {
    const raw = (el.getAttribute("href") || "").trim();
    if (!raw || raw.startsWith("#") || raw.startsWith("javascript:")) continue;
    if (raw.startsWith("mailto:") || raw.startsWith("tel:")) continue;

    let abs;
    try {
      abs = new URL(raw, trimmed).href;
    } catch {
      continue;
    }

    let pathname;
    try {
      const u = new URL(abs);
      if (u.origin !== origin) continue;
      pathname = u.pathname || "/";
      if (pathname.length > 1 && pathname.endsWith("/")) {
        pathname = pathname.slice(0, -1);
      }
    } catch {
      continue;
    }

    if (!pathnameMatch(pathname)) continue;

    let normalized;
    try {
      const u = new URL(abs);
      u.hash = "";
      u.pathname = pathname;
      normalized = u.toString();
    } catch {
      normalized = abs;
    }

    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= maxUrls) break;
  }

  return out;
}

module.exports = { discoverArticleUrlsFromIndex, defaultPathnameMatch };
