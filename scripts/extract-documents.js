"use strict";

const path = require("node:path");
const fs = require("fs-extra");
const { importDocumentsToWpShape } = require("./lib/document-import");

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
  const files = collectArgs("--file", cliArgs);
  const globs = collectArgs("--glob", cliArgs);
  const linkBase = readArg("--link-base", cliArgs);

  const config = await fs.readJson(CONFIG_PATH);
  const data = await importDocumentsToWpShape(config, {
    extraFiles: files,
    globsOverride: globs.length ? globs : undefined,
    linkBaseUrl: linkBase || undefined,
  });

  await fs.ensureDir(OUT_DIR);
  await fs.writeJson(OUT_FILE, data, { spaces: 2 });
  console.log(`Wrote ${data.length} document(s) to ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
