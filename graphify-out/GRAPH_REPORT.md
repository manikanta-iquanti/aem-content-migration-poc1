# Graph Report - wp migration ai  (2026-05-08)

## Corpus Check
- 8 files · ~5,449 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 52 nodes · 87 edges · 10 communities (9 shown, 1 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3acf6d86`
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

## God Nodes (most connected - your core abstractions)
1. `wpHtmlToAemBlocks()` - 11 edges
2. `main()` - 8 edges
3. `extractPageData()` - 8 edges
4. `pageXmlFromBlueprint()` - 6 edges
5. `renderBodyXml()` - 5 edges
6. `scrapePagesToWpShape()` - 5 edges
7. `main()` - 4 edges
8. `trimOuter()` - 4 edges
9. `firstImg()` - 4 edges
10. `classifyFigure()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `resolveBlocks()` --calls--> `wpHtmlToAemBlocks()`  [INFERRED]
  build-aem-package.js → lib/wp-html-to-aem-blocks.js
- `main()` --calls--> `scrapePagesToWpShape()`  [INFERRED]
  extract-scrape.js → lib/scrape-pages.js
- `main()` --calls--> `scrapePagesToWpShape()`  [INFERRED]
  extract.js → lib/scrape-pages.js

## Communities (10 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.35
Nodes (10): cleanupContent(), deriveNumericId(), deriveSlug(), extractPageData(), getMeta(), normalizeBaseUrl(), scrapePagesToWpShape(), selectContentRoot() (+2 more)

### Community 1 - "Community 1"
Cohesion: 0.44
Nodes (10): childElements(), classifyFigure(), escapeHtml(), firstImg(), flushParagraphBuffer(), isElement(), meaningfulText(), parseDetails() (+2 more)

### Community 2 - "Community 2"
Cohesion: 0.46
Nodes (7): jcrPageName(), loadAemConfig(), main(), manifestMf(), packagePropertiesXml(), resolveBlocks(), workspaceFilterXml()

### Community 3 - "Community 3"
Cohesion: 0.5
Nodes (4): renderAccordionComponent(), renderBodyXml(), renderImageComponent(), renderTextComponent()

### Community 4 - "Community 4"
Cohesion: 0.5
Nodes (4): escapeRegex(), escapeXmlAttr(), extractSiteKeyFromBlueprint(), pageXmlFromBlueprint()

### Community 5 - "Community 5"
Cohesion: 0.83
Nodes (3): collectArgs(), main(), readArg()

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `wpHtmlToAemBlocks()` connect `Community 1` to `Community 2`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **Why does `resolveBlocks()` connect `Community 2` to `Community 1`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `scrapePagesToWpShape()` connect `Community 0` to `Community 5`, `Community 6`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._