"use strict";

const { parse } = require("node-html-parser");

/**
 * Maps post HTML into ordered AEM-friendly blocks for package generation.
 * Unknown / wrapper-heavy markup falls back to a single rich-text fragment (text component).
 */

function isElement(node) {
  return node && node.nodeType === 1 && typeof node.tagName === "string";
}

function meaningfulText(text) {
  return typeof text === "string" && text.replace(/\s+/g, "").length > 0;
}

function trimOuter(html) {
  return String(html || "").trim();
}

function childElements(node) {
  if (!node?.childNodes) return [];
  return node.childNodes.filter((c) => isElement(c));
}

function firstImg(el) {
  if (!isElement(el)) return null;
  if (el.tagName === "IMG") return el;
  const img = el.querySelector?.("img");
  return img || null;
}

function parseDetails(detailsEl) {
  const summaries = detailsEl.querySelectorAll?.("summary") || [];
  let panelTitle = "Section";
  let inner = detailsEl.innerHTML || "";
  if (summaries.length) {
    const s = summaries[0];
    panelTitle = trimOuter(s.innerHTML) || panelTitle;
    inner = inner.replace(s.outerHTML, "");
  }
  const bodyHtml = trimOuter(inner);
  return { panelTitle, bodyHtml };
}

function classifyFigure(figure) {
  const img = firstImg(figure);
  if (img && img.getAttribute("src")) {
    return {
      type: "image",
      src: img.getAttribute("src"),
      alt: img.getAttribute("alt") || "",
    };
  }
  return {
    type: "text",
    html: trimOuter(figure.outerHTML),
  };
}

function flushParagraphBuffer(buf, out) {
  if (!buf.length) return;
  const inner = buf.join("");
  out.push({
    type: "paragraph",
    html: inner.includes("<")
      ? inner
      : `<p>${escapeHtml(inner)}</p>`,
  });
  buf.length = 0;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripTagsToText(html) {
  return String(html || "")
    .replaceAll(/<[^>]+>/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function isCalloutAside(node) {
  if (!isElement(node) || node.tagName !== "ASIDE") return false;
  const cls = node.getAttribute("class") || "";
  return cls.includes("border-l") || cls.includes("border-accent");
}

function parseCalloutAside(aside) {
  const directPs = childElements(aside).filter((c) => c.tagName === "P");
  let eyebrow = "";
  let bodyHtml = "<p></p>";
  if (directPs.length >= 2) {
    const e0 = directPs[0].getAttribute("class") || "";
    if (e0.includes("uppercase") || e0.includes("tracking")) {
      eyebrow = stripTagsToText(directPs[0].innerHTML);
      bodyHtml = directPs
        .slice(1)
        .map((p) => trimOuter(p.outerHTML))
        .join("") || "<p></p>";
    } else {
      bodyHtml = directPs.map((p) => trimOuter(p.outerHTML)).join("");
    }
  } else if (directPs.length === 1) {
    bodyHtml = trimOuter(directPs[0].outerHTML);
  } else {
    bodyHtml = trimOuter(aside.innerHTML) || "<p></p>";
  }
  const initialSource = eyebrow || stripTagsToText(bodyHtml);
  const initial =
    initialSource && initialSource.length
      ? initialSource.charAt(0).toUpperCase()
      : "N";
  return { eyebrow, bodyHtml, initial };
}

function parseListItems(listEl) {
  const items = [];
  const lis = listEl.querySelectorAll?.("li") || [];
  for (const li of lis) {
    const t = stripTagsToText(li.innerHTML);
    if (t) items.push(t);
  }
  return items;
}

/**
 * @param {string} html
 * @returns {Array<{ type: string, [key: string]: unknown }>}
 */
function wpHtmlToAemBlocks(html) {
  if (!html || typeof html !== "string") {
    return [
      {
        type: "paragraph",
        html: "<p></p>",
      },
    ];
  }

  const root = parse(html, { blockTextElements: { script: true, style: true } });
  const top = childElements(root);
  if (top.length === 0 && meaningfulText(root.text)) {
    return [
      {
        type: "paragraph",
        html: `<p>${escapeHtml(trimOuter(root.text))}</p>`,
      },
    ];
  }

  const out = [];
  const paragraphBuf = [];
  let i = 0;

  while (i < top.length) {
    const node = top[i];

    if (!isElement(node)) {
      const t = node.text;
      if (meaningfulText(t)) paragraphBuf.push(trimOuter(t));
      i++;
      continue;
    }

    const tag = node.tagName;

    if (tag === "P") {
      paragraphBuf.push(trimOuter(node.outerHTML));
      i++;
      continue;
    }

    flushParagraphBuffer(paragraphBuf, out);

    if (tag === "DETAILS") {
      const panels = [];
      while (i < top.length && isElement(top[i]) && top[i].tagName === "DETAILS") {
        panels.push(parseDetails(top[i]));
        i++;
      }
      out.push({ type: "accordion", panels });
      continue;
    }

    if (tag === "BLOCKQUOTE") {
      const quoteText = stripTagsToText(node.innerHTML) || stripTagsToText(node.text);
      if (quoteText) {
        out.push({ type: "quote", text: quoteText });
      }
      i++;
      continue;
    }

    if (tag === "ASIDE" && isCalloutAside(node)) {
      const c = parseCalloutAside(node);
      out.push({
        type: "callout",
        eyebrow: c.eyebrow,
        bodyHtml: c.bodyHtml,
        initial: c.initial,
      });
      i++;
      continue;
    }

    if (tag === "UL" || tag === "OL") {
      const items = parseListItems(node);
      out.push({
        type: "list",
        ordered: tag === "OL",
        items,
      });
      i++;
      continue;
    }

    if (tag === "IMG") {
      const src = node.getAttribute("src");
      if (src) {
        out.push({
          type: "image",
          src,
          alt: node.getAttribute("alt") || "",
        });
      }
      i++;
      continue;
    }

    if (tag === "FIGURE") {
      const block = classifyFigure(node);
      out.push(block);
      i++;
      continue;
    }

    if (/^H[1-6]$/.test(tag)) {
      const level = tag.toLowerCase();
      const idFromDom = (node.getAttribute("id") || "").trim();
      let slug = stripTagsToText(node.innerHTML)
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "-");
      slug = slug.replace(/^-+/, "").replace(/-+$/, "");
      const anchorId =
        idFromDom ||
        slug ||
        `heading-${out.length + 1}`;
      const text = stripTagsToText(node.innerHTML) || stripTagsToText(node.text);
      out.push({
        type: "heading",
        level,
        text,
        anchorId,
      });
      i++;
      continue;
    }

    const innerImg = firstImg(node);
    if (innerImg && innerImg.getAttribute("src")) {
      const imgs = node.querySelectorAll?.("img") || [];
      if (imgs.length === 1) {
        out.push({
          type: "image",
          src: innerImg.getAttribute("src"),
          alt: innerImg.getAttribute("alt") || "",
        });
        i++;
        continue;
      }
    }

    out.push({
      type: "text",
      html: trimOuter(node.outerHTML),
    });
    i++;
  }

  flushParagraphBuffer(paragraphBuf, out);

  if (out.length === 0) {
    out.push({
      type: "paragraph",
      html: "<p></p>",
    });
  }

  return out;
}

module.exports = { wpHtmlToAemBlocks };
