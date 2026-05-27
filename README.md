# WordPress content migration (POC)

## What this project does

Pulls content from a source site (WordPress REST API **or scraped page URLs**), normalizes it to JSON, and builds `migration-bundle.json`. From that bundle you can:

- **Migrate to another WordPress** (REST publish), or  
- **Build an AEM content package** (no HTTP call to AEM; you install the zip yourself).

Both paths share the same first three steps (extract → transform → generate).

**Ways to run this repo**

- **Terminal only (default):** `npm install` at the repo root, then use the `npm run …` commands below. No UI dependencies.
- **Optional browser UI:** install UI packages once with `npm run install:ui`, then start the stack with `npm run dev:ui`. Open the URL Vite prints (the API stays on `127.0.0.1:3847`). For a built UI served by the same process, run `npm run build:ui` then `npm run start:ui`. How the UI is structured and how to add more operations is documented in [`CONTROL_UI_PLAN.md`](CONTROL_UI_PLAN.md).

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
- **Scrape mode**: set `extract.mode` to `"scrape"`. Provide URLs in one or both ways below (supports `https://...` and localhost).

**Scrape URL sources** (merged and deduped; explicit `urls` keep first in order):

| Config key | Purpose |
|------------|--------|
| `extract.scrape.urls` | Explicit list of article URLs (optional). |
| `extract.scrape.discoverIndexUrl` | One **listing** page URL to fetch (e.g. `http://localhost:8081/articles`). Same-origin `<a href>` links whose pathname looks like `/articles/your-slug` are collected automatically (Next `[slug]` style). |
| `extract.scrape.discoverPathnameRegex` | Optional. Override the path filter (string passed to `RegExp`, tested against the pathname without trailing slash). Default matches `/articles/:slug` only (not the bare `/articles` index). |
| `extract.scrape.maxDiscoverUrls` | Optional cap (default `500`). |

Discovery needs the listing HTML to contain normal `<a href="/articles/...">` links (typical for SSR or static export). Pure client-only pages with no links in the first response may return zero matches; in that case add a **sitemap** or **JSON index API** later, or keep using explicit `urls`.

**Scrape layouts** (`extract.scrape.layout`):

| Value | When to use |
|--------|-------------|
| `generic` (default) | Any HTML page: picks `article` / `main` / `.entry-content` (or your `contentSelector`) and stores that HTML for block parsing. |
| `meridian-static` | Pages built like the Meridian article preview: hero (eyebrow, title, dek, byline, hero image), `article.prose-article` body, “In this article” jump links, tags, author card. Fills `meridian` metadata on the raw post for AEM package build. |

For ad-hoc scraping without changing config URLs, use:

```bash
npm run extract:scrape -- --url https://example.com/post-a --url http://localhost:8080/post-b
```

Discover from a listing page for one run (still uses `layout` from config):

```bash
npm run extract:scrape -- --discover http://localhost:8081/articles
```

Optional selector override (generic layout):

```bash
npm run extract:scrape -- --url https://example.com/post-a --selector ".entry-content"
```

`extract:scrape` still reads `extract.scrape.layout` from config when you do not pass extra flags.

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
| 4 | `npm run build:aem-package` | When `aem.assets.enabled` is true (default): downloads images from source URLs, rewrites bundle references to DAM paths, stages assets under `aem.damRoot`, then builds the FileVault ZIP (pages + DAM). |
| (all-in-one) | `npm run pipeline:aem` | `extract` → `transform` → `generate` → `build:aem-package` (includes asset migration). |

Runs only **after** the shared pipeline (or use `pipeline:aem`). Nothing in this step uploads to AEM Author over HTTP.

### AEM config (`config.json` → `aem`)

| Key | Purpose |
|-----|--------|
| `blueprintPath` | Repo-relative path to the **sample page** `.content.xml` to clone (layout + header/footer chrome you keep outside the migration markers). |
| `parentJcrPath` | Vault filter root and folder under which new pages are written (e.g. `/content/my-aem-site53/us/en/articles`). |
| `bodyRenderer` | `"legacy"` — core **text** / **image** / **accordion** components between markers. `"meridian"` — Meridian article components (hero, jump links, paragraph, heading, pull quote, list, callout, image, tags, author) between markers. |
| `damRoot` | DAM folder for migrated images (e.g. `/content/dam/my-aem-site53/wp-migration`). |
| `assets.enabled` | When `true`, `build:aem-package` downloads images and includes them in the ZIP (default `true`). |
| `assets.localCacheDir` | Download cache (default `data/assets/cache`). |
| `assetManifestFile` | Audit log: `data/transformed/asset-manifest.json` (`ok` / `failed` / `skipped` per URL). |
| `bundleFile`, `outputZip`, `contextDir`, `packageGroup`, `packageName`, `packageVersion`, `authorUrl` | As before: bundle input, zip output, FileVault context, package metadata, author URL hint. |

See [`data/aem-node-context/DAM_ASSET_TEMPLATE.md`](data/aem-node-context/DAM_ASSET_TEMPLATE.md) for the generated `dam:Asset` node layout (AEM 6.5).

### What you do by hand (manual)

**One-time blueprint**

