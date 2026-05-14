import { useState } from "react";

export function ScrapeExtractForm({ onRun, disabled }) {
  const [urlsText, setUrlsText] = useState("");
  const [discover, setDiscover] = useState("");
  const [selector, setSelector] = useState("");

  const submit = (e) => {
    e.preventDefault();
    onRun({
      urlsText,
      discover: discover.trim(),
      selector: selector.trim(),
    });
  };

  return (
    <form onSubmit={submit} style={form}>
      <p style={help}>
        Optional overrides for one run. Config still supplies layout, timeouts, and defaults. You
        need <strong>either</strong> URLs <strong>or</strong> a discover listing URL.
      </p>
      <label style={label} htmlFor="scrape-urls">
        Article URLs (one per line)
      </label>
      <textarea
        id="scrape-urls"
        value={urlsText}
        onChange={(e) => setUrlsText(e.target.value)}
        rows={4}
        placeholder={"https://example.com/post-a\nhttp://localhost:8080/post-b"}
        disabled={disabled}
        style={textarea}
      />
      <label style={label} htmlFor="scrape-discover">
        Discover from listing page
      </label>
      <input
        id="scrape-discover"
        type="url"
        value={discover}
        onChange={(e) => setDiscover(e.target.value)}
        placeholder="http://localhost:8081/articles"
        disabled={disabled}
        style={input}
      />
      <label style={label} htmlFor="scrape-selector">
        Content selector (generic layout only)
      </label>
      <input
        id="scrape-selector"
        type="text"
        value={selector}
        onChange={(e) => setSelector(e.target.value)}
        placeholder=".entry-content"
        disabled={disabled}
        style={input}
      />
      <button type="submit" disabled={disabled} style={btn}>
        Run scrape extract
      </button>
    </form>
  );
}

const form = { display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" };
const help = { margin: "0 0 0.25rem", fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.45 };
const label = { fontWeight: 600, fontSize: "0.85rem", marginTop: "0.25rem" };
const textarea = {
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "0.5rem 0.65rem",
  resize: "vertical",
  minHeight: 88,
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
