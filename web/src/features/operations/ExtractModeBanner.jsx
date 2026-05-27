import { useCallback, useEffect, useState } from "react";
import { fetchConfig } from "../../api/client.js";

const MODE_LABELS = {
  "wp-api": "WordPress REST API",
  scrape: "HTML scrape",
  documents: "Local documents (.docx / .pdf)",
};

function modeFromConfig(cfg) {
  const m = cfg?.extract?.mode;
  if (m === "scrape" || m === "documents" || m === "wp-api") return m;
  return "wp-api";
}

/**
 * Shows which extract branch the pipeline (and Extract step) will use.
 */
export function ExtractModeBanner() {
  const [mode, setMode] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const cfg = await fetchConfig();
      setMode(modeFromConfig(cfg));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setMode(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onCfg = () => load();
    globalThis.addEventListener("wp-migration-config-updated", onCfg);
    return () => globalThis.removeEventListener("wp-migration-config-updated", onCfg);
  }, [load]);

  if (error) {
    return (
      <div style={bannerErr} role="status">
        <strong>Extract mode:</strong> could not load config — {error}
      </div>
    );
  }

  if (!mode) {
    return (
      <div style={bannerMuted} role="status">
        <strong>Extract mode:</strong> loading…
      </div>
    );
  }

  const label = MODE_LABELS[mode] || mode;
  return (
    <div style={banner} role="status" aria-live="polite">
      <div style={row}>
        <span style={badge}>{mode}</span>
        <span>
          <strong>Pipeline extract step</strong> uses <strong>{label}</strong>{" "}
          (<code style={code}>extract.mode</code> in <code style={code}>config/config.json</code>).
        </span>
      </div>
      <p style={sub}>
        Scrape and document blocks can both exist in config; only the active mode’s settings are read
        for extract. Switch mode on the Configuration tab.
      </p>
    </div>
  );
}

const banner = {
  marginBottom: "1rem",
  padding: "0.85rem 1rem",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  fontSize: "0.92rem",
  lineHeight: 1.45,
};
const bannerErr = { ...banner, borderColor: "var(--danger)", background: "var(--danger-soft)" };
const bannerMuted = { ...banner, color: "var(--text-muted)" };
const row = { display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "0.5rem" };
const badge = {
  fontSize: "0.72rem",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  background: "var(--primary-soft)",
  color: "var(--primary)",
  padding: "0.2rem 0.5rem",
  borderRadius: 6,
  flexShrink: 0,
};
const code = { fontFamily: "var(--mono)", fontSize: "0.82em" };
const sub = {
  margin: "0.55rem 0 0",
  fontSize: "0.85rem",
  color: "var(--text-muted)",
  maxWidth: 720,
};
