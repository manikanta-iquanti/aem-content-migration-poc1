import { useState } from "react";

export function DocumentExtractForm({ onRun, disabled }) {
  const [globsText, setGlobsText] = useState("");
  const [filesText, setFilesText] = useState("");
  const [linkBase, setLinkBase] = useState("");

  const submit = (e) => {
    e.preventDefault();
    onRun({
      globsText,
      filesText,
      linkBase: linkBase.trim(),
    });
  };

  return (
    <form onSubmit={submit} style={form}>
      <p style={help}>
        Optional overrides for one run. Leave everything blank to use{" "}
        <code style={code}>extract.documents</code> from config (defaults include{" "}
        <code style={code}>data/sample-documents/**</code>).
      </p>
      <label style={label} htmlFor="doc-globs">
        Glob patterns (one per line)
      </label>
      <textarea
        id="doc-globs"
        value={globsText}
        onChange={(e) => setGlobsText(e.target.value)}
        rows={3}
        placeholder={"data/sample-documents/**/*.docx"}
        disabled={disabled}
        style={textarea}
      />
      <label style={label} htmlFor="doc-files">
        Explicit file paths (one per line, relative to repo root or absolute)
      </label>
      <textarea
        id="doc-files"
        value={filesText}
        onChange={(e) => setFilesText(e.target.value)}
        rows={3}
        placeholder={"data/sample-documents/lisbon-tram-notes.docx"}
        disabled={disabled}
        style={textarea}
      />
      <label style={label} htmlFor="doc-link-base">
        Link base URL (optional, for synthetic article URLs)
      </label>
      <input
        id="doc-link-base"
        type="url"
        value={linkBase}
        onChange={(e) => setLinkBase(e.target.value)}
        placeholder="http://localhost:8081"
        disabled={disabled}
        style={input}
      />
      <button type="submit" disabled={disabled} style={btn}>
        Run document extract
      </button>
    </form>
  );
}

const form = { display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" };
const help = { margin: "0 0 0.25rem", fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.45 };
const label = { fontWeight: 600, fontSize: "0.85rem", marginTop: "0.25rem" };
const code = { fontFamily: "var(--mono)", fontSize: "0.82em" };
const textarea = {
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "0.5rem 0.65rem",
  resize: "vertical",
  minHeight: 72,
};
const input = {
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "0.5rem 0.65rem",
};
const btn = {
  alignSelf: "flex-start",
  marginTop: "0.35rem",
  background: "var(--primary)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "0.5rem 1rem",
  fontWeight: 600,
  cursor: "pointer",
};
