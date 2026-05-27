# Graph Report - wp migration ai  (2026-05-27)

## Corpus Check
- 42 files · ~204,959 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 222 nodes · 421 edges · 23 communities (18 shown, 5 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6456c850`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]

## God Nodes (most connected - your core abstractions)
1. `wpHtmlToAemBlocks()` - 16 edges
2. `renderMeridianSliceXml()` - 14 edges
3. `extractMeridianStaticPage()` - 14 edges
4. `main()` - 12 edges
5. `extractPageData()` - 10 edges
6. `pageXmlFromBlueprint()` - 9 edges
7. `pdfBufferToPost()` - 8 edges
8. `renderBodyXml()` - 7 edges
9. `stageDamAsset()` - 7 edges
10. `trimText()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `resolveBlocks()` --calls--> `wpHtmlToAemBlocks()`  [INFERRED]
  scripts/build-aem-package.js → scripts/lib/wp-html-to-aem-blocks.js
- `stageDamAssetsFromManifest()` --calls--> `ensureDamFolderAncestors()`  [INFERRED]
  scripts/build-aem-package.js → scripts/lib/dam-vault-writer.js
- `stageDamAssetsFromManifest()` --calls--> `stageDamAsset()`  [INFERRED]
  scripts/build-aem-package.js → scripts/lib/dam-vault-writer.js
- `main()` --calls--> `loadAemConfig()`  [INFERRED]
  scripts/build-aem-package.js → scripts/lib/aem-config.js
- `main()` --calls--> `migrateAssets()`  [INFERRED]
  scripts/build-aem-package.js → scripts/migrate-assets.js

## Communities (23 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.18
Nodes (29): accordionPanelsToRichHtml(), escapeHtmlInner(), escapeRegex(), escapeXmlAttr(), extractBlueprintJcrTitle(), extractSiteKeyFromBlueprint(), jcrPageName(), loadAemConfig() (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (20): assembleDocumentPost(), buildAuthorCard(), parseTags(), labelToCanonicalKey(), normalizeLabel(), docxBufferToPost(), enrichMeridianDocumentHtml(), slugifyHeading() (+12 more)

### Community 2 - "Community 2"
Cohesion: 0.1
Nodes (14): fetchConfig(), fetchOperations(), parseError(), saveConfig(), startJob(), ArtifactLinks(), ConfigEditor(), useJobStream() (+6 more)

### Community 3 - "Community 3"
Cohesion: 0.15
Nodes (16): loadAemConfig(), normalizeDamRoot(), absUrl(), collectAllAssetUrls(), collectAssetUrlsFromItem(), damPathForUrl(), filenameFromUrl(), hashUrl() (+8 more)

### Community 4 - "Community 4"
Cohesion: 0.29
Nodes (13): defaultPathnameMatch(), discoverArticleUrlsFromIndex(), cleanupContent(), deriveNumericId(), deriveSlug(), extractPageData(), getMeta(), normalizeBaseUrl() (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.42
Nodes (14): childElements(), classifyFigure(), escapeHtml(), firstImg(), flushParagraphBuffer(), isCalloutAside(), isElement(), meaningfulText() (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.45
Nodes (12): absUrl(), extractAuthorFromDiv(), extractJumpLinks(), extractMeridianStaticPage(), extractTagsFromDiv(), isAuthorDiv(), isElement(), isTagsDiv() (+4 more)

### Community 7 - "Community 7"
Cohesion: 0.3
Nodes (10): appendLog(), attachSubscriber(), broadcast(), executeOperationWithLogging(), isBusy(), reqOnClose(), runScriptProcess(), sseWrite() (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.38
Nodes (9): assetContentXml(), assetRootXml(), ensureDamFolderAncestors(), escapeXml(), orderedFolderXml(), originalDirXml(), originalFileXml(), resourceXml() (+1 more)

### Community 9 - "Community 9"
Cohesion: 0.67
Nodes (5): lisbonDoc(), main(), metaTable(), vietnamDoc(), writePdfSample()

### Community 10 - "Community 10"
Cohesion: 0.8
Nodes (3): collectArgs(), main(), readArg()

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `main()` connect `Community 0` to `Community 3`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `migrateAssets()` connect `Community 3` to `Community 0`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `resolveBlocks()` connect `Community 0` to `Community 5`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `main()` (e.g. with `loadAemConfig()` and `migrateAssets()`) actually correct?**
  _`main()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._