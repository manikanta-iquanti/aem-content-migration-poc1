"use strict";

const { parse } = require("node-html-parser");

function stripTagsToText(html) {
  return String(html || "")
    .replaceAll(/<[^>]+>/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function slugifyHeading(text) {
  let slug = stripTagsToText(text)
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-");
  slug = slug.replace(/^-+/, "").replace(/-+$/, "");
  return slug || "section";
}

function escapeXmlish(s) {
  return String(s)
    .replaceAll(/&/g, "&amp;")
    .replaceAll(/</g, "&lt;")
    .replaceAll(/>/g, "&gt;");
}

const CALLOUT_PARAGRAPH =
  /<p>\s*CALLOUT:([^|]+)\|([^<]*?)<\/p>/gi;

/**
 * Ensures each h2 has an id, derives jump links, converts CALLOUT:eyebrow|body paragraphs
 * into meridian-style `<aside>` blocks understood by {@link wpHtmlToAemBlocks}.
 * @param {string} bodyHtml
 * @returns {{ articleBodyHtml: string, jumpLinks: { href: string, text: string }[] }}
 */
function enrichMeridianDocumentHtml(bodyHtml) {
  let html = String(bodyHtml || "");
  html = html.replace(CALLOUT_PARAGRAPH, (_, eyeb, body) => {
    const eyebEsc = escapeXmlish(eyeb.trim());
    const bodyEsc = escapeXmlish(body.trim());
    return `<aside class="my-10 border-l-4 border-accent bg-accent/5 px-6 py-5 font-sans text-base"><p class="text-[11px] uppercase tracking-[0.25em] text-accent mb-2">${eyebEsc}</p><p class="text-foreground leading-relaxed m-0">${bodyEsc}</p></aside>`;
  });

  const wrapped = `<div data-enrich-root="1">${html}</div>`;
  const root = parse(wrapped);
  const wrap = root.querySelector("[data-enrich-root]");
  if (!wrap) {
    return { articleBodyHtml: html.trim() || "<p></p>", jumpLinks: [] };
  }

  const jumpLinks = [];
  const h2s = wrap.querySelectorAll("h2");
  const usedIds = new Set();
  for (const h2 of h2s) {
    let id = (h2.getAttribute("id") || "").trim();
    if (!id) id = slugifyHeading(h2.innerHTML || h2.text);
    const base = id;
    let n = 0;
    while (usedIds.has(id)) {
      n += 1;
      id = `${base}-${n}`;
    }
    usedIds.add(id);
    h2.setAttribute("id", id);
    const text = stripTagsToText(h2.innerHTML || h2.text);
    if (text) jumpLinks.push({ href: `#${id}`, text });
  }

  return {
    articleBodyHtml: wrap.innerHTML.trim() || "<p></p>",
    jumpLinks,
  };
}

module.exports = { enrichMeridianDocumentHtml, slugifyHeading };
