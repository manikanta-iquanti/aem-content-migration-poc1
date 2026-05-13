"use strict";

const { parse } = require("node-html-parser");

function isElement(node) {
  return node && node.nodeType === 1 && typeof node.tagName === "string";
}

function trimText(s) {
  return String(s || "")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function absUrl(pageUrl, src) {
  if (!src || typeof src !== "string") return "";
  const t = src.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  try {
    return new URL(t, pageUrl).toString();
  } catch {
    return t;
  }
}

function pickHeroHeader(root) {
  const headers = root.querySelectorAll("header");
  for (const h of headers) {
    const cls = h.getAttribute("class") || "";
    if (cls.includes("max-w-3xl") && cls.includes("text-center")) return h;
  }
  return null;
}

function pickHeroImage(root) {
  const wrap = root.querySelector("div.max-w-5xl");
  const img = wrap?.querySelector("img");
  if (img) return img;
  return root.querySelector("article img") || null;
}

function parseByline(text) {
  const t = trimText(text);
  const m = t.match(/^By\s+(.+?)\s+·\s+(.+?)\s+·\s+(.+)$/i);
  if (!m) return { authorName: "", publishDateText: "", readTime: "" };
  return { authorName: m[1].trim(), publishDateText: m[2].trim(), readTime: m[3].trim() };
}

function isTagsDiv(el) {
  if (!isElement(el) || el.tagName !== "DIV") return false;
  const cls = el.getAttribute("class") || "";
  return cls.includes("flex-wrap") && cls.includes("gap-2") && cls.includes("border-t");
}

function isAuthorDiv(el) {
  if (!isElement(el) || el.tagName !== "DIV") return false;
  const cls = el.getAttribute("class") || "";
  return cls.includes("items-center") && cls.includes("gap-5") && cls.includes("p-6");
}

function extractTagsFromDiv(div) {
  const spans = div.querySelectorAll("span");
  const out = [];
  for (const s of spans) {
    const txt = trimText(s.text);
    if (txt) out.push(txt);
  }
  return out;
}

function extractAuthorFromDiv(div) {
  const initialsEl = div.querySelector("div.rounded-full");
  const nameEl = div.querySelector("p.font-display.text-xl");
  const initials = trimText(initialsEl?.text || "");
  const authorName = trimText(nameEl?.text || "");
  let dropInitial = "";
  if (authorName) dropInitial = authorName.trim().charAt(0).toUpperCase();
  return { authorName, initials, dropInitial };
}

function extractJumpLinks(root) {
  const nav = root.querySelector('nav[aria-label="In this article"]');
  if (!nav) return [];
  const links = nav.querySelectorAll("a[href]");
  const out = [];
  for (const a of links) {
    const href = (a.getAttribute("href") || "").trim();
    const text = trimText(a.text);
    if (href && text) out.push({ href, text });
  }
  return out;
}

/**
 * Parses the Meridian static article HTML (same design as AEM meridian components).
 * @param {string} html
 * @param {string} pageUrl
 * @returns {{
 *   meridian: object,
 *   articleBodyHtml: string,
 *   title: string,
 *   excerpt: string,
 * }}
 */
function extractMeridianStaticPage(html, pageUrl) {
  const root = parse(html, { script: true, style: true });

  const heroHeader = pickHeroHeader(root);
  let eyebrow = "";
  let title = "";
  let dek = "";
  let authorName = "";
  let publishDateText = "";
  let readTime = "";

  if (heroHeader) {
    const ps = heroHeader.querySelectorAll("p");
    const h1 = heroHeader.querySelector("h1");
    title = trimText(h1?.text || "");
    for (const p of ps) {
      const cls = p.getAttribute("class") || "";
      const txt = trimText(p.text);
      if (cls.includes("uppercase") && cls.includes("tracking") && txt.includes("·")) {
        eyebrow = txt;
      } else if (cls.includes("text-lg") && cls.includes("italic")) {
        dek = txt;
      } else if (cls.includes("mt-8") && txt.toLowerCase().startsWith("by ")) {
        const parsed = parseByline(txt);
        authorName = parsed.authorName;
        publishDateText = parsed.publishDateText;
        readTime = parsed.readTime;
      }
    }
  }

  if (!title) {
    title =
      trimText(root.querySelector("title")?.text || "") ||
      trimText(root.querySelector("h1")?.text || "");
  }

  const heroImg = pickHeroImage(root);
  const image = absUrl(pageUrl, heroImg?.getAttribute("src") || "");
  const imageAlt = trimText(heroImg?.getAttribute("alt") || "");

  const article = root.querySelector("article.prose-article") || root.querySelector("article");
  let articleBodyHtml = "<p></p>";
  let tags = [];
  let authorCard = { authorName: "", initials: "", dropInitial: "" };

  if (article) {
    const bodyParts = [];
    for (const child of article.childNodes) {
      if (!isElement(child)) continue;
      if (isTagsDiv(child)) {
        tags = extractTagsFromDiv(child);
        continue;
      }
      if (isAuthorDiv(child)) {
        authorCard = extractAuthorFromDiv(child);
        continue;
      }
      bodyParts.push(child.outerHTML);
    }
    articleBodyHtml = bodyParts.join("\n").trim() || "<p></p>";
    if (!authorName && authorCard.authorName) authorName = authorCard.authorName;
  }

  const jumpLinks = extractJumpLinks(root);

  const metaDesc =
    root.querySelector('meta[name="description"]')?.getAttribute("content") || "";
  const excerpt = trimText(metaDesc) || dek;
  const publishedTime =
    root.querySelector('meta[property="article:published_time"]')?.getAttribute(
      "content"
    ) || "";

  const meridian = {
    eyebrow,
    dek,
    authorName,
    publishDateText,
    readTime,
    image,
    imageAlt,
    jumpLinks,
    tags,
    authorCard,
  };

  return {
    meridian,
    articleBodyHtml,
    title,
    excerpt,
    publishedTime,
  };
}

module.exports = { extractMeridianStaticPage };
