"use strict";

const path = require("path");
const fs = require("fs-extra");
const archiver = require("archiver");

const { wpHtmlToAemBlocks } = require("./lib/wp-html-to-aem-blocks");

const ROOT = path.join(__dirname, "..");
const CONFIG_PATH = path.join(ROOT, "config", "config.json");

/**
 * Must match the exported blueprint page title at
 * data/aem-node-context/jcr_root/.../article/.content.xml
 */
const BLUEPRINT_PAGE_JCR_TITLE = "article 1";

const WP_BODY_MARKER_START = "<!-- WP_MIGRATION_BODY_START -->";
const WP_BODY_MARKER_END = "<!-- WP_MIGRATION_BODY_END -->";

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

function extractSiteKeyFromBlueprint(blueprintXml) {
  const m = blueprintXml.match(/sling:resourceType="([^/]+)\/components\/page"/);
  return m ? m[1] : "my-aem-site53";
}

function renderTextComponent(siteKey, nodeName, html, escape) {
  const esc = escape(html ?? "");
  return `                    <${nodeName}
                        jcr:primaryType="nt:unstructured"
                        sling:resourceType="${siteKey}/components/text"
                        text="${esc}"
                        textIsRich="true"/>`;
}

function renderImageComponent(siteKey, nodeName, block, escape) {
  const alt = escape(block.alt ?? "");
  const src = escape(block.src ?? "");
  const decorative =
    !(block.alt && String(block.alt).trim()) ? "true" : "false";
  return `                    <${nodeName}
                        jcr:primaryType="nt:unstructured"
                        sling:resourceType="${siteKey}/components/image"
                        alt="${alt}"
                        altValueFromDAM="false"
                        displayPopupTitle="true"
                        fileReference="${src}"
                        imageFromPageImage="false"
                        isDecorative="${decorative}"
                        linkTarget="_self"
                        titleValueFromDAM="true"/>`;
}

function renderAccordionComponent(siteKey, nodeName, panels, escape) {
  const itemsXml = panels
    .map((p, i) => {
      const n = i + 1;
      const titleEsc = escape(p.panelTitle || `Item ${n}`);
      const bodyEsc = escape(
        p.bodyHtml && String(p.bodyHtml).trim()
          ? p.bodyHtml
          : "<p></p>"
      );
      return `                        <item_${n}
                            cq:panelTitle="${titleEsc}"
                            jcr:primaryType="nt:unstructured"
                            jcr:title="${titleEsc}"
                            sling:resourceType="${siteKey}/components/container"
                            layout="responsiveGrid">
                            <text
                                jcr:primaryType="nt:unstructured"
                                sling:resourceType="${siteKey}/components/text"
                                text="${bodyEsc}"
                                textIsRich="true"/>
                        </item_${n}>`;
    })
    .join("\n");
  return `                    <${nodeName}
                        jcr:primaryType="nt:unstructured"
                        sling:resourceType="${siteKey}/components/accordion"
                        singleExpansion="false">
${itemsXml}
                    </${nodeName}>`;
}

/**
 * @param {string} siteKey
 * @param {Array<object>} blocks
 * @param {(s: string) => string} escape
 */
function renderBodyXml(siteKey, blocks, escape) {
  let textCount = 0;
  let imageCount = 0;
  let accordionCount = 0;
  const parts = [];

  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    if (block.type === "text") {
      textCount += 1;
      const name = textCount === 1 ? "text" : `text_${textCount - 1}`;
      parts.push(renderTextComponent(siteKey, name, block.html, escape));
      continue;
    }
    if (block.type === "image") {
      imageCount += 1;
      const name =
        imageCount === 1 ? "image" : `image_${imageCount - 1}`;
      parts.push(renderImageComponent(siteKey, name, block, escape));
      continue;
    }
    if (block.type === "accordion") {
      const panels = Array.isArray(block.panels) ? block.panels : [];
      if (panels.length === 0) continue;
      accordionCount += 1;
      const name =
        accordionCount === 1
          ? "accordion"
          : `accordion_${accordionCount - 1}`;
      parts.push(
        renderAccordionComponent(siteKey, name, panels, escape)
      );
    }
  }

  if (parts.length === 0) {
    parts.push(
      renderTextComponent(
        siteKey,
        "text",
        "<p></p>",
        escape
      )
    );
  }

  return parts.join("\n");
}

function resolveBlocks(item) {
  if (Array.isArray(item.aemBlocks) && item.aemBlocks.length > 0) {
    return item.aemBlocks;
  }
  return wpHtmlToAemBlocks(item.content ?? "");
}

function pageXmlFromBlueprint(blueprintXml, title, blocks) {
  let xml = blueprintXml;
  const siteKey = extractSiteKeyFromBlueprint(blueprintXml);
  const pageTitleEsc = escapeXmlAttr(title.trim());
  xml = xml.replace(
    `jcr:title="${BLUEPRINT_PAGE_JCR_TITLE}"`,
    `jcr:title="${pageTitleEsc}"`
  );

  if (!xml.includes(WP_BODY_MARKER_START) || !xml.includes(WP_BODY_MARKER_END)) {
    throw new Error(
      `Blueprint must contain ${WP_BODY_MARKER_START} and ${WP_BODY_MARKER_END} around the main content container.`
    );
  }

  const bodyXml = renderBodyXml(siteKey, blocks, escapeXmlAttr);
  xml = xml.replace(
    new RegExp(
      `(${escapeRegex(WP_BODY_MARKER_START)})\\s*[\\s\\S]*?\\s*(${escapeRegex(
        WP_BODY_MARKER_END
      )})`,
      "m"
    ),
    `$1\n${bodyXml}\n                    $2`
  );
  return xml;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

      const blocks = resolveBlocks(item);
      const xml = pageXmlFromBlueprint(
        blueprintXml,
        item.title || pageName,
        blocks
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