1. On **AEM Author**, create or export the page that defines the layout for generated pages (template + components).
2. Copy it under `data/aem-node-context/` and set **`aem.blueprintPath`** to that page’s `.content.xml`.
3. Blueprint body injection (either approach works):

   - **Minimal blueprint:** add `<!-- WP_MIGRATION_BODY_START -->` and `<!-- WP_MIGRATION_BODY_END -->` around the main content area; everything between is replaced on each build.
   - **Full AEM re-export** (Meridian page with `meridian_header` + `meridian_footer`): no markers needed — the build replaces all components between header and footer with migrated content.

4. The package step sets **`jcr:title`** on the page by replacing the title string already present on the blueprint’s `cq:PageContent` node (no hard-coded title constant in code).

**Before each package build**

5. Align **`parentJcrPath`** with where new slugs should appear under your site (e.g. language root vs `articles` folder).
6. For **Meridian static → Meridian AEM**, set `extract.scrape.layout` to `meridian-static` and `aem.bodyRenderer` to `meridian`, and scrape URLs that match the same front-end article shape.

**On AEM Author (outside this repo)**

7. Open **Tools → Deployment → Packages** (or `/crx/packmgr` on your author).
8. **Upload** `data/transformed/wp-to-aem-migration.zip`, then **Install** it.
9. Open **Sites** under the configured parent (e.g. `/content/my-aem-site53/us/en/articles`). New pages appear as **sibling** folders named by slug.
10. Verify in the editor: hero `image` and body `fileReference` should use `/content/dam/...` paths. Check `asset-manifest.json` for any `failed` downloads (those keep the original URL). Adjust RTE policies if needed.

---

## Project structure

```
config/config.json              # Source, destination, extract, aem {}
data/raw/posts.json             # Raw extract output
data/transformed/               # Normalized posts + migration-bundle.json + asset-manifest.json + AEM zip
data/assets/cache/              # Downloaded binaries (when asset migration runs)
data/aem-node-context/          # Exported AEM blueprint (Vault tree; not generated)
scripts/extract.js
scripts/extract-scrape.js
scripts/transform.js
scripts/generate.js
scripts/publish.js              # Destination WordPress only
scripts/migrate-assets.js       # Download images + rewrite bundle to DAM paths
scripts/build-aem-package.js    # Asset migration (when enabled) + AEM zip
scripts/lib/asset-migration.js
scripts/lib/dam-vault-writer.js
scripts/lib/aem-config.js
scripts/lib/wp-html-to-aem-blocks.js   # HTML → ordered blocks (paragraph, heading, quote, list, …)
scripts/lib/scrape-pages.js            # HTTP fetch + generic or meridian-static extract
scripts/lib/meridian-static-extract.js # Meridian-shaped static HTML → fields + article body
scripts/lib/discover-article-urls.js   # Collect article URLs from a listing page HTML
```

## Scripts reference

| Script | Purpose |
|--------|---------|
| **extract.js** | `extract.mode`: `wp-api` or `scrape` → `data/raw/posts.json`. |
| **extract-scrape.js** | `npm run extract:scrape` — `--url` (repeatable), `--discover <listingUrl>`, or config `urls` / `discoverIndexUrl`; uses `extract.scrape` (including `layout`). |
| **transform.js** | Normalizes fields and `aemBlocks`; passes through **`meridian`** when present. |
| **generate.js** | Builds `migration-bundle.json` (includes `meridian` on items when scraped). |
| **publish.js** | Posts each item to **destination WordPress** REST API (or dry-run without credentials). |
| **migrate-assets.js** | `npm run migrate-assets` — download images, rewrite `migration-bundle.json`, write `asset-manifest.json` (also run automatically from `build:aem-package` when `aem.assets.enabled`). |
| **build-aem-package.js** | Asset migration (when enabled) + FileVault ZIP (pages + DAM); **`aem.bodyRenderer`** selects legacy vs Meridian XML. |
| **pipeline:aem** | Full AEM path: extract → transform → generate → build:aem-package. |

### Optional UI (root `package.json` only)

| Script | Purpose |
|--------|---------|
| `install:ui` | Installs dependencies under `server/` and `web/` (does not add UI deps to the root install). |
| `dev:ui` | Starts the control API and Vite dev server; open the URL Vite prints in the terminal. |
| `build:ui` | Builds the web app to `web/dist`. |
| `start:ui` | Runs the API in production mode and serves `web/dist` when present (run `build:ui` first). |

## Known limitations

- **Pagination**: WP API extract requests a single page (`extract.perPage`); large sites need pagination.
- **Content model**: WP path is posts-oriented; scrape path is URL-list oriented. Pages, media, taxonomies, and ACF are not handled end-to-end.
- **Gutenberg → WP**: Body is HTML; complex block markup is not recreated as serialized blocks.
- **AEM legacy renderer**: Rich HTML is mostly core **text** components; policies and CSS decide what survives in RTE.
- **Asset migration**: Images only (`image/*`); no `srcset`, video, or asset-only re-run workflow yet. Source URLs must be reachable from the machine running the pipeline. Failed downloads stay as external URLs in the bundle.
- **AEM DAM layout**: Uses standard 6.5 `dam:Asset` template; if assets do not render on your Author, compare with an exported sample (see `DAM_ASSET_TEMPLATE.md`).
- **Auth / errors**: WordPress publish requires Application Password REST access; AEM path only needs a valid blueprint and manual package install.
