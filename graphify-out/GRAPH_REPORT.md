# Graph Report - wp migration ai  (2026-05-13)

## Corpus Check
- 26 files · ~14,643 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 143 nodes · 296 edges · 19 communities (13 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8933cfd4`
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
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]

## God Nodes (most connected - your core abstractions)
1. `wpHtmlToAemBlocks()` - 16 edges
2. `renderMeridianSliceXml()` - 14 edges
3. `extractMeridianStaticPage()` - 14 edges
4. `extractPageData()` - 10 edges
5. `pageXmlFromBlueprint()` - 9 edges
6. `main()` - 9 edges
7. `renderBodyXml()` - 7 edges
8. `trimText()` - 7 edges
9. `scrapePagesToWpShape()` - 7 edges
10. `resolveScrapeUrls()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `resolveBlocks()` --calls--> `wpHtmlToAemBlocks()`  [INFERRED]
  scripts/build-aem-package.js → scripts/lib/wp-html-to-aem-blocks.js
- `main()` --calls--> `scrapePagesToWpShape()`  [INFERRED]
  scripts/extract-scrape.js → scripts/lib/scrape-pages.js
- `main()` --calls--> `scrapePagesToWpShape()`  [INFERRED]
  scripts/extract.js → scripts/lib/scrape-pages.js
- `resolveScrapeUrls()` --calls--> `discoverArticleUrlsFromIndex()`  [INFERRED]
  scripts/lib/scrape-pages.js → scripts/lib/discover-article-urls.js
- `extractPageData()` --calls--> `extractMeridianStaticPage()`  [INFERRED]
  scripts/lib/scrape-pages.js → scripts/lib/meridian-static-extract.js

## Communities (19 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.19
Nodes (28): accordionPanelsToRichHtml(), escapeHtmlInner(), escapeRegex(), escapeXmlAttr(), extractBlueprintJcrTitle(), extractSiteKeyFromBlueprint(), jcrPageName(), loadAemConfig() (+20 more)

### Community 1 - "Community 1"
Cohesion: 0.14
Nodes (12): fetchConfig(), fetchOperations(), parseError(), saveConfig(), startJob(), ArtifactLinks(), ConfigEditor(), useJobStream() (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.42
Nodes (14): childElements(), classifyFigure(), escapeHtml(), firstImg(), flushParagraphBuffer(), isCalloutAside(), isElement(), meaningfulText() (+6 more)

### Community 3 - "Community 3"
Cohesion: 0.45
Nodes (12): absUrl(), extractAuthorFromDiv(), extractJumpLinks(), extractMeridianStaticPage(), extractTagsFromDiv(), isAuthorDiv(), isElement(), isTagsDiv() (+4 more)

### Community 4 - "Community 4"
Cohesion: 0.44
Nodes (11): cleanupContent(), deriveNumericId(), deriveSlug(), extractPageData(), getMeta(), normalizeBaseUrl(), resolveScrapeUrls(), scrapePagesToWpShape() (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.3
Nodes (10): appendLog(), attachSubscriber(), broadcast(), executeOperationWithLogging(), isBusy(), reqOnClose(), runScriptProcess(), sseWrite() (+2 more)

### Community 6 - "Community 6"
Cohesion: 0.8
Nodes (3): collectArgs(), main(), readArg()

## Knowledge Gaps
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `wpHtmlToAemBlocks()` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `resolveBlocks()` connect `Community 0` to `Community 2`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `extractPageData()` connect `Community 4` to `Community 3`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._