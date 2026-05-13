"use strict";

const path = require("node:path");
const fs = require("fs-extra");
const { scrapePagesToWpShape } = require("./lib/scrape-pages");

const ROOT = path.join(__dirname, "..");
const CONFIG_PATH = path.join(ROOT, "config", "config.json");
const OUT_DIR = path.join(ROOT, "data", "raw");
const OUT_FILE = path.join(OUT_DIR, "posts.json");

function readArg(flag, args) {
  const idx = args.indexOf(flag);
  if (idx < 0) return "";
  return args[idx + 1] || "";
}

function collectArgs(flag, args) {
  const values = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && args[i + 1]) {
      values.push(args[i + 1]);
      i++;
    }
  }
  return values;
}

async function main() {
  const cliArgs = process.argv.slice(2);
  const cliUrls = collectArgs("--url", cliArgs);
  const contentSelector = readArg("--selector", cliArgs);
  const discoverFromCli = readArg("--discover", cliArgs);

  const config = await fs.readJson(CONFIG_PATH);
  const cfgUrls =
    Array.isArray(config?.extract?.scrape?.urls) && config.extract.scrape.urls.length
      ? config.extract.scrape.urls
      : [];

  const urls = cliUrls.length ? cliUrls : cfgUrls;
  const discoverIndexUrl =
    discoverFromCli || String(config?.extract?.scrape?.discoverIndexUrl || "").trim();

  if (!urls.length && !discoverIndexUrl) {
    throw new Error(
      "No scrape URLs. Pass --url (repeatable), or --discover <indexUrl>, or set extract.scrape.urls / extract.scrape.discoverIndexUrl in config."
    );
  }

  const tempConfig = {
    ...config,
    extract: {
      ...config.extract,
      mode: "scrape",
      scrape: {
        ...config.extract?.scrape,
        urls,
        discoverIndexUrl,
        contentSelector: contentSelector || config.extract?.scrape?.contentSelector || "",
      },
    },
  };

  const data = await scrapePagesToWpShape(tempConfig);
  await fs.ensureDir(OUT_DIR);
  await fs.writeJson(OUT_FILE, data, { spaces: 2 });
  console.log(`Wrote ${data.length} scraped items to ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
