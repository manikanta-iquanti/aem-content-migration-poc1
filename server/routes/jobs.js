"use strict";

const express = require("express");
const { startJob, streamJob } = require("../lib/job-runner");
const { getOperation } = require("../operations/registry");

/**
 * @param {string} repoRoot
 */
function createJobsRouter(repoRoot) {
  const router = express.Router();

  router.post("/", express.json(), (req, res) => {
    const operationId = req.body?.operationId;
    const payload =
      req.body?.payload && typeof req.body.payload === "object"
        ? req.body.payload
        : {};

    if (!operationId || typeof operationId !== "string") {
      res.status(400).json({ error: "Missing operationId" });
      return;
    }

    const op = getOperation(operationId);
    if (!op) {
      res.status(404).json({ error: `Unknown operation: ${operationId}` });
      return;
    }

    try {
      const { jobId } = startJob(repoRoot, op, payload);
      res.json({ jobId, operationId });
    } catch (e) {
      if (e && typeof e === "object" && "code" in e && e.code === "BUSY") {
        res.status(409).json({ error: e.message });
        return;
      }
      const message = e instanceof Error ? e.message : String(e);
      res.status(400).json({ error: message });
    }
  });

  router.get("/:jobId/stream", (req, res) => {
    streamJob(req.params.jobId, res);
  });

  return router;
}

module.exports = { createJobsRouter };
