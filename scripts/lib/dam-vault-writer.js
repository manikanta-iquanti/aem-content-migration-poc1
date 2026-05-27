"use strict";

const crypto = require("crypto");
const path = require("path");
const fs = require("fs-extra");

/**
 * AEM 6.5 FileVault "file aggregate" layout (matches Author export).
 *
 * {asset}/
 *   .content.xml              dam:Asset + inline jcr:content (dam:AssetContent)
 *   _jcr_content/renditions/
 *     original                 binary bytes
 *     original.dir/.content.xml  nt:file + inline jcr:content (oak:Resource)
 *
 * @param {object} opts
 * @param {string} opts.stagingRoot Package staging directory (contains jcr_root)
 * @param {string} opts.damPath JCR path e.g. /content/dam/site/wp-migration/file.jpg
 * @param {string} opts.localFile Absolute path to downloaded binary
 * @param {string} opts.mimeType
 * @param {string} opts.fileName Basename for cq:name / dam:relativePath
 */
async function stageDamAsset(opts) {
  const { stagingRoot, damPath, localFile, mimeType, fileName } = opts;
  const rel = damPath.replace(/^\/+/, "");
  const assetDir = path.join(stagingRoot, "jcr_root", ...rel.split("/"));
  await fs.ensureDir(assetDir);

  const now = new Date().toISOString();
  const binary = await fs.readFile(localFile);
  const bytes = binary.length;
  const sha1 = crypto.createHash("sha1").update(binary).digest("hex");
  const relativePath = rel.replace(/^content\/dam\//, "");
  const safeName = fileName || path.basename(rel);

  await fs.writeFile(
    path.join(assetDir, ".content.xml"),
    assetRootXml(now, bytes, sha1),
    "utf8"
  );

  const renditionsDir = path.join(assetDir, "_jcr_content", "renditions");
  await fs.ensureDir(renditionsDir);

  await fs.copy(localFile, path.join(renditionsDir, "original"));

  const originalDirMeta = path.join(renditionsDir, "original.dir");
  await fs.ensureDir(originalDirMeta);
  await fs.writeFile(
    path.join(originalDirMeta, ".content.xml"),
    originalDirXml(now),
    "utf8"
  );

  // #region agent log
  const originalPath = path.join(renditionsDir, "original");
  const originalDirXmlPath = path.join(originalDirMeta, ".content.xml");
  const originalIsFile = (await fs.stat(originalPath)).isFile();
  const hasOriginalDirXml = await fs.pathExists(originalDirXmlPath);
  const hasJcrContentFolder = await fs.pathExists(
    path.join(assetDir, "jcr_content")
  );
  const hasUnderscoreJcrContent = await fs.pathExists(
    path.join(assetDir, "_jcr_content")
  );
  fetch("http://127.0.0.1:7370/ingest/e16be1f7-a6ee-4a7c-b1f1-168210302597", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "00f36f",
    },
    body: JSON.stringify({
      sessionId: "00f36f",
      location: "dam-vault-writer.js:stageDamAsset",
      message: "staged AEM-export-style asset",
      data: {
        damPath,
        layout: "file-aggregate",
        originalIsFile,
        hasOriginalDirXml,
        hasJcrContentFolder,
        hasUnderscoreJcrContent,
        bytes,
        safeName,
      },
      timestamp: Date.now(),
      hypothesisId: "F",
      runId: "aem-export-layout",
    }),
  }).catch(() => {});
  // #endregion
}

/**
 * Ensure sling:OrderedFolder nodes exist for DAM path ancestors.
 * @param {string} stagingRoot
 * @param {string} damRoot
 * @param {string[]} assetDamPaths
 */
async function ensureDamFolderAncestors(stagingRoot, damRoot, assetDamPaths) {
  const folders = new Set();

  for (const damPath of assetDamPaths) {
    const parts = damPath.replace(/^\/+/, "").split("/");
    for (let i = 1; i < parts.length; i++) {
      folders.add(parts.slice(0, i).join("/"));
    }
  }

  const rootNorm = damRoot.replace(/^\/+/, "").replace(/\/+$/, "");
  const rootParts = rootNorm.split("/");
  for (let i = 1; i <= rootParts.length; i++) {
    folders.add(rootParts.slice(0, i).join("/"));
  }

  const sorted = [...folders].sort((a, b) => a.length - b.length);
  for (const folderRel of sorted) {
    const dir = path.join(stagingRoot, "jcr_root", ...folderRel.split("/"));
    const marker = path.join(dir, ".content.xml");
    if (await fs.pathExists(marker)) continue;
    await fs.ensureDir(dir);
    await fs.writeFile(marker, orderedFolderXml(), "utf8");
  }
}

function orderedFolderXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:nt="http://www.jcp.org/jcr/nt/1.0" xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
    jcr:primaryType="sling:OrderedFolder"/>
`;
}

/** Matches exported dam:Asset root (hero-image1.avif/.content.xml). */
function assetRootXml(isoDate, bytes, sha1) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:dam="http://www.day.com/dam/1.0" xmlns:cq="http://www.day.com/jcr/cq/1.0" xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:mix="http://www.jcp.org/jcr/mix/1.0" xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
    jcr:mixinTypes="[mix:referenceable]"
    jcr:primaryType="dam:Asset">
    <jcr:content
        dam:assetState="processed"
        jcr:lastModified="{Date}${isoDate}"
        jcr:lastModifiedBy="wp-migration"
        jcr:primaryType="dam:AssetContent">
        <metadata
            dam:extracted="{Date}${isoDate}"
            dam:sha1="${sha1}"
            dam:size="{Long}${bytes}"
            jcr:mixinTypes="[cq:Taggable]"
            jcr:primaryType="nt:unstructured"/>
        <related jcr:primaryType="nt:unstructured"/>
    </jcr:content>
</jcr:root>
`;
}

/** Matches exported original.dir/.content.xml (nt:file + oak:Resource child). */
function originalDirXml(isoDate) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:oak="http://jackrabbit.apache.org/oak/ns/1.0" xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
    jcr:primaryType="nt:file">
    <jcr:content
        jcr:lastModified="{Date}${isoDate}"
        jcr:lastModifiedBy="wp-migration"
        jcr:primaryType="oak:Resource"/>
</jcr:root>
`;
}

module.exports = { stageDamAsset, ensureDamFolderAncestors };
