"use strict";

const { parse } = require("node-html-parser");
const { labelToCanonicalKey } = require("./constants");

/**
 * Parses the first HTML `<table>` as key/value metadata (Field | Value columns).
 * Removes that table from the document fragment.
 * @param {string} html
 * @returns {{ meta: Record<string, string>, bodyHtml: string }}
 */
function parseMetadataTable(html) {
  const wrapped = `<div data-doc-import-root="1">${html}</div>`;
  const root = parse(wrapped);
  const wrap = root.querySelector("[data-doc-import-root]");
  if (!wrap) {
    return { meta: {}, bodyHtml: String(html || "").trim() };
  }

  const table = wrap.querySelector("table");
  if (!table) {
    return { meta: {}, bodyHtml: wrap.innerHTML.trim() };
  }

  const meta = {};
  const rows = table.querySelectorAll("tr");
  for (const tr of rows) {
    const cells = tr.querySelectorAll("th, td");
    if (cells.length < 2) continue;
    const label = cells[0].text.trim();
    const value = cells[1].text.trim();
    const key = labelToCanonicalKey(label);
    if (key && value) meta[key] = value;
  }

  table.remove();
  return { meta, bodyHtml: wrap.innerHTML.trim() };
}

module.exports = { parseMetadataTable };
