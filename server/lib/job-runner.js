"use strict";

const { spawn } = require("node:child_process");
const path = require("node:path");
const crypto = require("node:crypto");

/** @typedef {{ id: string, lines: string[], status: 'queued'|'running'|'completed'|'failed', exitCode: number | null, error?: string, subscribers: Set<import('http').ServerResponse> }} Job */

/** @type {Map<string, Job>} */
const jobs = new Map();

/** @type {Job | null} */
let activeJob = null;

function sseWrite(res, event, dataObj) {
  if (res.writableEnded) return;
  const data = typeof dataObj === "string" ? dataObj : JSON.stringify(dataObj);
  res.write(`event: ${event}\n`);
  res.write(`data: ${data}\n\n`);
}

function broadcast(job, event, data) {
  for (const res of job.subscribers) {
    try {
      sseWrite(res, event, data);
    } catch {
      job.subscribers.delete(res);
    }
  }
}

function appendLog(job, text, stream) {
  const prefix = stream === "stderr" ? "[stderr] " : "";
  const line = prefix + text;
  job.lines.push(line);
  broadcast(job, "log", { line });
}

function attachSubscriber(job, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  for (const line of job.lines) {
    sseWrite(res, "log", { line });
  }

  if (job.status === "completed" || job.status === "failed") {
    sseWrite(res, "done", {
      status: job.status,
      exitCode: job.exitCode,
      error: job.error || null,
    });
    res.end();
    return;
  }

  job.subscribers.add(res);
  reqOnClose(res, () => job.subscribers.delete(res));
}

function reqOnClose(res, fn) {
  res.on("close", fn);
}

/**
 * @param {string} repoRoot
 * @param {string} scriptRelative scripts/foo.js
 * @param {string[]} argv
 * @param {(t: string, s: 'stdout'|'stderr') => void} onLine
 */
function runScriptProcess(repoRoot, scriptRelative, argv, onLine) {
  const scriptPath = path.join(repoRoot, scriptRelative);
  const child = spawn(process.execPath, [scriptPath, ...argv], {
    cwd: repoRoot,
    env: { ...process.env },
    windowsHide: true,
  });

  return new Promise((resolve, reject) => {
    child.stdout?.on("data", (buf) => {
      String(buf)
        .split(/\r?\n/)
        .filter(Boolean)
        .forEach((l) => onLine(l, "stdout"));
    });
    child.stderr?.on("data", (buf) => {
      String(buf)
        .split(/\r?\n/)
        .filter(Boolean)
        .forEach((l) => onLine(l, "stderr"));
    });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 0));
  });
}

/**
 * @param {string} repoRoot
 * @param {import('../operations/registry').ResolvedOperation} op
 * @param {Record<string, unknown>} payload
 * @param {Job} job
 */
async function executeOperationWithLogging(repoRoot, op, payload, job) {
  const logLine = (t, s) => appendLog(job, t, s);

  if (op.kind === "script") {
    const argv = op.buildArgv ? op.buildArgv(payload) : [];
    appendLog(job, `$ node ${op.script} ${argv.join(" ")}`.trim(), "stdout");
    return runScriptProcess(repoRoot, op.script, argv, logLine);
  }
  if (op.kind === "sequence") {
    let last = 0;
    for (let i = 0; i < op.steps.length; i++) {
      const step = op.steps[i];
      broadcast(job, "step", { index: i + 1, total: op.steps.length, script: step.script });
      appendLog(job, `--- Step ${i + 1}/${op.steps.length}: ${step.script} ---`, "stdout");
      const argv = step.argv || [];
      appendLog(job, `$ node ${step.script} ${argv.join(" ")}`.trim(), "stdout");
      last = await runScriptProcess(repoRoot, step.script, argv, logLine);
      if (last !== 0) return last;
    }
    return last;
  }
  throw new Error(`Unknown operation kind: ${op.kind}`);
}

function isBusy() {
  return activeJob !== null;
}

/**
 * @param {string} repoRoot
 * @param {import('../operations/registry').ResolvedOperation} op
 * @param {Record<string, unknown>} payload
 */
function startJob(repoRoot, op, payload) {
  if (isBusy()) {
    const err = new Error("Another job is already running. Wait for it to finish.");
    err.code = "BUSY";
    throw err;
  }

  const id = crypto.randomUUID();
  /** @type {Job} */
  const job = {
    id,
    lines: [],
    status: "queued",
    exitCode: null,
    subscribers: new Set(),
  };
  jobs.set(id, job);
  activeJob = job;

  process.nextTick(async () => {
    job.status = "running";
    broadcast(job, "status", { status: "running" });
    try {
      const code = await executeOperationWithLogging(repoRoot, op, payload, job);
      job.exitCode = code;
      job.status = code === 0 ? "completed" : "failed";
      broadcast(job, "done", {
        status: job.status,
        exitCode: code,
        error: null,
      });
    } catch (e) {
      job.status = "failed";
      job.exitCode = 1;
      job.error = e instanceof Error ? e.message : String(e);
      appendLog(job, job.error, "stderr");
      broadcast(job, "done", {
        status: "failed",
        exitCode: 1,
        error: job.error,
      });
    } finally {
      for (const res of job.subscribers) {
        try {
          if (!res.writableEnded) res.end();
        } catch {
          /* ignore */
        }
      }
      job.subscribers.clear();
      activeJob = null;
    }
  });

  return { jobId: id };
}

function streamJob(jobId, res) {
  const job = jobs.get(jobId);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  attachSubscriber(job, res);
}

function getJob(jobId) {
  return jobs.get(jobId);
}

module.exports = {
  startJob,
  streamJob,
  getJob,
  isBusy,
};
