"use strict";

const mammoth = require("mammoth");
const { parseMetadataTable } = require("./parse-metadata-table");
const { enrichMeridianDocumentHtml } = require("./enrich-meridian-html");
const { assembleDocumentPost } = require("./assemble-wp-post");

/**
 * @param {Buffer} buffer
 * @param {number} index
 * @param {string} linkBaseUrl
 * @param {string} [sourceName] for error messages
 */
async function docxBufferToPost(buffer, index, linkBaseUrl, sourceName = "document.docx") {
  const { value: rawHtml } = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: [
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='heading 2'] => h2:fresh",
      ],
    }
  );

  const { meta, bodyHtml } = parseMetadataTable(rawHtml);
  const { articleBodyHtml, jumpLinks } = enrichMeridianDocumentHtml(bodyHtml);

  try {
    return assembleDocumentPost(meta, articleBodyHtml, jumpLinks, index, linkBaseUrl);
  } catch (e) {
    const err = /** @type {Error} */ (e);
    err.message = `${sourceName}: ${err.message}`;
    throw err;
  }
}

module.exports = { docxBufferToPost };
