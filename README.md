# AEM content migration

Extract content from a source (WordPress REST API, scraped HTML, or local documents), normalize it, download images into AEM DAM paths, and build a **FileVault ZIP** you install on AEM Author.

## Quick start

### Terminal

```bash
npm install
# Edit config/config.json (source URLs, AEM blueprint, damRoot, etc.)
npm run pipeline:aem
```

Output: `data/transformed/wp-to-aem-migration.zip` — upload in **Tools → Deployment → Packages** on Author.

### Optional UI

```bash
npm run install:ui
npm run dev:ui
```

Open the URL Vite prints. On the **Migration** tab, use **Run full AEM migration** (recommended). Configure `extract.mode` on the **Configuration** tab.

---

## Pipeline

| Step | Script | Output |
|------|--------|--------|
| 1 Extract | `npm run extract` | `data/raw/posts.json` |
| 2 Transform | `npm run transform` | `data/transformed/posts.json` |
| 3 Generate | `npm run generate` | `data/transformed/migration-bundle.json` |
| 4 Build AEM package | `npm run build:aem-package` | Rewrites bundle DAM refs, `asset-manifest.json`, `wp-to-aem-migration.zip` |

**All-in-one:** `npm run pipeline:aem`

Step 4 runs **asset migration** when `aem.assets.enabled` is `true` (default): downloads images, stores them flat under `aem.damRoot`, and includes them in the ZIP using the same layout as an AEM DAM export (`_jcr_content/renditions/original` + `original.dir`).

---

## Source configuration (`config.json`)

### `extract.mode`

| Mode | Use case | Key settings |
|------|----------|----------------|
| `wp-api` | WordPress REST | `source.baseUrl`, `extract.endpoint`, `extract.perPage`, credentials |
| `scrape` | Static/SSR article URLs | `extract.scrape.urls`, `discoverIndexUrl`, `layout`, `timeoutMs` |
| `documents` | Local `.docx` / `.pdf` | `extract.documents.globs`, `linkBaseUrl` |

Only the active mode is used for extract. Other blocks can remain in the file when you switch modes.

### Scrape URLs

Merged and deduped:

| Key | Purpose |
|-----|---------|
| `extract.scrape.urls` | Explicit article URLs |
| `extract.scrape.discoverIndexUrl` | Listing page; collects same-origin links matching `/articles/:slug` |
| `extract.scrape.discoverPathnameRegex` | Optional path filter override |
| `extract.scrape.maxDiscoverUrls` | Cap (default `500`) |

### Scrape layout (`extract.scrape.layout`)

| Value | When to use |
|--------|-------------|
| `generic` | `article` / `main` / `.entry-content` (or `contentSelector`) |
| `meridian-static` | Meridian article pages (hero, prose body, jump links, tags, author card) |

---

## AEM configuration (`config.json` → `aem`)

| Key | Purpose |
|-----|--------|
| `blueprintPath` | Sample page `.content.xml` (layout chrome: header/footer) |
| `parentJcrPath` | Where new pages are created (e.g. `/content/my-aem-site53/us/en/articles`) |
| `damRoot` | DAM folder for migrated images (flat files, e.g. `/content/dam/my-aem-site53/wp-migration`) |
| `bodyRenderer` | `meridian` (Meridian components) or `legacy` (core text/image) |
| `assets.enabled` | Download images and include in ZIP (default `true`) |
| `assets.localCacheDir` | Cache dir (default `data/assets/cache`) |
| `assetManifestFile` | Audit log (`data/transformed/asset-manifest.json`) |
| `bundleFile`, `outputZip`, `contextDir`, `packageGroup`, `packageName`, `packageVersion`, `authorUrl` | Package I/O and metadata |

See [`data/aem-node-context/DAM_ASSET_TEMPLATE.md`](data/aem-node-context/DAM_ASSET_TEMPLATE.md) for DAM node layout (matches Author export).

### Blueprint body injection

Either:

- **HTML comments** in the blueprint: `<!-- WP_MIGRATION_BODY_START -->` … `<!-- WP_MIGRATION_BODY_END -->`, or  
- **Full AEM re-export** with `meridian_header` and `meridian_footer` — the build replaces all components between them.

Export a reference page and DAM asset under `data/aem-node-context/` from your Author instance.

### Install on Author

1. Upload `data/transformed/wp-to-aem-migration.zip` in Package Manager.
2. Install the package.
3. Open new pages under `parentJcrPath` (sibling folders named by slug).
4. Confirm images use `/content/dam/...` paths; check `asset-manifest.json` for failed downloads.

---

## Project structure

```
config/config.json
data/raw/posts.json
data/transformed/          # bundle, manifest, zip
data/assets/cache/         # downloaded images
data/aem-node-context/     # AEM blueprint + DAM reference export
scripts/extract.js
scripts/transform.js
scripts/generate.js
scripts/migrate-assets.js
scripts/build-aem-package.js
scripts/lib/               # scrape, AEM blocks, DAM vault writer, …
web/ + server/             # optional control UI
```

## Scripts reference

| Script | Purpose |
|--------|---------|
| `pipeline:aem` | Full migration (recommended) |
| `extract` | Step 1 — source content |
| `transform` | Step 2 — normalize + AEM blocks |
| `generate` | Step 3 — bundle JSON |
| `build:aem-package` | Step 4 — assets + ZIP |
| `migrate-assets` | Debug: assets only (included in step 4 by default) |
| `build:sample-docs` | Generate sample `.docx` / `.pdf` for document mode |

### UI scripts

| Script | Purpose |
|--------|---------|
| `install:ui` | Install `server/` and `web/` deps |
| `dev:ui` | API + Vite dev server |
| `build:ui` / `start:ui` | Production UI |

UI operations are grouped: **Recommended** (full migration), **Step by step** (1–4), **Advanced** (migrate assets only).

---

## Known limitations

- WP API extract: single page (`extract.perPage`); pagination not implemented.
- Images only (`image/*`); no `srcset`, video, or standalone asset-only re-run workflow yet.
- Source image URLs must be reachable from the machine running the pipeline.
- Failed asset downloads keep external URLs in the bundle (see manifest).
- Complex Gutenberg/block markup is not recreated in AEM—HTML is mapped to components.
