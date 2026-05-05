"use strict";

const path = require("path");
const fs = require("fs-extra");
const archiver = require("archiver");

const ROOT = path.join(__dirname, "..");
const CONFIG_PATH = path.join(ROOT, "config", "config.json");

/**
 * Must match the exported blueprint at
 * data/aem-node-context/jcr_root/.../article/.content.xml
 * Re-export the page and update these if the sample title/body change.
 */
const BLUEPRINT_PAGE_JCR_TITLE = "article 1";
const BLUEPRINT_COMPONENT_TITLE = "This is my 1st page title";
const BLUEPRINT_TEXT_ATTR =
  'text="&lt;p>Here is a sample text for my 1st page&lt;/p>&#xa;"';

function escapeXmlAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r\n|\r|\n/g, "&#xa;");
}

function jcrPageName(slug) {
  let s = String(slug)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[^a-zA-Z0-9-_]/g, "-");
  s = s.replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!s) s = "page";
  return s.toLowerCase();
}

function loadAemConfig(config) {
  const defaults = {
    blueprintPath: path.join(
      ROOT,
      "data",
      "aem-node-context",
      "jcr_root",
      "content",
      "my-aem-site53",
      "us",
      "en",
      "article",
      ".content.xml"
    ),
    parentJcrPath: "/content/my-aem-site53/us/en",
    packageGroup: "wp_migration",
    packageName: "wp-to-aem-pages",
    packageVersion: "1.0.0",
    bundleFile: path.join(ROOT, "data", "transformed", "migration-bundle.json"),
    outputZip: path.join(ROOT, "data", "transformed", "wp-to-aem-migration.zip"),
    authorUrl: "http://localhost:8080",
    contextDir: path.join(ROOT, "data", "aem-node-context"),
  };
  const aem = config.aem && typeof config.aem === "object" ? config.aem : {};
  return {
    blueprintPath: aem.blueprintPath
      ? path.isAbsolute(aem.blueprintPath)
        ? aem.blueprintPath
        : path.join(ROOT, aem.blueprintPath)
      : defaults.blueprintPath,
    parentJcrPath: aem.parentJcrPath ?? defaults.parentJcrPath,
    packageGroup: aem.packageGroup ?? defaults.packageGroup,
    packageName: aem.packageName ?? defaults.packageName,
    packageVersion: aem.packageVersion ?? defaults.packageVersion,
    bundleFile: aem.bundleFile
      ? path.isAbsolute(aem.bundleFile)
        ? aem.bundleFile
        : path.join(ROOT, aem.bundleFile)
      : defaults.bundleFile,
    outputZip: aem.outputZip
      ? path.isAbsolute(aem.outputZip)
        ? aem.outputZip
        : path.join(ROOT, aem.outputZip)
      : defaults.outputZip,
    authorUrl: aem.authorUrl ?? defaults.authorUrl,
    contextDir: aem.contextDir
      ? path.isAbsolute(aem.contextDir)
        ? aem.contextDir
        : path.join(ROOT, aem.contextDir)
      : defaults.contextDir,
  };
}

function pageXmlFromBlueprint(blueprintXml, title, html) {
  let xml = blueprintXml;
  const pageTitleEsc = escapeXmlAttr(title.trim());
  const compTitleEsc = escapeXmlAttr(title.trim());
  const bodyEsc = escapeXmlAttr(html ?? "");

  xml = xml.replace(
    `jcr:title="${BLUEPRINT_PAGE_JCR_TITLE}"`,
    `jcr:title="${pageTitleEsc}"`
  );
  xml = xml.replace(
    `jcr:title="${BLUEPRINT_COMPONENT_TITLE}"`,
    `jcr:title="${compTitleEsc}"`
  );
  xml = xml.replace(BLUEPRINT_TEXT_ATTR, `text="${bodyEsc}"`);
  return xml;
}

function workspaceFilterXml(parentJcrPath) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<workspaceFilter version="1.0">
    <filter root="${parentJcrPath}" mode="merge"/>
