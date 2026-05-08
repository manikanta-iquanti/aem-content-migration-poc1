"use strict";

const axios = require("axios");
const { parse } = require("node-html-parser");

const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_USER_AGENT =
  "wp-migration-ai/1.0 (+https://local.migration.tool)";

function normalizeBaseUrl(baseUrl) {
  if (!baseUrl || typeof baseUrl !== "string") return "";
  return baseUrl.replace(/\/$/, "");
}

function toAbsoluteUrl(inputUrl, baseUrl) {
  if (!inputUrl || typeof inputUrl !== "string") return "";
  const trimmed = inputUrl.trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (!baseUrl) {
    throw new Error(
      `Relative URL "${trimmed}" requires source.baseUrl (or extract.scrape.baseUrl).`
    );
  }
  return new URL(trimmed, `${normalizeBaseUrl(baseUrl)}/`).toString();
}

function textOnly(html) {
  return String(html || "")
    .replaceAll(/<[^>]+>/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function getMeta(root, attrName, attrValue) {
  return (
    root.querySelector?.(`meta[${attrName}="${attrValue}"]`)?.getAttribute(
      "content"
    ) || ""
  );
}

function deriveSlug(pageUrl, index) {
  try {
    const u = new URL(pageUrl);
    const parts = u.pathname.split("/").filter(Boolean);
    const base = parts.at(-1) || "home";
    return (
      base.toLowerCase().replaceAll(/[^a-z0-9-]+/g, "-") || `page-${index + 1}`
    );
  } catch {
    return `page-${index + 1}`;
  }
}

function deriveNumericId(pageUrl, index) {
  let hash = 0;
  const seed = `${pageUrl}|${index}`;
  for (let i = 0; i < seed.length; i++) {
    const codePoint = seed.codePointAt(i) || 0;
    hash = Math.trunc(hash * 31 + codePoint);
  }
  return Math.abs(hash) + 1;
}

function selectContentRoot(root, contentSelector) {
  if (contentSelector) {
    const selected = root.querySelector(contentSelector);
    if (selected) return selected;
  }

  const fallbacks = [
    "article",
    "main",
    "[role='main']",
    ".entry-content",
    ".post-content",
    "#content",
    "body",
  ];

  for (const selector of fallbacks) {
    const selected = root.querySelector(selector);
    if (selected) return selected;
  }

  return root;
}

function cleanupContent(node) {
  const junkSelectors = [
    "script",
    "style",
    "noscript",
    "template",
    "iframe",
    "svg",
    "nav",
    "footer",
  ];

  for (const selector of junkSelectors) {
    const nodes = node.querySelectorAll?.(selector) || [];
    nodes.forEach((n) => n.remove());
  }
}

function extractPageData(html, pageUrl, index, options = {}) {
  const root = parse(html, { script: true, style: true });
  const contentNode = selectContentRoot(root, options.contentSelector);
  cleanupContent(contentNode);

  const contentHtml = (contentNode.innerHTML || "").trim();
  const ogTitle = getMeta(root, "property", "og:title");
  const title =
    root.querySelector("title")?.text?.trim() ||
    root.querySelector("h1")?.text?.trim() ||
    ogTitle ||
    deriveSlug(pageUrl, index);

  const metaDescription =
    getMeta(root, "name", "description") ||
    getMeta(root, "property", "og:description");
  const excerpt = metaDescription || textOnly(contentHtml).slice(0, 280);

  const publishedTime = getMeta(root, "property", "article:published_time");
  const date = publishedTime || new Date().toISOString();

  return {
    id: deriveNumericId(pageUrl, index),
    slug: deriveSlug(pageUrl, index),
    status: "publish",
    date,
    title: { rendered: title },
    excerpt: { rendered: excerpt },
    content: { rendered: contentHtml || "<p></p>" },
    link: pageUrl,
    sourceType: "scrape",
  };
}

async function scrapePagesToWpShape(config) {
  const scrapeCfg = config?.extract?.scrape || {};
  const sourceBase = scrapeCfg.baseUrl || config?.source?.baseUrl || "";
  const urls = Array.isArray(scrapeCfg.urls) ? scrapeCfg.urls : [];
  const timeoutMs = Number(scrapeCfg.timeoutMs) || DEFAULT_TIMEOUT_MS;
  const userAgent = scrapeCfg.userAgent || DEFAULT_USER_AGENT;

  if (urls.length === 0) {
    throw new Error(
      "extract.scrape.urls is empty. Add one or more page URLs to scrape."
    );
  }

  const output = [];
  for (let i = 0; i < urls.length; i++) {
    const absoluteUrl = toAbsoluteUrl(urls[i], sourceBase);
    const res = await axios.get(absoluteUrl, {
      timeout: timeoutMs,
      headers: { "User-Agent": userAgent },
    });

    const contentType = String(res.headers["content-type"] || "").toLowerCase();
    if (!contentType.includes("text/html")) {
      throw new Error(
        `Expected HTML from ${absoluteUrl}, got content-type "${contentType || "unknown"}".`
      );
    }

    output.push(
      extractPageData(res.data, absoluteUrl, i, {
        contentSelector: scrapeCfg.contentSelector || "",
      })
    );
  }

  return output;
}

module.exports = { scrapePagesToWpShape };
