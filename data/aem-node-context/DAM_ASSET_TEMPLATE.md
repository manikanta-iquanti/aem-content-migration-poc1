# DAM asset template (from AEM Author export)

Reference asset (Author export): `jcr_root/content/dam/my-aem-site53/hero-image1.avif/`

Migrated assets are stored **flat** under `aem.damRoot`, e.g. `/content/dam/my-aem-site53/wp-migration/santorini.jpg` (no per-article subfolders).

## Layout (FileVault file aggregate)

```
{asset-name}/
  .content.xml
  _jcr_content/renditions/
    original                 ← binary file (image bytes)
    original.dir/
      .content.xml           ← nt:file with inline jcr:content (oak:Resource)
```

## Root `.content.xml`

- `jcr:primaryType="dam:Asset"` with `mix:referenceable`
- **Inline** `<jcr:content jcr:primaryType="dam:AssetContent">` (not a separate `jcr_content/` folder)
- `metadata` with `dam:sha1`, `dam:size`, `dam:extracted`
- `related` unstructured node

## Rendition

Do **not** use:

- `jcr_content/renditions/original/.content.xml` as standalone `nt:file`
- `jcr_content/renditions/original/jcr_content/` directory
- Base64 `jcr:data` on `nt:resource` in package XML

The migration tool (`scripts/lib/dam-vault-writer.js`) follows this export shape.

## Component references

- Core image: `fileReference="/content/dam/.../file.jpg"`
- Meridian hero: `image="/content/dam/.../file.jpg"`
