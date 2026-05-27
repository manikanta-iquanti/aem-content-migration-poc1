"use strict";

const { deriveNumericId } = require("../scrape-pages");

function parseTags(tagsRaw) {
  return String(tagsRaw || "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildAuthorCard(authorName) {
  const name = String(authorName || "").trim();
  if (!name) {
    return { authorName: "", initials: "", dropInitial: "" };
  }
  const parts = name.split(/\s+/).filter(Boolean);
  let initials = "";
  if (parts.length >= 2) {
    const a = parts[0].charAt(0) || "";
    const b = parts[parts.length - 1].charAt(0) || "";
    initials = (a + b).toUpperCase();
  } else {
    initials = name.slice(0, 2).toUpperCase();
  }
  const dropInitial = name.charAt(0).toUpperCase();
  return { authorName: name, initials, dropInitial };
}

/**
 * @param {Record<string, string>} meta
 * @param {string} articleBodyHtml
 * @param {{ href: string, text: string }[]} jumpLinks
 * @param {number} index
 * @param {string} linkBaseUrl no trailing slash
 */
function assembleDocumentPost(meta, articleBodyHtml, jumpLinks, index, linkBaseUrl) {
  const slug = String(meta.slug || "").trim();
  const title = String(meta.title || "").trim();
  if (!slug) {
    throw new Error("Document metadata requires Slug.");
  }
  if (!title) {
    throw new Error("Document metadata requires Title.");
  }

  const base = String(linkBaseUrl || "").replace(/\/$/, "") || "http://localhost:8081";
  const link = `${base}/articles/${slug}`;

  const authorCard = buildAuthorCard(meta.author);
  const meridian = {
    eyebrow: meta.eyebrow || "",
    dek: meta.dek || "",
    authorName: meta.author || authorCard.authorName || "",
    publishDateText: meta.published || "",
    readTime: meta.readTime || "",
    image: meta.heroImageUrl || "",
    imageAlt: meta.heroImageAlt || "",
    jumpLinks,
    tags: parseTags(meta.tags),
    authorCard,
  };

  const excerpt = (meta.dek || "").trim().slice(0, 280);

  return {
    id: deriveNumericId(link, index),
    slug,
    status: "publish",
    date: new Date().toISOString(),
    title: { rendered: title },
    excerpt: { rendered: excerpt },
    content: { rendered: articleBodyHtml || "<p></p>" },
    link,
    sourceType: "document",
    scrapeLayout: "meridian-static",
    meridian,
  };
}

module.exports = { assembleDocumentPost, buildAuthorCard, parseTags };
