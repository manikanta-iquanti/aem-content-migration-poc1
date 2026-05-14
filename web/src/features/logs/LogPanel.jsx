import { useEffect, useRef } from "react";

export function LogPanel({ logs, status, step, exitCode, error, onClear }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const statusLabel =
    status === "idle"
      ? "Ready"
      : status === "running"
        ? "Running…"
        : status === "completed"
          ? `Finished (exit ${exitCode ?? "?"})`
          : `Failed (exit ${exitCode ?? "?"})`;

  return (
    <section
      className="log-panel"
      aria-labelledby="log-heading"
      style={styles.section}
    >
      <div style={styles.toolbar}>
        <h2 id="log-heading" style={styles.h2}>
          Activity log
        </h2>
        <div style={styles.toolbarRight}>
          {step && status === "running" ? (
            <span style={styles.stepBadge} aria-live="polite">
              Step {step.index}/{step.total}: {step.script}
            </span>
          ) : null}
          <span
            className={`status-pill status-${status}`}
            style={{
              ...styles.pill,
              ...(status === "completed" ? styles.pillOk : {}),
              ...(status === "failed" ? styles.pillBad : {}),
              ...(status === "running" ? styles.pillRun : {}),
            }}
            aria-live="polite"
          >
            {statusLabel}
          </span>
          <button
            type="button"
            onClick={onClear}
            style={styles.btnGhost}
          >
            Clear log
          </button>
        </div>
      </div>
      {error ? (
        <div style={styles.alert} role="alert">
          {error}
        </div>
      ) : null}
      <pre style={styles.pre} tabIndex={0} aria-label="Command output">
        {logs.length ? logs.join("\n") : "Output from the selected action will appear here."}
        <span ref={endRef} />
      </pre>
    </section>
  );
}

const styles = {
  section: {
    background: "var(--surface)",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    minHeight: 220,
  },
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    padding: "0.85rem 1rem",
    borderBottom: "1px solid var(--border)",
    background: "var(--surface-2)",
  },
  h2: { margin: 0, fontSize: "1rem", fontWeight: 600 },
  toolbarRight: { display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" },
  stepBadge: {
    fontSize: "0.8rem",
    color: "var(--text-muted)",
    maxWidth: 280,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  pill: {
    fontSize: "0.75rem",
    fontWeight: 600,
    padding: "0.25rem 0.6rem",
    borderRadius: 999,
    background: "var(--border)",
    color: "var(--text-muted)",
  },
  pillOk: { background: "var(--success-soft)", color: "var(--success)" },
  pillBad: { background: "var(--danger-soft)", color: "var(--danger)" },
  pillRun: { background: "var(--primary-soft)", color: "var(--primary)" },
  btnGhost: {
    border: "1px solid var(--border)",
    background: "var(--surface)",
    borderRadius: "var(--radius-sm)",
    padding: "0.35rem 0.75rem",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  alert: {
    margin: "0.75rem 1rem 0",
    padding: "0.65rem 0.85rem",
    borderRadius: "var(--radius-sm)",
    background: "var(--danger-soft)",
    color: "var(--danger)",
    fontSize: "0.9rem",
  },
  pre: {
    margin: 0,
    padding: "1rem",
    flex: 1,
    overflow: "auto",
    maxHeight: 360,
    fontFamily: "var(--mono)",
    fontSize: "0.8rem",
    lineHeight: 1.45,
    background: "#0f172a",
    color: "#e2e8f0",
  },
};
