# WordPress content migration (POC)

## What this project does

Plain Node.js scripts that pull posts from a WordPress site via the REST API, normalize them to JSON, build a publish-ready bundle (HTML content suitable for the block editor), and optionally create drafts on another WordPress site.

## Project structure

```
config/config.json          # Source and destination URLs, optional credentials
data/raw/posts.json         # Raw REST responses (from extract)
data/transformed/           # Normalized JSON + migration-bundle.json
scripts/extract.js          # Fetch from source
scripts/transform.js        # Normalize fields
scripts/generate.js         # Build migration bundle
scripts/publish.js          # POST to destination (or dry-run)
```

## Setup

1. **Install dependencies** (Node.js 18+):

   ```bash
   npm install
   ```

2. **Configure** `config/config.json`:

   - Set `source.baseUrl` to the WordPress site you read from (trailing slashes are stripped in code).
   - For private or authenticated reads, set `source.username` and `source.applicationPassword` (WordPress Application Password).
   - Set `destination.baseUrl` for publishing. For real `POST`s, set `destination.username` and `destination.applicationPassword`. Leave empty to dry-run publish.

## How to run

Run in order (or use the combined pipeline for steps 1–3):

```bash
npm run extract      # 1. Fetch posts → data/raw/posts.json
npm run transform    # 2. Normalize → data/transformed/posts.json
npm run generate     # 3. Bundle → data/transformed/migration-bundle.json
npm run publish      # 4. Create posts on destination (or list-only if no auth)
```

One-shot extract + transform + generate:

```bash
npm run pipeline
```

## Scripts

| Script | Purpose |
|--------|---------|
| **extract.js** | Calls the source `wp-json` posts endpoint and saves the response to `data/raw/posts.json`. |
| **transform.js** | Maps raw posts to a small JSON shape (title, slug, dates, HTML content, excerpt). |
| **generate.js** | Writes `migration-bundle.json` with items ready to publish (defaults new posts to `draft`). |
| **publish.js** | POSTs each bundle item to the destination REST API, or prints what would be posted if destination credentials are missing. |

## Known limitations

- **Pagination**: Extract requests a single page (`per_page` in config); large sites need pagination added.
- **Content model**: Only the default posts flow is wired; pages, media, taxonomies, and ACF are not handled.
- **Gutenberg**: Content is HTML passed through the REST API; WordPress will ingest it as post body HTML. This POC does not emit full `wp:block` serialized JSON for complex block trees.
- **Auth / errors**: Destination must allow Application Password REST access; failed requests surface as axios errors with minimal retry logic.
