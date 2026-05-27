"use strict";

// pdfjs-dist 4.x uses Promise.withResolvers (Node 22+). Keep document extract working on Node 18/20.
if (typeof Promise.withResolvers !== "function") {
  Promise.withResolvers = function withResolvers() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

const { labelToCanonicalKey } = require("./constants");
const { enrichMeridianDocumentHtml } = require("./enrich-meridian-html");
const { assembleDocumentPost } = require("./assemble-wp-post");
const { splitMergedHeadingLine } = require("./split-pdf-heading-lines");

function escapeHtml(s) {
  return String(s)
    .replaceAll(/&/g, "&amp;")
    .replaceAll(/</g, "&lt;")
    .replaceAll(/>/g, "&gt;")
    .replaceAll(/"/g, "&quot;");
}

/**
 * pdf.js often returns the whole page as one line. Insert newlines before known
 * field markers and lightweight body markers so header / body parsing works.
 * @param {string} text
 * @returns {string}
 */
function reflowPdfTextForParsing(text) {
  let t = String(text || "").replace(/\s+/g, " ").trim();
  const fieldMarks = [
    "Slug:",
    "Title:",
    "Eyebrow:",
    "Dek:",
    "Author:",
    "Published:",
    "Read time:",
    "Hero image URL:",
    "Hero image alt:",
    "Tags:",
  ];
  for (const m of fieldMarks) {
    const esc = m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp(`\\s+(?=${esc})`, "gi"), "\n");
  }
  t = t.replace(/\s+---\s+/g, "\n---\n");
  t = t.replace(/\s+##\s+/g, "\n## ");
  t = t.replace(/\s+- /g, "\n- ");
  t = t.replace(/\s+> /g, "\n> ");
  t = t.replace(/\s+CALLOUT:/gi, "\nCALLOUT:");
  return t;
}

/**
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function extractPdfText(buffer) {
  const { getDocument } = await import("pdfjs-dist");
  const data =
    buffer instanceof Uint8Array && !Buffer.isBuffer(buffer)
      ? buffer
      : new Uint8Array(buffer);
  const pdf = await getDocument({ data }).promise;
  let fullText = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    for (const item of tc.items) {
      if (!("str" in item) || !item.str) continue;
      fullText += item.str;
      fullText += item.hasEOL ? "\n" : " ";
    }
    if (p < pdf.numPages) fullText += "\n";
  }
  return fullText.trim();
}

/**
 * Header lines may wrap (PDF text extraction); merge continuations into the last key.
 * @param {string[]} lines
 * @returns {{ meta: Record<string, string>, bodyLines: string[] }}
 */
function parsePdfHeaderSmart(lines) {
  const sepRe = /^---$|^===$/;
  let sepIdx = lines.findIndex((l) => sepRe.test(l.trim()));
  let bodyFromExplicitSep = false;
  if (sepIdx >= 0) {
    bodyFromExplicitSep = true;
  } else {
    sepIdx = lines.findIndex((l) => l.trim().startsWith("## "));
  }
  if (sepIdx < 0) sepIdx = 0;

  const headerPart = lines.slice(0, sepIdx);
  const bodyLines = bodyFromExplicitSep
    ? lines.slice(sepIdx + 1)
    : lines.slice(sepIdx);

  const meta = {};
  /** @type {string|null} */
  let currentKey = null;
  let currentVal = "";

  function flush() {
    if (currentKey && currentVal.trim()) meta[currentKey] = currentVal.trim();
    currentKey = null;
    currentVal = "";
  }

  for (const raw of headerPart) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (m) {
      flush();
      const ck = labelToCanonicalKey(m[1].trim());
      if (ck) {
        currentKey = ck;
        currentVal = m[2].trim();
      } else {
        currentKey = null;
        currentVal = "";
      }
    } else if (currentKey) {
      currentVal += " " + line;
    }
  }
  flush();
  return { meta, bodyLines };
}

/**
 * @param {string[]} lines
 * @returns {string} HTML fragment
 */
function pdfPlainLinesToHtml(lines) {
  const out = [];
  let inUl = false;
  let inOl = false;

  function closeLists() {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  }

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const t = raw.trimEnd();
    const trimmed = t.trim();

    if (trimmed === "") {
      closeLists();
      i += 1;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      closeLists();
      out.push(
        `<blockquote>${escapeHtml(trimmed.slice(2).trim())}</blockquote>`
      );
      i += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      closeLists();
      out.push(`<h2>${escapeHtml(trimmed.slice(3).trim())}</h2>`);
      i += 1;
      continue;
    }

    if (trimmed.startsWith("- ")) {
      if (!inUl) {
        closeLists();
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${escapeHtml(trimmed.slice(2).trim())}</li>`);
      i += 1;
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      if (!inOl) {
        closeLists();
        out.push("<ol>");
        inOl = true;
      }
      out.push(
        `<li>${escapeHtml(trimmed.replace(/^\d+\.\s+/, "").trim())}</li>`
      );
      i += 1;
      continue;
    }

    closeLists();
    out.push(`<p>${escapeHtml(trimmed)}</p>`);
    i += 1;
  }

  closeLists();
  return out.join("\n");
}

/**
 * @param {Buffer} buffer
 * @param {number} index
 * @param {string} linkBaseUrl
 * @param {string} [sourceName]
 */
async function pdfBufferToPost(buffer, index, linkBaseUrl, sourceName = "document.pdf") {
  let text;
  try {
    text = await extractPdfText(buffer);
  } catch (e) {
    const err = /** @type {Error} */ (e);
    throw new Error(
      `${sourceName}: Failed to read PDF (${err.message || err}).`
    );
  }

  text = reflowPdfTextForParsing(text);
  text = String(text || "").trim();
  if (text.length < 40) {
    throw new Error(
      `${sourceName}: PDF has almost no extractable text (image-only / scanned?). Save as text-based PDF or use Word.`
    );
  }

  const lines = text
    .split(/\r?\n/)
    .flatMap((ln) => splitMergedHeadingLine(ln));
  const { meta, bodyLines } = parsePdfHeaderSmart(lines);
  const bodyHtml = pdfPlainLinesToHtml(bodyLines);
  const { articleBodyHtml, jumpLinks } = enrichMeridianDocumentHtml(bodyHtml);

  try {
    return assembleDocumentPost(meta, articleBodyHtml, jumpLinks, index, linkBaseUrl);
  } catch (e) {
    const err = /** @type {Error} */ (e);
    err.message = `${sourceName}: ${err.message}`;
    throw err;
  }
}

module.exports = {
  pdfBufferToPost,
  parsePdfHeaderSmart,
  pdfPlainLinesToHtml,
  extractPdfText,
  reflowPdfTextForParsing,
};
