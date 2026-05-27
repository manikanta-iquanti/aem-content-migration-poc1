"use strict";

/**
 * Import Meridian-shaped articles from `.docx` / `.pdf` files into the same JSON
 * shape as {@link scrapePagesToWpShape} with `layout: "meridian-static"`.
 *
 * @see ./constants.js for authoring contract (metadata table, PDF header, CALLOUT).
 */

const path = require("node:path");
const fs = require("fs-extra");
const { glob } = require("glob");
const { docxBufferToPost } = require("./docx-to-post");
const { pdfBufferToPost } = require("./pdf-to-post");

/**
 * @param {object} config full config.json object
 * @param {{ globsOverride?: string[], extraFiles?: string[], linkBaseUrl?: string }} [options]
 * @returns {Promise<object[]>} raw posts compatible with data/raw/posts.json
 */
async function importDocumentsToWpShape(config, options = {}) {
  const ROOT = path.join(__dirname, "..", "..", "..");
  const docCfg = config?.extract?.documents || {};

  const globs =
    Array.isArray(options.globsOverride) && options.globsOverride.length
      ? options.globsOverride
      : Array.isArray(docCfg.globs) && docCfg.globs.length
        ? docCfg.globs
        : ["data/sample-documents/**/*.docx", "data/sample-documents/**/*.pdf"];

  /** @type {string[]} */
  let files = [];
  for (const pattern of globs) {
    const matches = await glob(pattern, { cwd: ROOT, nodir: true, absolute: true });
    files.push(...matches);
  }
  const extra = Array.isArray(options.extraFiles) ? options.extraFiles : [];
  for (const f of extra) {
    const abs = path.isAbsolute(f) ? f : path.join(ROOT, f);
    if (await fs.pathExists(abs)) files.push(abs);
  }

  files = [...new Set(files)].sort();

  if (files.length === 0) {
    throw new Error(
      "No document files matched. Set extract.documents.globs in config.json or pass --file / --glob to scripts/extract-documents.js."
    );
  }

  const linkBaseUrl = String(
    options.linkBaseUrl ||
      docCfg.linkBaseUrl ||
      config?.source?.baseUrl ||
      "http://localhost:8081"
  ).replace(/\/$/, "");

  const out = [];
  let index = 0;
  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    const buf = await fs.readFile(filePath);
    const base = path.basename(filePath);

    if (ext === ".docx") {
      out.push(await docxBufferToPost(buf, index, linkBaseUrl, base));
      index += 1;
    } else if (ext === ".pdf") {
      out.push(await pdfBufferToPost(buf, index, linkBaseUrl, base));
      index += 1;
    } else {
      console.warn(`Skipping unsupported extension (${ext}): ${filePath}`);
    }
  }

  if (out.length === 0) {
    throw new Error("No supported documents (.docx / .pdf) were processed.");
  }

  return out;
}

module.exports = { importDocumentsToWpShape };
