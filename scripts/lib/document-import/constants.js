"use strict";

/**
 * Document import authoring contract (Word + PDF).
 *
 * ## Word (.docx)
 * Start the document with a two-column table: **Field** | **Value**.
 * First column labels are matched case-insensitively (spaces / punctuation ignored).
 * Everything after that table is article body HTML (via Mammoth).
 *
 * Supported field labels → internal keys:
 * - Slug → slug (required)
 * - Title → title (required)
 * - Eyebrow → meridian hero eyebrow
 * - Dek → meridian dek / excerpt fallback
 * - Author → meridian authorName + authorCard
 * - Published / Publish date → meridian.publishDateText (display string)
 * - Read time → meridian.readTime
 * - Hero image URL / Hero image → meridian.image
 * - Hero image alt → meridian.imageAlt
 * - Tags → comma- or semicolon-separated meridian.tags
 *
 * Body: use Word **Heading 2** for section titles. Lists and block quotes map to
 * `<ul>` / `<ol>` / `<blockquote>`. Optional callout: a paragraph whose text is
 * `CALLOUT:Eyebrow label|Body text` (pipe separates eyebrow from body).
 *
 * ## PDF (.pdf)
 * Linear, copy-pasteable text only (scanned PDFs are rejected).
 * Header block: lines `Key: value` until a line that is exactly `---` or `===`.
 * Same logical keys as Word (Slug, Title, Eyebrow, …).
 * Body: paragraphs separated by blank lines; lines starting with `## ` become
 * level-2 headings; lines starting with `- ` become bullet list items (runs until
 * a non-list line); lines matching `^\d+\.\s` start ordered lists.
 *
 * **Reflow:** Many PDFs yield one long text line per page; the importer inserts
 * newlines before known field labels (`Slug:`, `Title:`, …) and body markers (`##`, `-`, `CALLOUT:`)
 * so the same header convention still parses.
 */

/** Normalize a table row label for lookup. */
function normalizeLabel(s) {
  return String(s || "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "")
    .trim();
}

/** Map normalized label → canonical metadata key. */
const LABEL_TO_KEY = {
  slug: "slug",
  title: "title",
  eyebrow: "eyebrow",
  dek: "dek",
  subtitle: "dek",
  deck: "dek",
  author: "author",
  authorname: "author",
  published: "published",
  publishdate: "published",
  publisheddate: "published",
  readtime: "readTime",
  heroimageurl: "heroImageUrl",
  heroimage: "heroImageUrl",
  image: "heroImageUrl",
  heroimagealt: "heroImageAlt",
  imagealt: "heroImageAlt",
  tags: "tags",
};

function labelToCanonicalKey(label) {
  const n = normalizeLabel(label);
  return LABEL_TO_KEY[n] || null;
}

module.exports = {
  normalizeLabel,
  labelToCanonicalKey,
  LABEL_TO_KEY,
};
