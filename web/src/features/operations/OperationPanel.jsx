/**
 * @typedef {{ id: string, label: string, description: string, kind: string, group?: string, step?: number }} OpMeta
 */

const SECTIONS = [
  {
    id: "primary",
    title: "Recommended",
    lead: "One click: extract content, prepare the bundle, migrate images to DAM, and build the AEM package ZIP.",
  },
  {
    id: "steps",
    title: "Step by step",
    lead: "Run individual stages when debugging. Use the same order as the full migration (1 → 4).",
  },
  {
    id: "advanced",
    title: "Advanced / debug",
    lead: "Optional utilities. Not required for a normal migration.",
  },
];

/**
 * @param {OpMeta} op
 * @param {boolean} busy
 * @param {(id: string, payload?: Record<string, unknown>) => void} onRun
 */
function OperationCard({ op, busy, onRun, featured }) {
  return (
    <article
      style={{
        ...card,
        ...(featured ? cardFeatured : {}),
      }}
    >
      <div style={cardHead}>
        <h3 style={h3}>{op.label}</h3>
        {featured ? <span style={badgePrimary}>Start here</span> : null}
        {op.kind === "sequence" && !featured ? (
          <span style={badge}>Multi-step</span>
        ) : null}
      </div>
      <p style={desc}>{op.description}</p>
      <button
        type="button"
        style={featured ? btnFeatured : btn}
        disabled={busy}
        onClick={() => onRun(op.id, {})}
        aria-busy={busy}
      >
        {featured ? "Run full migration" : "Run"}
      </button>
    </article>
  );
}

/**
 * @param {{ operations: OpMeta[], onRun: (id: string, payload?: Record<string, unknown>) => void, busy: boolean }} props
 */
export function OperationPanel({ operations, onRun, busy }) {
  const byGroup = (group) =>
    operations
      .filter((op) => (op.group || "steps") === group)
      .sort((a, b) => (a.step || 0) - (b.step || 0));

  return (
    <div style={sections}>
      {SECTIONS.map((section) => {
        const ops = byGroup(section.id);
        if (ops.length === 0) return null;
        const isPrimary = section.id === "primary";
        return (
          <section key={section.id} style={sectionWrap} aria-labelledby={`ops-${section.id}`}>
            <h2 id={`ops-${section.id}`} style={sectionTitle}>
              {section.title}
            </h2>
            <p style={sectionLead}>{section.lead}</p>
            <div style={isPrimary ? gridPrimary : grid}>
              {ops.map((op) => (
                <OperationCard
                  key={op.id}
                  op={op}
                  busy={busy}
                  onRun={onRun}
                  featured={isPrimary}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

const sections = { display: "flex", flexDirection: "column", gap: "2rem" };
const sectionWrap = { margin: 0 };
const sectionTitle = { margin: "0 0 0.35rem", fontSize: "1.15rem", fontWeight: 700 };
const sectionLead = {
  margin: "0 0 1rem",
  fontSize: "0.92rem",
  color: "var(--text-muted)",
  maxWidth: 720,
  lineHeight: 1.45,
};
const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: "1rem",
};
const gridPrimary = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "1rem",
  maxWidth: 560,
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
const cardFeatured = {
  borderColor: "var(--primary)",
  boxShadow: "0 0 0 1px var(--primary-soft), var(--shadow)",
  background: "linear-gradient(180deg, var(--surface) 0%, var(--primary-soft) 120%)",
};
const cardHead = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.5rem",
  flexWrap: "wrap",
};
const h3 = { margin: 0, fontSize: "1.05rem", fontWeight: 700 };
const badgePrimary = {
  fontSize: "0.7rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  background: "var(--primary)",
  color: "#fff",
  padding: "0.2rem 0.5rem",
  borderRadius: 6,
  flexShrink: 0,
};
const badge = {
  fontSize: "0.7rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  background: "var(--surface-2)",
  color: "var(--text-muted)",
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
  background: "var(--surface-2)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "0.5rem 1.1rem",
  fontWeight: 600,
  cursor: "pointer",
};
const btnFeatured = {
  marginTop: "1rem",
  alignSelf: "flex-start",
  background: "var(--primary)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "0.6rem 1.25rem",
  fontWeight: 700,
  fontSize: "1rem",
  cursor: "pointer",
};
