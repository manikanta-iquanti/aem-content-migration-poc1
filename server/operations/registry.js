"use strict";

/**
 * @typedef {{ script: string, argv?: string[] }} SequenceStep
 * @typedef {{ id: string, label: string, description: string, kind: 'script', script: string, ui?: { group?: string, step?: number } }} ScriptOperation
 * @typedef {{ id: string, label: string, description: string, kind: 'sequence', steps: SequenceStep[], ui?: { group?: string } }} SequenceOperation
 * @typedef {ScriptOperation | SequenceOperation} ResolvedOperation
 */

/** @type {(ScriptOperation | SequenceOperation)[]} */
const OPERATIONS = [
  {
    id: "pipeline-aem",
    label: "Run full AEM migration",
    description:
      "Extract content → normalize → build bundle → download images into DAM → create FileVault ZIP for Package Manager. Use this for a complete run.",
    kind: "sequence",
    ui: { group: "primary" },
    steps: [
      { script: "scripts/extract.js", argv: [] },
      { script: "scripts/transform.js", argv: [] },
      { script: "scripts/generate.js", argv: [] },
      { script: "scripts/build-aem-package.js", argv: [] },
    ],
  },
  {
    id: "extract",
    label: "1. Extract",
    description:
      "Pull raw content per extract.mode in config (WordPress API, scrape URLs, or local documents). Writes data/raw/posts.json.",
    kind: "script",
    script: "scripts/extract.js",
    ui: { group: "steps", step: 1 },
  },
  {
    id: "transform",
    label: "2. Transform",
    description:
      "Normalize posts and parse HTML into AEM blocks. Writes data/transformed/posts.json.",
    kind: "script",
    script: "scripts/transform.js",
    ui: { group: "steps", step: 2 },
  },
  {
    id: "generate",
    label: "3. Generate bundle",
    description:
      "Build migration-bundle.json consumed by the AEM package step.",
    kind: "script",
    script: "scripts/generate.js",
    ui: { group: "steps", step: 3 },
  },
  {
    id: "build-aem-package",
    label: "4. Build AEM package",
    description:
      "Migrate assets (when enabled), then build wp-to-aem-migration.zip from the bundle and blueprint.",
    kind: "script",
    script: "scripts/build-aem-package.js",
    ui: { group: "steps", step: 4 },
  },
  {
    id: "migrate-assets",
    label: "Migrate assets only",
    description:
      "Debug: download images and rewrite bundle DAM paths without rebuilding the ZIP. Normally included in step 4.",
    kind: "script",
    script: "scripts/migrate-assets.js",
    ui: { group: "advanced" },
  },
];

function listOperationsPublic() {
  return OPERATIONS.map((op) => ({
    id: op.id,
    label: op.label,
    description: op.description,
    kind: op.kind,
    group: op.ui?.group || "steps",
    step: op.ui?.step,
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
