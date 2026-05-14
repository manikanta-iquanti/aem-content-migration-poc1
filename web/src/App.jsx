import { useEffect, useState } from "react";
import { fetchOperations } from "./api/client.js";
import { useJobStream } from "./hooks/useJobStream.js";
import { OperationPanel } from "./features/operations/OperationPanel.jsx";
import { ConfigEditor } from "./features/config/ConfigEditor.jsx";
import { ArtifactLinks } from "./features/artifacts/ArtifactLinks.jsx";
import { LogPanel } from "./features/logs/LogPanel.jsx";

const TABS = [
  { id: "operations", label: "Operations" },
  { id: "config", label: "Configuration" },
  { id: "downloads", label: "Downloads" },
];

export default function App() {
  const [tab, setTab] = useState("operations");
  const [operations, setOperations] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const { logs, status, step, exitCode, error, busy, run, clear } = useJobStream();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchOperations();
        if (!cancelled) setOperations(data.operations || []);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={layout.page}>
      <header style={layout.header}>
        <div>
          <h1 style={layout.title}>WordPress migration</h1>
          <p style={layout.subtitle}>
            Run the same scripts as the terminal, with live logs. The API listens on{" "}
            <strong>127.0.0.1</strong> only.
          </p>
        </div>
        <p style={layout.planNote}>
          <strong>Plan:</strong> <code style={layout.code}>CONTROL_UI_PLAN.md</code> at the repo
          root describes how to extend this UI.
        </p>
      </header>

      <nav style={layout.nav} aria-label="Primary">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              ...layout.tab,
              ...(tab === t.id ? layout.tabActive : {}),
            }}
            aria-current={tab === t.id ? "page" : undefined}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main style={layout.main}>
        {loadError ? (
          <div style={layout.banner} role="alert">
            <strong>Could not load operations.</strong> Is the control server running on port 3847?
            From the repo root run{" "}
            <code style={layout.code}>npm run dev:ui</code> (after{" "}
            <code style={layout.code}>npm run install:ui</code>). — {loadError}
          </div>
        ) : null}

        {tab === "operations" ? (
          <>
            <p style={layout.lead}>
              Start with <strong>Full pipeline</strong> unless you are debugging a single step.
              Use <strong>Extract (scrape only)</strong> when you want ad-hoc URLs without editing
              config.
            </p>
            <OperationPanel operations={operations} onRun={run} busy={busy} />
          </>
        ) : null}
        {tab === "config" ? <ConfigEditor /> : null}
        {tab === "downloads" ? <ArtifactLinks /> : null}

        <LogPanel
          logs={logs}
          status={status}
          step={step}
          exitCode={exitCode}
          error={error}
          onClear={clear}
        />
      </main>

      <footer style={layout.footer}>
        <span>
          Optional UI — core workflow remains <code style={layout.code}>npm run extract</code>{" "}
          etc. See README and CONTROL_UI_PLAN.md.
        </span>
      </footer>
    </div>
  );
}

const layout = {
  page: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "1.25rem 1rem 2rem",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "1rem",
    marginBottom: "1.25rem",
  },
  title: { margin: 0, fontSize: "clamp(1.35rem, 2.5vw, 1.75rem)", fontWeight: 700 },
  subtitle: {
    margin: "0.35rem 0 0",
    color: "var(--text-muted)",
    fontSize: "0.95rem",
    maxWidth: 640,
  },
  planNote: {
    fontSize: "0.88rem",
    color: "var(--text-muted)",
    margin: 0,
    alignSelf: "center",
    maxWidth: 280,
  },
  nav: {
    display: "flex",
    gap: "0.35rem",
    flexWrap: "wrap",
    marginBottom: "1.25rem",
  },
  tab: {
    border: "1px solid var(--border)",
    background: "var(--surface)",
    padding: "0.45rem 1rem",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.9rem",
    color: "var(--text-muted)",
  },
  tabActive: {
    background: "var(--primary)",
    color: "#fff",
    borderColor: "var(--primary)",
  },
  main: { flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" },
  lead: {
    margin: "0 0 1rem",
    fontSize: "0.95rem",
    color: "var(--text-muted)",
    maxWidth: 720,
  },
  banner: {
    padding: "0.85rem 1rem",
    borderRadius: "var(--radius-sm)",
    background: "var(--danger-soft)",
    color: "var(--danger)",
    fontSize: "0.9rem",
    marginBottom: "0.75rem",
  },
  code: { fontFamily: "var(--mono)", fontSize: "0.85em" },
  footer: {
    marginTop: "1.5rem",
    paddingTop: "1rem",
    borderTop: "1px solid var(--border)",
    fontSize: "0.8rem",
    color: "var(--text-muted)",
  },
};
