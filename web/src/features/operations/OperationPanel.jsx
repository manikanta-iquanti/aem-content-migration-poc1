import { ScrapeExtractForm } from "./ScrapeExtractForm.jsx";
import { DocumentExtractForm } from "./DocumentExtractForm.jsx";

/**
 * @typedef {{ id: string, label: string, description: string, kind: string, customForm?: boolean }} OpMeta
 */

/**
 * @param {OpMeta} op
 * @param {boolean} busy
 * @param {(id: string, payload?: Record<string, unknown>) => void} onRun
 */
function renderOperationAction(op, busy, onRun) {
  if (op.customForm && op.id === "extract-scrape") {
    return <ScrapeExtractForm disabled={busy} onRun={(payload) => onRun(op.id, payload)} />;
  }
  if (op.customForm && op.id === "extract-documents") {
    return <DocumentExtractForm disabled={busy} onRun={(payload) => onRun(op.id, payload)} />;
  }
  return (
    <button
      type="button"
      style={btn}
      disabled={busy}
      onClick={() => onRun(op.id, {})}
      aria-busy={busy}
    >
      Run
    </button>
  );
}

/**
 * @param {{ operations: OpMeta[], onRun: (id: string, payload?: Record<string, unknown>) => void, busy: boolean }} props
 */
export function OperationPanel({ operations, onRun, busy }) {
  return (
    <div style={grid}>
      {operations.map((op) => (
        <article key={op.id} style={card}>
          <div style={cardHead}>
            <h3 style={h3}>{op.label}</h3>
            {op.id === "pipeline" ? (
              <span style={badge}>Recommended</span>
            ) : null}
          </div>
          <p style={desc}>{op.description}</p>
          {renderOperationAction(op, busy, onRun)}
        </article>
      ))}
    </div>
  );
}

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "1rem",
};

const card = {
  background: "var(--surface)",
  borderRadius: "var(--radius)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
  padding: "1.1rem 1.15rem",
  display: "flex",
  flexDirection: "column",
};

const cardHead = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.5rem",
};

const h3 = { margin: 0, fontSize: "1.05rem", fontWeight: 700 };

const badge = {
  fontSize: "0.7rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  background: "var(--primary-soft)",
  color: "var(--primary)",
  padding: "0.2rem 0.45rem",
  borderRadius: 6,
  flexShrink: 0,
};

const desc = {
  margin: "0.5rem 0 0",
  fontSize: "0.9rem",
  color: "var(--text-muted)",
  flex: 1,
  lineHeight: 1.45,
};

const btn = {
  marginTop: "1rem",
  alignSelf: "flex-start",
  background: "var(--primary)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "0.5rem 1.1rem",
  fontWeight: 600,
  cursor: "pointer",
};
