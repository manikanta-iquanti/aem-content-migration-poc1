"use strict";

const { parse } = require("node-html-parser");

/**
 * Maps WordPress post HTML into ordered AEM-friendly blocks for package generation.
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
    type: "text",
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

/**
 * @param {string} html
 * @returns {Array<{ type: string, [key: string]: unknown }>}
 */
function wpHtmlToAemBlocks(html) {
  if (!html || typeof html !== "string") {
    return [
      {
        type: "text",
        html: "<p></p>",
      },
    ];
  }

  const root = parse(html, { blockTextElements: { script: true, style: true } });
  const top = childElements(root);
  if (top.length === 0 && meaningfulText(root.text)) {
    return [
      {
        type: "text",
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

    if (tag === "UL" || tag === "OL") {
      out.push({
        type: "text",
        html: trimOuter(node.outerHTML),
        sourceTag: tag.toLowerCase(),
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
      out.push({
        type: "text",
        html: trimOuter(node.outerHTML),
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
      type: "text",
      html: "<p></p>",
    });
  }

  return out;
}

module.exports = { wpHtmlToAemBlocks };
