import { useEffect, useMemo, useState } from "react";
import { fetchConfig, saveConfig } from "../../api/client.js";

const EXTRACT_MODES = [
  {
    id: "wp-api",
    label: "WordPress API",
    hint: "Uses source.baseUrl, source credentials, and extract.endpoint / extract.perPage.",
  },
  {
    id: "scrape",
    label: "Scrape",
    hint: "Uses extract.scrape (urls, discoverIndexUrl, layout, timeoutMs, etc.). Ignores extract.documents for the extract step.",
  },
  {
    id: "documents",
    label: "Documents",
    hint: "Uses extract.documents (globs, linkBaseUrl). Scrape URLs are ignored for the extract step.",
  },
];

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function dispatchConfigUpdated() {
  globalThis.dispatchEvent(new CustomEvent("wp-migration-config-updated"));
}

export function ConfigEditor() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const parsed = useMemo(() => safeParse(text), [text]);
  const jsonInvalid = text.trim().length > 0 && parsed === null;
  const currentMode =
    parsed?.extract?.mode === "scrape" || parsed?.extract?.mode === "documents"
      ? parsed.extract.mode
      : "wp-api";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const cfg = await fetchConfig();
        if (!cancelled) {
          setText(JSON.stringify(cfg, null, 2));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setExtractMode = (mode) => {
    const o = safeParse(text);
    if (!o || typeof o !== "object") return;
    o.extract = typeof o.extract === "object" && o.extract !== null ? o.extract : {};
    o.extract.mode = mode;
    setText(JSON.stringify(o, null, 2));
    setMessage(null);
    setError(null);
  };

  const format = () => {
    setError(null);
    setMessage(null);
    try {
      const obj = JSON.parse(text);
      setText(JSON.stringify(obj, null, 2));
      setMessage("Formatted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const save = async () => {
    setError(null);
    setMessage(null);
    let parsedSave;
    try {
      parsedSave = JSON.parse(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
      return;
    }
    if (typeof parsedSave !== "object" || parsedSave === null || Array.isArray(parsedSave)) {
      setError("Config must be a JSON object.");
      return;
    }
    setSaving(true);
    try {
      await saveConfig(parsedSave);
      setMessage("Saved. Empty application passwords keep the previous value on the server.");
      dispatchConfigUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const activeHint = EXTRACT_MODES.find((m) => m.id === currentMode)?.hint || "";

  return (
    <section
      style={wrap}
      aria-labelledby="config-heading"
    >
      <h2 id="config-heading" style={h2}>
        Configuration
      </h2>
      <p style={hint}>
        One file: <code style={code}>config/config.json</code>. Leave application password fields empty
        to keep existing secrets. Use <strong>Format JSON</strong> before save if you like.
      </p>

      <div style={modePanel} aria-labelledby="extract-mode-heading">
        <h3 id="extract-mode-heading" style={h3}>
          Extract mode (for pipeline + Extract)
        </h3>
        <p style={modeLead}>
          Only <code style={code}>extract.mode</code> decides what runs. Other blocks can stay in the
          file for when you switch — they are not deleted when you change mode.
        </p>
        <div style={modeRow} role="radiogroup" aria-label="Extract mode">
          {EXTRACT_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={jsonInvalid || saving || loading}
              onClick={() => setExtractMode(m.id)}
              style={{
                ...modeBtn,
                ...(currentMode === m.id ? modeBtnActive : {}),
              }}
              aria-pressed={currentMode === m.id}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p style={modeHint} role="note">
          <strong>Active:</strong> {activeHint}
        </p>
        <details style={details}>
          <summary style={summary}>Field reference by mode</summary>
          <ul style={ul}>
            <li>
              <strong>wp-api</strong> — <code style={code}>source.baseUrl</code>,{" "}
              <code style={code}>extract.endpoint</code>, <code style={code}>extract.perPage</code> (optional),
              REST credentials under <code style={code}>source</code>.
            </li>
            <li>
              <strong>scrape</strong> — <code style={code}>extract.scrape.urls</code>,{" "}
              <code style={code}>extract.scrape.discoverIndexUrl</code>,{" "}
              <code style={code}>extract.scrape.layout</code>, <code style={code}>timeoutMs</code>, optional{" "}
              <code style={code}>contentSelector</code>.
            </li>
            <li>
              <strong>documents</strong> — <code style={code}>extract.documents.globs</code>, optional{" "}
              <code style={code}>extract.documents.linkBaseUrl</code> (falls back to{" "}
              <code style={code}>source.baseUrl</code>).
            </li>
          </ul>
        </details>
      </div>

      {loading ? (
        <p style={muted}>Loading…</p>
      ) : (
        <>
          <label htmlFor="config-json" className="sr-only">
            Config JSON
          </label>
          <textarea
            id="config-json"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            style={textarea}
            rows={18}
            aria-describedby="config-help"
          />
          <p id="config-help" style={muted}>
            Full JSON below — same structure the Node scripts read. Use the mode buttons above to set{" "}
            <code style={code}>extract.mode</code> without hand-editing.
          </p>
          <div style={actions}>
            <button type="button" onClick={format} disabled={saving} style={btnSecondary}>
              Format JSON
            </button>
            <button type="button" onClick={save} disabled={saving} style={btnPrimary}>
              {saving ? "Saving…" : "Save config"}
            </button>
          </div>
        </>
      )}
      {message ? (
        <p style={ok} role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p style={bad} role="alert">
          {error}
        </p>
      ) : null}
      {jsonInvalid ? (
        <p style={bad} role="alert">
          Fix JSON syntax to use extract mode buttons.
        </p>
      ) : null}
    </section>
  );
}

const wrap = { marginTop: "1.5rem" };
const h2 = { margin: "0 0 0.5rem", fontSize: "1.1rem" };
const h3 = { margin: "0 0 0.35rem", fontSize: "1rem", fontWeight: 700 };
const hint = { margin: "0 0 1rem", color: "var(--text-muted)", fontSize: "0.95rem", maxWidth: 720 };
const code = { fontFamily: "var(--mono)", fontSize: "0.85em", background: "var(--surface-2)", padding: "0.1em 0.35em", borderRadius: 4 };
const modePanel = {
  marginBottom: "1.25rem",
  padding: "1rem 1.1rem",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  maxWidth: 720,
};
const modeLead = { margin: "0 0 0.75rem", fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.45 };
const modeRow = { display: "flex", flexWrap: "wrap", gap: "0.45rem" };
const modeBtn = {
  border: "1px solid var(--border)",
  background: "var(--surface-2)",
  color: "var(--text)",
  borderRadius: "var(--radius-sm)",
  padding: "0.45rem 0.85rem",
  fontWeight: 600,
  fontSize: "0.88rem",
  cursor: "pointer",
};
const modeBtnActive = {
  background: "var(--primary)",
  color: "#fff",
  borderColor: "var(--primary)",
};
const modeHint = { margin: "0.65rem 0 0", fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.45 };
const details = { marginTop: "0.75rem", fontSize: "0.88rem", color: "var(--text-muted)" };
const summary = { cursor: "pointer", fontWeight: 600, color: "var(--text)" };
const ul = { margin: "0.5rem 0 0", paddingLeft: "1.2rem", lineHeight: 1.5 };
const textarea = {
  width: "100%",
  fontFamily: "var(--mono)",
  fontSize: "0.85rem",
  padding: "0.85rem",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border)",
  resize: "vertical",
  minHeight: 320,
};
const actions = { display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" };
const btnPrimary = {
  background: "var(--primary)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "0.5rem 1rem",
  fontWeight: 600,
  cursor: "pointer",
};
const btnSecondary = {
  background: "var(--surface)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "0.5rem 1rem",
  fontWeight: 600,
  cursor: "pointer",
};
const muted = { color: "var(--text-muted)", fontSize: "0.9rem" };
const ok = { color: "var(--success)", fontWeight: 500 };
const bad = { color: "var(--danger)", fontWeight: 500 };
