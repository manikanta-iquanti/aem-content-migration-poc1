"use strict";

const express = require("express");
const fs = require("fs-extra");
const path = require("node:path");

/**
 * If value is empty string, keep previous at the same path (password fields).
 * @param {unknown} incoming
 * @param {unknown} previous
 */
function mergePasswordField(incoming, previous) {
  if (incoming === "" || incoming === undefined) return previous;
  return incoming;
}

/**
 * @param {Record<string, unknown>} incoming
 * @param {Record<string, unknown>} previous
 */
function mergeConfigPreservingPasswords(incoming, previous) {
  const out = { ...previous, ...incoming };

  if (typeof incoming.source === "object" && incoming.source !== null) {
    const prevS =
      typeof previous.source === "object" && previous.source !== null
        ? previous.source
        : {};
    const incS = /** @type {Record<string, unknown>} */ (incoming.source);
    out.source = { ...prevS, ...incS };
    if ("applicationPassword" in incS) {
      out.source.applicationPassword = mergePasswordField(
        incS.applicationPassword,
        prevS.applicationPassword
      );
    }
  }

  if (typeof incoming.destination === "object" && incoming.destination !== null) {
    const prevD =
      typeof previous.destination === "object" && previous.destination !== null
        ? previous.destination
        : {};
    const incD = /** @type {Record<string, unknown>} */ (incoming.destination);
    out.destination = { ...prevD, ...incD };
    if ("applicationPassword" in incD) {
      out.destination.applicationPassword = mergePasswordField(
        incD.applicationPassword,
        prevD.applicationPassword
      );
    }
  }

  return out;
}

/**
 * @param {string} configPath
 */
function createConfigRouter(configPath) {
  const router = express.Router();

  router.get("/", async (_req, res) => {
    try {
      const data = await fs.readJson(configPath);
      res.json(data);
    } catch (e) {
      res.status(500).json({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  router.put("/", express.json({ limit: "2mb" }), async (req, res) => {
    try {
      const incoming = req.body;
      if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
        res.status(400).json({ error: "Body must be a JSON object" });
        return;
      }

      let previous = {};
      if (await fs.pathExists(configPath)) {
        previous = await fs.readJson(configPath);
      }

      const merged = mergeConfigPreservingPasswords(
        /** @type {Record<string, unknown>} */ (incoming),
        /** @type {Record<string, unknown>} */ (previous)
      );

      await fs.ensureDir(path.dirname(configPath));
      await fs.writeJson(configPath, merged, { spaces: 2 });
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  return router;
}

module.exports = { createConfigRouter };
