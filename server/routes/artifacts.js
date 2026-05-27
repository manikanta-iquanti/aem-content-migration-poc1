"use strict";

const express = require("express");
const path = require("node:path");
const fs = require("fs-extra");

/** Files allowed under data/transformed/ */
const ALLOWED = new Set([
  "migration-bundle.json",
  "asset-manifest.json",
  "posts.json",
  "wp-to-aem-migration.zip",
]);

/**
 * @param {string} repoRoot
 */
function createArtifactsRouter(repoRoot) {
  const router = express.Router();
  const base = path.join(repoRoot, "data", "transformed");

  router.get("/:name", async (req, res) => {
    const name = path.basename(req.params.name);
    if (!ALLOWED.has(name)) {
      res.status(404).json({ error: "Unknown artifact" });
      return;
    }

    const filePath = path.join(base, name);
    const resolved = path.resolve(filePath);
    const resolvedBase = path.resolve(base);
    if (!resolved.startsWith(resolvedBase + path.sep) && resolved !== resolvedBase) {
      res.status(400).json({ error: "Invalid path" });
      return;
    }

    try {
      if (!(await fs.pathExists(resolved))) {
        res.status(404).json({ error: "File not found yet. Run the pipeline first." });
        return;
      }

      res.setHeader("Content-Disposition", `attachment; filename="${name}"`);

      if (name.endsWith(".zip")) {
        res.setHeader("Content-Type", "application/zip");
        const buf = await fs.readFile(resolved);
        res.send(buf);
        return;
      }

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      const buf = await fs.readFile(resolved);
      res.send(buf);
    } catch (e) {
      res.status(500).json({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  return router;
}

module.exports = { createArtifactsRouter };
