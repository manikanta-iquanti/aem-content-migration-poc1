"use strict";

const path = require("path");
const fs = require("fs-extra");

const { wpHtmlToAemBlocks } = require("./lib/wp-html-to-aem-blocks");

const ROOT = path.join(__dirname, "..");
const RAW_FILE = path.join(ROOT, "data", "raw", "posts.json");
const OUT_DIR = path.join(ROOT, "data", "transformed");
const OUT_FILE = path.join(OUT_DIR, "posts.json");

function stripHtml(html) {
  if (!html || typeof html !== "string") return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function main() {
  const exists = await fs.pathExists(RAW_FILE);
  if (!exists) {
    throw new Error(`Run extract first. Missing: ${RAW_FILE}`);
  }

  const raw = await fs.readJson(RAW_FILE);
  const transformed = raw.map((post) => ({
    id: post.id,
    slug: post.slug,
    status: post.status,
    date: post.date,
    title: post.title?.rendered ?? "",
    excerpt: post.excerpt?.rendered
      ? stripHtml(post.excerpt.rendered)
      : "",
    contentHtml: post.content?.rendered ?? "",
    aemBlocks: wpHtmlToAemBlocks(post.content?.rendered ?? ""),
    link: post.link ?? "",
  }));

  await fs.ensureDir(OUT_DIR);
  await fs.writeJson(OUT_FILE, transformed, { spaces: 2 });
  console.log(`Wrote ${transformed.length} transformed posts to ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
