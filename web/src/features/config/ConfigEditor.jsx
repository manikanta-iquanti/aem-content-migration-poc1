import { useEffect, useState } from "react";
import { fetchConfig, saveConfig } from "../../api/client.js";

export function ConfigEditor() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

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
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
      return;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      setError("Config must be a JSON object.");
      return;
    }
    setSaving(true);
    try {
      await saveConfig(parsed);
      setMessage("Saved. Empty application passwords keep the previous value on the server.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      style={wrap}
      aria-labelledby="config-heading"
    >
      <h2 id="config-heading" style={h2}>
        Configuration
      </h2>
      <p style={hint}>
        Edit <code style={code}>config/config.json</code>. Leave application password fields empty
        to keep existing secrets. Use <strong>Format JSON</strong> before save if you like.
      </p>
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
            Source, destination, extract mode, scrape options, and AEM paths live here — same as
            when you edit the file in your editor.
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
    </section>
  );
}

const wrap = { marginTop: "1.5rem" };
const h2 = { margin: "0 0 0.5rem", fontSize: "1.1rem" };
const hint = { margin: "0 0 1rem", color: "var(--text-muted)", fontSize: "0.95rem", maxWidth: 720 };
const code = { fontFamily: "var(--mono)", fontSize: "0.85em", background: "var(--surface-2)", padding: "0.1em 0.35em", borderRadius: 4 };
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
