"use strict";

/**
 * @typedef {{ script: string, argv?: string[] }} SequenceStep
 * @typedef {{ id: string, label: string, description: string, kind: 'script', script: string, buildArgv?: (payload: Record<string, unknown>) => string[], ui?: { customForm?: boolean } }} ScriptOperation
 * @typedef {{ id: string, label: string, description: string, kind: 'sequence', steps: SequenceStep[], ui?: { customForm?: boolean } }} SequenceOperation
 * @typedef {ScriptOperation | SequenceOperation} ResolvedOperation
 */

/** @param {Record<string, unknown>} payload */
function buildScrapeArgv(payload) {
  let urls = [];
  if (Array.isArray(payload.urls)) {
    urls = payload.urls.map((u) => String(u).trim()).filter(Boolean);
  } else if (typeof payload.urlsText === "string") {
    urls = payload.urlsText
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const discover = String(payload.discover || "").trim();
  const selector = String(payload.selector || "").trim();

  if (!urls.length && !discover) {
    throw new Error(
      "Provide at least one article URL (one per line) or a discover listing URL."
    );
  }

  const argv = [];
  for (const u of urls) {
    argv.push("--url", u);
  }
  if (discover) argv.push("--discover", discover);
  if (selector) argv.push("--selector", selector);
  return argv;
}

/** @param {Record<string, unknown>} payload */
function buildDocumentArgv(payload) {
  let globs = [];
  if (Array.isArray(payload.globs)) {
    globs = payload.globs.map((g) => String(g).trim()).filter(Boolean);
  } else if (typeof payload.globsText === "string") {
    globs = payload.globsText
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  let files = [];
  if (Array.isArray(payload.files)) {
    files = payload.files.map((f) => String(f).trim()).filter(Boolean);
  } else if (typeof payload.filesText === "string") {
    files = payload.filesText
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const linkBase =
    typeof payload.linkBase === "string" ? payload.linkBase.trim() : "";

  const argv = [];
  for (const g of globs) argv.push("--glob", g);
  for (const f of files) argv.push("--file", f);
  if (linkBase) argv.push("--link-base", linkBase);
  return argv;
}

/** @type {(ScriptOperation | SequenceOperation)[]} */
const OPERATIONS = [
  {
    id: "extract",
    label: "Extract",
    description:
      "Step 1: Pull raw content from the source (WordPress API, scrape, or documents per config.extract.mode). Writes data/raw/posts.json.",
    kind: "script",
    script: "scripts/extract.js",
  },
  {
    id: "extract-scrape",
    label: "Extract (scrape only)",
    description:
      "Run scrape extraction with optional ad-hoc URLs, discover listing, or selector overrides. Still reads other scrape settings from config.",
    kind: "script",
    script: "scripts/extract-scrape.js",
    buildArgv: buildScrapeArgv,
    ui: { customForm: true },
  },
  {
    id: "extract-documents",
    label: "Extract (documents)",
    description:
      "Import .docx / .pdf from extract.documents.globs (or optional glob/file overrides). Writes data/raw/posts.json in Meridian shape.",
    kind: "script",
    script: "scripts/extract-documents.js",
    buildArgv: buildDocumentArgv,
    ui: { customForm: true },
  },
  {
    id: "transform",
    label: "Transform",
    description:
      "Step 2: Normalize posts to the internal shape. Writes data/transformed/posts.json.",
    kind: "script",
    script: "scripts/transform.js",
  },
  {
    id: "generate",
    label: "Generate bundle",
    description:
      "Step 3: Build migration-bundle.json for publish or AEM package steps.",
    kind: "script",
    script: "scripts/generate.js",
  },
  {
    id: "pipeline",
    label: "Full pipeline",
    description:
      "Runs Extract → Transform → Generate in order (same as npm run pipeline).",
    kind: "sequence",
    steps: [
      { script: "scripts/extract.js", argv: [] },
      { script: "scripts/transform.js", argv: [] },
      { script: "scripts/generate.js", argv: [] },
    ],
  },
  {
    id: "publish",
    label: "Publish to WordPress",
    description:
      "POST each bundle item to the destination site (dry-run if destination credentials are empty).",
    kind: "script",
    script: "scripts/publish.js",
  },
  {
    id: "migrate-assets",
    label: "Migrate assets to DAM paths",
    description:
      "Download images from source URLs, rewrite migration-bundle.json to DAM paths, and write asset-manifest.json.",
    kind: "script",
    script: "scripts/migrate-assets.js",
  },
  {
    id: "build-aem-package",
    label: "Build AEM package",
    description:
      "Download/migrate assets (when enabled), then build FileVault zip with pages and DAM assets from migration-bundle.json.",
    kind: "script",
    script: "scripts/build-aem-package.js",
  },
  {
    id: "pipeline-aem",
    label: "Full AEM pipeline",
    description:
      "Runs Extract → Transform → Generate → Migrate assets → Build AEM package.",
    kind: "sequence",
    steps: [
      { script: "scripts/extract.js", argv: [] },
      { script: "scripts/transform.js", argv: [] },
      { script: "scripts/generate.js", argv: [] },
      { script: "scripts/build-aem-package.js", argv: [] },
    ],
  },
];

function listOperationsPublic() {
  return OPERATIONS.map((op) => ({
    id: op.id,
    label: op.label,
    description: op.description,
    kind: op.kind,
    customForm: op.ui?.customForm === true,
  }));
}

/** @param {string} id */
function getOperation(id) {
  return OPERATIONS.find((o) => o.id === id) || null;
}

module.exports = {
  OPERATIONS,
  listOperationsPublic,
  getOperation,
};
