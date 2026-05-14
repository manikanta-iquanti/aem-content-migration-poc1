"use strict";

const path = require("node:path");
const { existsSync } = require("node:fs");
const express = require("express");

const ROOT = path.join(__dirname, "..");
const CONFIG_PATH = path.join(ROOT, "config", "config.json");
const WEB_DIST = path.join(ROOT, "web", "dist");

const { listOperationsPublic } = require("./operations/registry");
const { createJobsRouter } = require("./routes/jobs");
const { createConfigRouter } = require("./routes/config");
const { createArtifactsRouter } = require("./routes/artifacts");

const isProd = process.env.NODE_ENV === "production";

const app = express();

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "wp-migration-control-server" });
});

app.get("/api/operations", (_req, res) => {
  res.json({ operations: listOperationsPublic() });
});

app.use("/api/jobs", createJobsRouter(ROOT));
app.use("/api/config", createConfigRouter(CONFIG_PATH));
app.use("/api/artifacts", createArtifactsRouter(ROOT));

if (isProd && existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST));
  app.get("/*", (_req, res) => {
    res.sendFile(path.join(WEB_DIST, "index.html"));
  });
}

const PORT = Number(process.env.PORT) || 3847;
const HOST = "127.0.0.1";

app.listen(PORT, HOST, () => {
  console.log(`Control API: http://${HOST}:${PORT}`);
  if (!isProd) {
    console.log("Run the Vite dev server in ../web (see npm run dev:all) and open the URL it prints.");
  } else {
    console.log("Serving web UI from web/dist");
  }
});
