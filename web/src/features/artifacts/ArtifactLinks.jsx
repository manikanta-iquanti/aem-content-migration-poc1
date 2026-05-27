const ARTIFACTS = [
  {
    name: "wp-to-aem-migration.zip",
    label: "AEM package (ZIP)",
    description: "Install in AEM Package Manager — pages + DAM assets.",
    primary: true,
  },
  {
    name: "migration-bundle.json",
    label: "Migration bundle",
    description: "Normalized JSON used to build the package.",
  },
  {
    name: "asset-manifest.json",
    label: "Asset manifest",
    description: "Per-image download status and DAM paths (after asset migration).",
  },
  {
    name: "posts.json",
    label: "Transformed posts",
    description: "Intermediate output after the transform step.",
  },
];

export function ArtifactLinks() {
  return (
    <section style={section} aria-labelledby="dl-heading">
      <h2 id="dl-heading" style={h2}>
        Downloads
      </h2>
      <p style={lead}>
        Files under <code style={code}>data/transformed/</code> (created after a full migration or
        individual steps).
      </p>
      <ul style={list}>
        {ARTIFACTS.map((a) => (
          <li key={a.name} style={item}>
            <a href={`/api/artifacts/${a.name}`} download style={a.primary ? linkPrimary : link}>
              {a.label}
            </a>
            <span style={desc}> — {a.description}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const section = { marginTop: "1.5rem" };
const h2 = { margin: "0 0 0.5rem", fontSize: "1.1rem" };
const lead = { margin: "0 0 1rem", color: "var(--text-muted)", fontSize: "0.95rem", maxWidth: 720 };
const code = { fontFamily: "var(--mono)", fontSize: "0.85em", background: "var(--surface-2)", padding: "0.1em 0.35em", borderRadius: 4 };
const list = { margin: 0, paddingLeft: "1.1rem", maxWidth: 720 };
const item = { marginBottom: "0.5rem" };
const link = { fontWeight: 600 };
const linkPrimary = { fontWeight: 700, color: "var(--primary)" };
const desc = { color: "var(--text-muted)", fontSize: "0.9rem" };
