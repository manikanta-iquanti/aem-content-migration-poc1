"use strict";

/**
 * When PDF text is one line per "paragraph", a heading and its following sentence
 * can land on the same line: "## Bridges ... Cross the ...". Split on first TitleCase
 * word that starts a new sentence after a multi-word heading.
 * @param {string} line
 * @returns {string[]}
 */
function splitMergedHeadingLine(line) {
  const t = line.trim();
  if (!t.startsWith("## ")) return [line];
  const rest = t.slice(3).trim();
  const words = rest.split(/\s+/);
  if (words.length < 4) return [line];
  for (let i = 2; i < words.length; i++) {
    const w = words[i];
    if (!/^[A-Z][a-z]+$/.test(w)) continue;
    const prev = words[i - 1];
    if (!prev || !/^[a-z]/.test(prev)) continue;
    const head = words.slice(0, i).join(" ");
    const body = words.slice(i).join(" ");
    return [`## ${head}`, body];
  }
  return [line];
}

module.exports = { splitMergedHeadingLine };