</workspaceFilter>
`;
}

function packagePropertiesXml(group, name, version) {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
<comment>WP to AEM migration (generated)</comment>
<entry key="description">WordPress posts as AEM pages under language root</entry>
<entry key="packageType">content</entry>
<entry key="packageFormatVersion">2</entry>
<entry key="group">${group}</entry>
<entry key="created">${now}</entry>
<entry key="buildCount">1</entry>
<entry key="name">${name}</entry>
<entry key="version">${version}</entry>
<entry key="dependencies"></entry>
</properties>
`;
}

function manifestMf(group, packageName, version, contentRoots) {
  const id = `${group}:${packageName}-${version}`;
  return `Manifest-Version: 1.0
Content-Package-Id: ${id}
Content-Package-Roots: ${contentRoots}
Content-Package-Type: content

`;
}

async function main() {
  const config = await fs.readJson(CONFIG_PATH);
  const aem = loadAemConfig(config);

  const blueprintExists = await fs.pathExists(aem.blueprintPath);
  if (!blueprintExists) {
    throw new Error(`Blueprint not found: ${aem.blueprintPath}`);
  }

  const bundleExists = await fs.pathExists(aem.bundleFile);
  if (!bundleExists) {
    throw new Error(`Run generate first. Missing: ${aem.bundleFile}`);
  }

  const blueprintXml = await fs.readFile(aem.blueprintPath, "utf8");
  const bundle = await fs.readJson(aem.bundleFile);
  const items = Array.isArray(bundle.items) ? bundle.items : [];

  const parentSegs = aem.parentJcrPath.replace(/^\/+/, "").split("/");
  const jcrRootRel = path.join("jcr_root", ...parentSegs);

  const staging = await fs.mkdtemp(path.join(ROOT, ".aem-package-"));
  try {
    const metaInfVault = path.join(staging, "META-INF", "vault");
    await fs.ensureDir(metaInfVault);

    await fs.writeFile(
      path.join(metaInfVault, "filter.xml"),
      workspaceFilterXml(aem.parentJcrPath),
      "utf8"
    );
    await fs.writeFile(
      path.join(metaInfVault, "properties.xml"),
      packagePropertiesXml(
        aem.packageGroup,
        aem.packageName,
        aem.packageVersion
      ),
      "utf8"
    );

    const ctxVault = path.join(aem.contextDir, "META-INF", "vault");
    for (const f of ["config.xml", "nodetypes.cnd"]) {
      const src = path.join(ctxVault, f);
      if (await fs.pathExists(src)) {
        await fs.copy(src, path.join(metaInfVault, f));
      }
    }
    const defSrc = path.join(ctxVault, "definition", ".content.xml");
    if (await fs.pathExists(defSrc)) {
      await fs.ensureDir(path.join(metaInfVault, "definition"));
      await fs.copy(defSrc, path.join(metaInfVault, "definition", ".content.xml"));
    }

    await fs.writeFile(
      path.join(staging, "META-INF", "MANIFEST.MF"),
      manifestMf(
        aem.packageGroup,
        aem.packageName,
        aem.packageVersion,
        aem.parentJcrPath
      ),
      "utf8"
    );

    const seen = new Map();
    let written = 0;
    for (const item of items) {
      const pageName = jcrPageName(item.slug || `post-${item.sourceId}`);
      if (seen.has(pageName)) {
        console.warn(`Skip duplicate slug mapped to "${pageName}": ${item.slug}`);
        continue;
      }
      seen.set(pageName, true);

      const xml = pageXmlFromBlueprint(
        blueprintXml,
        item.title || pageName,
        item.content ?? ""
      );
      const pageDir = path.join(staging, jcrRootRel, pageName);
      await fs.ensureDir(pageDir);
      await fs.writeFile(path.join(pageDir, ".content.xml"), xml, "utf8");
      written++;
    }

    await fs.ensureDir(path.dirname(aem.outputZip));
    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(aem.outputZip);
      const archive = archiver("zip", { zlib: { level: 9 } });
      output.on("close", resolve);
      archive.on("error", reject);
      archive.pipe(output);
      archive.directory(staging, false);
      archive.finalize();
    });

    console.log(
      `Wrote ${written} page(s) → ${aem.outputZip}\nInstall on author: ${aem.authorUrl}/crx/packmgr/index.jsp`
    );
  } finally {
    await fs.remove(staging);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
