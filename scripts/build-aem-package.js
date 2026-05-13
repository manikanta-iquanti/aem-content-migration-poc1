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
    bodyRenderer: aem.bodyRenderer === "meridian" ? "meridian" : "legacy",
  };
}

function extractSiteKeyFromBlueprint(blueprintXml) {
  const m = blueprintXml.match(/sling:resourceType="([^/]+)\/components\/page"/);
  return m ? m[1] : "my-aem-site53";
}

function extractBlueprintJcrTitle(blueprintXml) {
  const m = blueprintXml.match(
    /jcr:primaryType="cq:PageContent"[\s\S]{0,2500}?jcr:title="([^"]*)"/
  );
  return m ? m[1] : BLUEPRINT_PAGE_JCR_TITLE;
}

function escapeHtmlInner(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function accordionPanelsToRichHtml(panels) {
  return panels
    .map((p) => {
      const t = escapeHtmlInner(p.panelTitle || "");
      const b = p.bodyHtml && String(p.bodyHtml).trim() ? p.bodyHtml : "<p></p>";
      return `<p><strong>${t}</strong></p>${b}`;
    })
    .join("");
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

function renderMeridianHero(siteKey, escape, hero) {
  return `                <mig_hero
                        jcr:primaryType="nt:unstructured"
                        sling:resourceType="${siteKey}/components/meridian-article-hero"
                        authorName="${escape(hero.authorName ?? "")}"
                        dek="${escape(hero.dek ?? "")}"
                        eyebrow="${escape(hero.eyebrow ?? "")}"
                        image="${escape(hero.image ?? "")}"
                        imageAlt="${escape(hero.imageAlt ?? "")}"
                        publishDateText="${escape(hero.publishDateText ?? "")}"
                        readTime="${escape(hero.readTime ?? "")}"
                        title="${escape(hero.title ?? "")}"/>`;
}

function renderMeridianJumpLinks(siteKey, escape, links) {
  if (!Array.isArray(links) || links.length === 0) return "";
  const itemsXml = links
    .map((l, i) => {
      const hrefRaw = String(l.href || "").replace(/^#/, "");
      const href = escape(hrefRaw);
      const text = escape(l.text || "");
      return `                        <item${i}
                            jcr:primaryType="nt:unstructured"
                            href="${href}"
                            text="${text}"/>`;
    })
    .join("\n");
  return `                <mig_jump
                        jcr:primaryType="nt:unstructured"
                        sling:resourceType="${siteKey}/components/meridian-article-jump-links">
                        <links jcr:primaryType="nt:unstructured">
${itemsXml}
                        </links>
                    </mig_jump>`;
}

function renderMeridianParagraph(siteKey, escape, nodeName, html, dropCap) {
  return `                <${nodeName}
                        jcr:primaryType="nt:unstructured"
                        sling:resourceType="${siteKey}/components/meridian-article-paragraph"
                        body="${escape(html ?? "")}"
                        dropCap="${dropCap ? "true" : "false"}"
                        textIsRich="true"/>`;
}

function renderMeridianHeading(siteKey, escape, nodeName, block) {
  const level = String(block.level || "h2").toLowerCase();
  const anchor = escape(String(block.anchorId || ""));
  const text = escape(String(block.text || ""));
  return `                <${nodeName}
                        jcr:primaryType="nt:unstructured"
                        sling:resourceType="${siteKey}/components/meridian-article-heading"
                        anchorId="${anchor}"
                        level="${level}"
                        text="${text}"/>`;
}

function renderMeridianQuote(siteKey, escape, nodeName, text) {
  return `                <${nodeName}
                        jcr:primaryType="nt:unstructured"
                        sling:resourceType="${siteKey}/components/meridian-pull-quote"
                        quote="${escape(text ?? "")}"/>`;
}

function renderMeridianList(siteKey, escape, nodeName, block) {
  const listType = block.ordered ? "ordered" : "unordered";
  const items = Array.isArray(block.items) ? block.items : [];
  const itemsXml = items
    .map((t, i) => {
      return `                        <item${i}
                            jcr:primaryType="nt:unstructured"
                            text="${escape(String(t))}"/>`;
    })
    .join("\n");
  return `                <${nodeName}
                        jcr:primaryType="nt:unstructured"
                        sling:resourceType="${siteKey}/components/meridian-article-list"
                        listType="${listType}">
                        <items jcr:primaryType="nt:unstructured">
${itemsXml}
                        </items>
                    </${nodeName}>`;
}

function renderMeridianCallout(siteKey, escape, nodeName, block) {
  const eyebrow = escape(String(block.eyebrow ?? ""));
  const initial = escape(String(block.initial ?? "N"));
  const body = escape(String(block.bodyHtml ?? "<p></p>"));
  return `                <${nodeName}
                        jcr:primaryType="nt:unstructured"
                        sling:resourceType="${siteKey}/components/meridian-article-callout"
                        body="${body}"
                        eyebrow="${eyebrow}"
                        initial="${initial}"
                        textIsRich="true"/>`;
}

function renderMeridianTags(siteKey, escape, tags) {
  if (!Array.isArray(tags) || tags.length === 0) return "";
  const itemsXml = tags
    .map((t, i) => {
      return `                        <item${i}
                            jcr:primaryType="nt:unstructured"
                            text="${escape(String(t))}"/>`;
    })
    .join("\n");
  return `                <mig_tags
                        jcr:primaryType="nt:unstructured"
                        sling:resourceType="${siteKey}/components/meridian-article-tags">
                        <tags jcr:primaryType="nt:unstructured">
${itemsXml}
                        </tags>
                    </mig_tags>`;
}

function renderMeridianAuthor(siteKey, escape, m) {
  const card = m?.authorCard || {};
  const authorName = String(
    card.authorName || m?.authorName || ""
  ).trim();
  const initials = String(card.initials || "").trim() || authorName.slice(0, 2).toUpperCase();
  const dropInitial = String(
    card.dropInitial || (authorName ? authorName.charAt(0).toUpperCase() : "A")
  );
  return `                <mig_author
                        jcr:primaryType="nt:unstructured"
                        sling:resourceType="${siteKey}/components/meridian-author-card"
                        authorName="${escape(authorName)}"
                        dropInitial="${escape(dropInitial)}"
                        initials="${escape(initials)}"
                        label="Written by"/>`;
}

function renderMeridianSliceXml(siteKey, item, blocks, escape) {
  const m = item.meridian && typeof item.meridian === "object" ? item.meridian : {};
  const hero = {
    title: item.title || "",
    dek: m.dek || "",
    eyebrow: m.eyebrow || "",
    authorName: m.authorName || "",
    image: m.image || "",
    imageAlt: m.imageAlt || "",
    publishDateText: m.publishDateText || "",
    readTime: m.readTime || "",
  };

  const parts = [renderMeridianHero(siteKey, escape, hero)];
  const jumpXml = renderMeridianJumpLinks(siteKey, escape, m.jumpLinks);
  if (jumpXml) parts.push(jumpXml);

  let parIdx = 0;
  let headIdx = 0;
  let quoteIdx = 0;
  let listIdx = 0;
  let callIdx = 0;
  let firstParagraph = true;
  let anyBody = false;
  let imgIdx = 0;

  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;

    if (block.type === "paragraph") {
      anyBody = true;
      parIdx += 1;
      const name = parIdx === 1 ? "mig_par" : `mig_par_${parIdx}`;
      parts.push(
        renderMeridianParagraph(
          siteKey,
          escape,
          name,
          block.html,
          firstParagraph
        )
      );
      firstParagraph = false;
      continue;
    }

    if (block.type === "text") {
      anyBody = true;
      parIdx += 1;
      const name = parIdx === 1 ? "mig_par" : `mig_par_${parIdx}`;
      parts.push(
        renderMeridianParagraph(siteKey, escape, name, block.html, firstParagraph)
      );
      firstParagraph = false;
      continue;
    }

    if (block.type === "heading") {
      anyBody = true;
      headIdx += 1;
      const name = headIdx === 1 ? "mig_head" : `mig_head_${headIdx}`;
      parts.push(renderMeridianHeading(siteKey, escape, name, block));
      continue;
    }

    if (block.type === "quote") {
      anyBody = true;
      quoteIdx += 1;
      const name = quoteIdx === 1 ? "mig_quote" : `mig_quote_${quoteIdx}`;
      parts.push(renderMeridianQuote(siteKey, escape, name, block.text));
      continue;
    }

    if (block.type === "list") {
      anyBody = true;
      listIdx += 1;
      const name = listIdx === 1 ? "mig_list" : `mig_list_${listIdx}`;
      parts.push(renderMeridianList(siteKey, escape, name, block));
      continue;
    }

    if (block.type === "callout") {
      anyBody = true;
      callIdx += 1;
      const name = callIdx === 1 ? "mig_callout" : `mig_callout_${callIdx}`;
      parts.push(renderMeridianCallout(siteKey, escape, name, block));
      continue;
    }

    if (block.type === "image") {
      anyBody = true;
      imgIdx += 1;
      const name = imgIdx === 1 ? "mig_image" : `mig_image_${imgIdx}`;
      parts.push(renderImageComponent(siteKey, name, block, escape));
      continue;
    }

    if (block.type === "accordion") {
      const panels = Array.isArray(block.panels) ? block.panels : [];
      if (panels.length === 0) continue;
      anyBody = true;
      parIdx += 1;
      const name = parIdx === 1 ? "mig_par" : `mig_par_${parIdx}`;
      parts.push(
        renderMeridianParagraph(
          siteKey,
          escape,
          name,
          accordionPanelsToRichHtml(panels),
          firstParagraph
        )
      );
      firstParagraph = false;
      continue;
    }
  }

  if (!anyBody) {
    parts.push(
      renderMeridianParagraph(
        siteKey,
        escape,
        "mig_par",
        "<p></p>",
        false
      )
    );
  }

  parts.push(renderMeridianTags(siteKey, escape, m.tags));
  parts.push(renderMeridianAuthor(siteKey, escape, m));

  return parts.join("\n");
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

  function pushTextHtml(html) {
    textCount += 1;
    const name = textCount === 1 ? "text" : `text_${textCount - 1}`;
    parts.push(renderTextComponent(siteKey, name, html, escape));
  }

  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;

    if (block.type === "text" || block.type === "paragraph") {
      pushTextHtml(block.html ?? "<p></p>");
      continue;
    }

    if (block.type === "heading") {
      const lvl = String(block.level || "h2").toLowerCase();
      const id = String(block.anchorId || "").replace(/"/g, "");
      const inner = escapeHtmlInner(String(block.text || ""));
      pushTextHtml(`<${lvl} id="${escapeHtmlInner(id)}">${inner}</${lvl}>`);
      continue;
    }

    if (block.type === "quote") {
      const inner = escapeHtmlInner(String(block.text || ""));
      pushTextHtml(`<blockquote><p>${inner}</p></blockquote>`);
      continue;
    }

    if (block.type === "list") {
      const tag = block.ordered ? "ol" : "ul";
      const items = Array.isArray(block.items) ? block.items : [];
      const lis = items
        .map((t) => `<li>${escapeHtmlInner(String(t))}</li>`)
        .join("");
      pushTextHtml(`<${tag}>${lis}</${tag}>`);
      continue;
    }

    if (block.type === "callout") {
      const ey = escapeHtmlInner(String(block.eyebrow || ""));
      const body = String(block.bodyHtml || "<p></p>");
      pushTextHtml(
        `<aside><p class="eyebrow">${ey}</p>${body}</aside>`
      );
      continue;
    }

    if (block.type === "image") {
      imageCount += 1;
      const name = imageCount === 1 ? "image" : `image_${imageCount - 1}`;
      parts.push(renderImageComponent(siteKey, name, block, escape));
      continue;
    }

    if (block.type === "accordion") {
      const panels = Array.isArray(block.panels) ? block.panels : [];
      if (panels.length === 0) continue;
      accordionCount += 1;
      const name =
        accordionCount === 1 ? "accordion" : `accordion_${accordionCount - 1}`;
      parts.push(renderAccordionComponent(siteKey, name, panels, escape));
      continue;
    }
  }

  if (parts.length === 0) {
    parts.push(renderTextComponent(siteKey, "text", "<p></p>", escape));
  }

  return parts.join("\n");
}

function resolveBlocks(item) {
  if (Array.isArray(item.aemBlocks) && item.aemBlocks.length > 0) {
    return item.aemBlocks;
  }
  return wpHtmlToAemBlocks(item.content ?? "");
}

function pageXmlFromBlueprint(blueprintXml, item, blocks, aem) {
  let xml = blueprintXml;
  const siteKey = extractSiteKeyFromBlueprint(blueprintXml);
  const blueprintTitle = extractBlueprintJcrTitle(xml);
  const pageTitleEsc = escapeXmlAttr(String(item.title || "").trim());
  xml = xml.replace(
    `jcr:title="${blueprintTitle}"`,
    `jcr:title="${pageTitleEsc}"`
  );

  if (!xml.includes(WP_BODY_MARKER_START) || !xml.includes(WP_BODY_MARKER_END)) {
    throw new Error(
      `Blueprint must contain ${WP_BODY_MARKER_START} and ${WP_BODY_MARKER_END} around the main content container.`
    );
  }

  const bodyXml =
    aem.bodyRenderer === "meridian"
      ? renderMeridianSliceXml(siteKey, item, blocks, escapeXmlAttr)
      : renderBodyXml(siteKey, blocks, escapeXmlAttr);

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
      const xml = pageXmlFromBlueprint(blueprintXml, item, blocks, aem);
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
