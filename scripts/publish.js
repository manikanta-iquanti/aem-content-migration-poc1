"use strict";

const path = require("path");
const axios = require("axios");
const fs = require("fs-extra");

const ROOT = path.join(__dirname, "..");
const CONFIG_PATH = path.join(ROOT, "config", "config.json");
const BUNDLE_FILE = path.join(ROOT, "data", "transformed", "migration-bundle.json");

async function main() {
  const bundleExists = await fs.pathExists(BUNDLE_FILE);
  if (!bundleExists) {
    throw new Error(`Run generate first. Missing: ${BUNDLE_FILE}`);
  }

  const config = await fs.readJson(CONFIG_PATH);
  const bundle = await fs.readJson(BUNDLE_FILE);
  const base = config.destination.baseUrl.replace(/\/$/, "");
  const endpoint = `${base}/wp-json/wp/v2/posts`;

  const auth =
    config.destination.username && config.destination.applicationPassword
      ? {
          username: config.destination.username,
          password: config.destination.applicationPassword,
        }
      : undefined;

  if (!auth) {
    console.log(
      "destination.username and destination.applicationPassword are empty — dry run only (no POST)."
    );
    bundle.items.forEach((item, i) => {
      console.log(`[${i + 1}/${bundle.items.length}] would POST: ${item.slug}`);
    });
    return;
  }

  for (let i = 0; i < bundle.items.length; i++) {
    const item = bundle.items[i];
    const payload = {
      title: item.title,
      slug: item.slug,
      status: item.status || "draft",
      content: item.content,
      excerpt: item.excerpt,
    };
    const res = await axios.post(endpoint, payload, { auth });
    console.log(`Created post id=${res.data.id} slug=${res.data.slug}`);
  }
}

main().catch((err) => {
  console.error(err.response?.data || err.message || err);
  process.exit(1);
});
