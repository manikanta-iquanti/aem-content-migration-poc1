# Graph Report - wp migration ai  (2026-05-14)

## Corpus Check
- 38 files · ~20,120 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 189 nodes · 363 edges · 21 communities (17 shown, 4 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a1fc3d2e`
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
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]

## God Nodes (most connected - your core abstractions)
1. `wpHtmlToAemBlocks()` - 16 edges
2. `renderMeridianSliceXml()` - 14 edges
3. `extractMeridianStaticPage()` - 14 edges
4. `extractPageData()` - 10 edges
5. `pageXmlFromBlueprint()` - 9 edges
6. `main()` - 9 edges
7. `pdfBufferToPost()` - 8 edges
8. `renderBodyXml()` - 7 edges
9. `trimText()` - 7 edges
10. `scrapePagesToWpShape()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `resolveBlocks()` --calls--> `wpHtmlToAemBlocks()`  [INFERRED]
  scripts/build-aem-package.js → scripts/lib/wp-html-to-aem-blocks.js
- `main()` --calls--> `scrapePagesToWpShape()`  [INFERRED]
  scripts/extract-scrape.js → scripts/lib/scrape-pages.js
- `main()` --calls--> `scrapePagesToWpShape()`  [INFERRED]
  scripts/extract.js → scripts/lib/scrape-pages.js
- `extractPageData()` --calls--> `extractMeridianStaticPage()`  [INFERRED]
  scripts/lib/scrape-pages.js → scripts/lib/meridian-static-extract.js
- `assembleDocumentPost()` --calls--> `deriveNumericId()`  [INFERRED]
  scripts/lib/document-import/assemble-wp-post.js → scripts/lib/scrape-pages.js

## Communities (21 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (22): assembleDocumentPost(), buildAuthorCard(), parseTags(), labelToCanonicalKey(), normalizeLabel(), docxBufferToPost(), enrichMeridianDocumentHtml(), slugifyHeading() (+14 more)

### Community 1 - "Community 1"
Cohesion: 0.19
Nodes (28): accordionPanelsToRichHtml(), escapeHtmlInner(), escapeRegex(), escapeXmlAttr(), extractBlueprintJcrTitle(), extractSiteKeyFromBlueprint(), jcrPageName(), loadAemConfig() (+20 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (11): fetchConfig(), fetchOperations(), parseError(), saveConfig(), startJob(), ArtifactLinks(), ConfigEditor(), useJobStream() (+3 more)

### Community 3 - "Community 3"
Cohesion: 0.29
Nodes (13): defaultPathnameMatch(), discoverArticleUrlsFromIndex(), cleanupContent(), deriveNumericId(), deriveSlug(), extractPageData(), getMeta(), normalizeBaseUrl() (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.42
Nodes (14): childElements(), classifyFigure(), escapeHtml(), firstImg(), flushParagraphBuffer(), isCalloutAside(), isElement(), meaningfulText() (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.45
Nodes (12): absUrl(), extractAuthorFromDiv(), extractJumpLinks(), extractMeridianStaticPage(), extractTagsFromDiv(), isAuthorDiv(), isElement(), isTagsDiv() (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.3
Nodes (10): appendLog(), attachSubscriber(), broadcast(), executeOperationWithLogging(), isBusy(), reqOnClose(), runScriptProcess(), sseWrite() (+2 more)

### Community 7 - "Community 7"
Cohesion: 0.29
Nodes (3): DocumentExtractForm(), OperationPanel(), ScrapeExtractForm()

### Community 8 - "Community 8"
Cohesion: 0.67
Nodes (5): lisbonDoc(), main(), metaTable(), vietnamDoc(), writePdfSample()

### Community 9 - "Community 9"
Cohesion: 0.8
Nodes (3): collectArgs(), main(), readArg()

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `extractPageData()` connect `Community 3` to `Community 5`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `assembleDocumentPost()` connect `Community 0` to `Community 3`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `extractMeridianStaticPage()` connect `Community 5` to `Community 3`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._