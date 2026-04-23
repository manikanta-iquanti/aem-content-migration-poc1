"use strict";

const path = require("path");
const axios = require("axios");
const fs = require("fs-extra");

const ROOT = path.join(__dirname, "..");
const CONFIG_PATH = path.join(ROOT, "config", "config.json");
const OUT_DIR = path.join(ROOT, "data", "raw");
const OUT_FILE = path.join(OUT_DIR, "posts.json");

async function main() {
  const config = await fs.readJson(CONFIG_PATH);
  const base = config.source.baseUrl.replace(/\/$/, "");
  const url = `${base}${config.extract.endpoint}`;
  const auth =
    config.source.username && config.source.applicationPassword
      ? {
          username: config.source.username,
          password: config.source.applicationPassword,
        }
      : undefined;

  const res = await axios.get(url, {
    params: { per_page: config.extract.perPage, _embed: 1 },
    auth,
  });

  const data = res.data;
  if (!Array.isArray(data)) {
    throw new Error(
      `Expected JSON array from ${url}. Got: ${typeof data}. Check baseUrl and REST availability.`
    );
  }

  await fs.ensureDir(OUT_DIR);
  await fs.writeJson(OUT_FILE, data, { spaces: 2 });
  console.log(`Wrote ${data.length} posts to ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
