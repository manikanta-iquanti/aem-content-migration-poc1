"use strict";

const path = require("path");
const fs = require("fs-extra");

const ROOT = path.join(__dirname, "..");
const IN_FILE = path.join(ROOT, "data", "transformed", "posts.json");
const OUT_DIR = path.join(ROOT, "data", "transformed");
const OUT_FILE = path.join(OUT_DIR, "migration-bundle.json");

async function main() {
  const exists = await fs.pathExists(IN_FILE);
  if (!exists) {
    throw new Error(`Run transform first. Missing: ${IN_FILE}`);
  }

  const posts = await fs.readJson(IN_FILE);
  const bundle = {
    generatedAt: new Date().toISOString(),
    count: posts.length,
    items: posts.map((p) => ({
      sourceId: p.id,
      slug: p.slug,
      title: p.title,
      status: "draft",
      content: p.contentHtml,
      excerpt: p.excerpt,
    })),
  };

  await fs.ensureDir(OUT_DIR);
  await fs.writeJson(OUT_FILE, bundle, { spaces: 2 });
  console.log(`Wrote bundle with ${bundle.count} items to ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
