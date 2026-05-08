# WordPress content migration (POC)

## What this project does

Pulls content from a source site (WordPress REST API **or scraped page URLs**), normalizes it to JSON, and builds `migration-bundle.json`. From that bundle you can:

- **Migrate to another WordPress** (REST publish), or  
- **Build an AEM content package** (no HTTP call to AEM; you install the zip yourself).

Both paths share the same first three steps (extract → transform → generate).

---

## Shared pipeline (always run this first)

These commands produce `data/transformed/migration-bundle.json`, which both WordPress publish and AEM package build consume.

| Step | Command | Output |
|------|---------|--------|
| 1 | `npm run extract` | `data/raw/posts.json` |
| 2 | `npm run transform` | `data/transformed/posts.json` |
| 3 | `npm run generate` | `data/transformed/migration-bundle.json` |

Or one shot:

```bash
npm run pipeline
```

**Setup once:** `npm install` (Node.js 18+). Edit `config/config.json` for the source:
- **WordPress API mode** (default): set `extract.mode` to `"wp-api"` and configure `source.baseUrl`, `source.username`, `source.applicationPassword` (if private).
- **Scrape mode**: set `extract.mode` to `"scrape"` and set `extract.scrape.urls` to one or more URLs (supports `https://...` and localhost URLs like `http://aaa.local/page` or `http://localhost:8080/page`).

For ad-hoc scraping without changing config, use:

```bash
npm run extract:scrape -- --url https://example.com/post-a --url http://localhost:8080/post-b
```

Optional selector override:

```bash
npm run extract:scrape -- --url https://example.com/post-a --selector ".entry-content"
```

---

## Path 1 — Migrate to another WordPress site

### What runs in the terminal (automated)

| Step | Command | What it does |
|------|---------|----------------|
| 4 | `npm run publish` | Sends each bundle item to **destination** WordPress via `POST …/wp-json/wp/v2/posts`. |

Runs only **after** the shared pipeline so `migration-bundle.json` exists.

### What you do by hand (manual)

**Before publishing**

1. In `config/config.json`, set **`destination.baseUrl`** to the target WordPress site (no trailing slash issues handled in code).
2. Create a **WordPress Application Password** for a user on the **destination** site that is allowed to create posts.
3. Put **`destination.username`** and **`destination.applicationPassword`** in config.  
   - If you leave credentials empty, `publish` **does not POST**; it only prints what it would create (dry run).

**On the destination WordPress (outside this repo)**

4. Ensure the **REST API** is reachable and nothing blocks authenticated post creation (security plugins, firewalls).
5. After a successful publish, **open WP Admin → Posts** on the destination and confirm drafts/posts. Adjust status, categories, or SEO plugins there if your workflow needs it.

This POC does **not** upload media or rewrite internal links automatically.

---

## Path 2 — Migrate to Adobe Experience Manager (AEM 6.5)

### What runs in the terminal (automated)

| Step | Command | What it does |
|------|---------|----------------|
| 4 | `npm run build:aem-package` | Reads `migration-bundle.json` and the **blueprint** XML under `data/aem-node-context/`, writes `data/transformed/wp-to-aem-migration.zip`. |

Runs only **after** the shared pipeline. Nothing in this step calls your AEM server.

### What you do by hand (manual)

**One-time blueprint (when you change your AEM page structure)**

1. On **AEM Author**, create or pick the page whose layout should be copied for every migrated post (same template/components as your export).
2. Export that page (or install your dev package) so the repo contains `data/aem-node-context/` with `jcr_root/.../article/.content.xml` (or whatever path you configure).
3. If you change the sample title or body text in that blueprint file, update the constants at the top of **`scripts/build-aem-package.js`** so they match the strings in the XML (`BLUEPRINT_*`).

**Before each package build**

4. Optionally adjust the **`aem`** section in **`config/config.json`** (`parentJcrPath`, `blueprintPath`, `outputZip`, etc.).

**On AEM Author (outside this repo)**

5. Open **Tools → Deployment → Packages** (or `/crx/packmgr` on your author).
6. **Upload** `data/transformed/wp-to-aem-migration.zip`, then **Install** it.
7. Open **Sites** and browse to the language root you configured (e.g. `/content/my-aem-site53/us/en`). New pages appear as **sibling** folders named by slug.
8. Open pages in the editor to verify; fix **text policies / RTE** if HTML is stripped, fix **links** if they still point at WordPress, and handle **images** separately (DAM migration is not part of this POC).

---

## Project structure

```
config/config.json              # Source WP, destination WP, optional aem {}
data/raw/posts.json             # Raw REST responses (extract)
data/transformed/               # Normalized posts + migration-bundle.json + AEM zip output
data/aem-node-context/          # Exported AEM blueprint (not generated)
scripts/extract.js
scripts/transform.js
scripts/generate.js
scripts/publish.js              # Destination WordPress only
scripts/build-aem-package.js    # AEM zip only
```

## Scripts reference

| Script | Purpose |
|--------|---------|
| **extract.js** | Uses `extract.mode`: `wp-api` (REST posts endpoint) or `scrape` (URL scraping) → `data/raw/posts.json`. |
| **extract-scrape.js** | Scrapes URLs passed via `--url` (or config fallback) into WP-like raw post JSON. |
| **transform.js** | Normalizes fields → `data/transformed/posts.json`. |
| **generate.js** | Builds `migration-bundle.json`. |
| **publish.js** | Posts each item to **destination WordPress** REST API (or dry-run without credentials). |
| **build-aem-package.js** | Builds **AEM** FileVault ZIP from blueprint + bundle. |

## Known limitations

- **Pagination**: Extract requests a single page (`extract.perPage` in config); large sites need pagination added.
- **Content model**: Posts only in this POC; pages, media, taxonomies, and ACF are not handled end-to-end.
- **Gutenberg → WP**: Body is HTML; complex block markup is not recreated as serialized blocks.
- **Gutenberg → AEM**: Same HTML goes into your Text component; styling depends on AEM policies and CSS.
- **Auth / errors**: WordPress publish requires Application Password REST access; AEM path only requires a valid blueprint and manual package install.
