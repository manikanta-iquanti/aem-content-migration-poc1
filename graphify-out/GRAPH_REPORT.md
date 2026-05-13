# Graph Report - wp migration ai  (2026-05-13)

## Corpus Check
- 9 files · ~7,329 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 82 nodes · 157 edges · 11 communities
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8b67652a`
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

## God Nodes (most connected - your core abstractions)
1. `wpHtmlToAemBlocks()` - 15 edges
2. `renderMeridianSliceXml()` - 13 edges
3. `extractMeridianStaticPage()` - 13 edges
4. `extractPageData()` - 9 edges
5. `pageXmlFromBlueprint()` - 8 edges
6. `main()` - 8 edges
7. `renderBodyXml()` - 6 edges
8. `trimText()` - 6 edges
9. `scrapePagesToWpShape()` - 5 edges
10. `trimOuter()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `resolveBlocks()` --calls--> `wpHtmlToAemBlocks()`  [INFERRED]
  build-aem-package.js → lib/wp-html-to-aem-blocks.js
- `main()` --calls--> `scrapePagesToWpShape()`  [INFERRED]
  extract-scrape.js → lib/scrape-pages.js
- `main()` --calls--> `scrapePagesToWpShape()`  [INFERRED]
  extract.js → lib/scrape-pages.js
- `extractPageData()` --calls--> `extractMeridianStaticPage()`  [INFERRED]
  lib/scrape-pages.js → lib/meridian-static-extract.js

## Communities (11 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.35
Nodes (14): childElements(), classifyFigure(), escapeHtml(), firstImg(), flushParagraphBuffer(), isCalloutAside(), isElement(), meaningfulText() (+6 more)

### Community 1 - "Community 1"
Cohesion: 0.25
Nodes (12): cleanupContent(), deriveNumericId(), deriveSlug(), extractPageData(), getMeta(), normalizeBaseUrl(), scrapePagesToWpShape(), selectContentRoot() (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.37
Nodes (12): absUrl(), extractAuthorFromDiv(), extractJumpLinks(), extractMeridianStaticPage(), extractTagsFromDiv(), isAuthorDiv(), isElement(), isTagsDiv() (+4 more)

### Community 3 - "Community 3"
Cohesion: 0.32
Nodes (11): accordionPanelsToRichHtml(), renderMeridianAuthor(), renderMeridianCallout(), renderMeridianHeading(), renderMeridianHero(), renderMeridianJumpLinks(), renderMeridianList(), renderMeridianParagraph() (+3 more)

### Community 4 - "Community 4"
Cohesion: 0.29
Nodes (7): jcrPageName(), loadAemConfig(), main(), manifestMf(), packagePropertiesXml(), resolveBlocks(), workspaceFilterXml()

### Community 5 - "Community 5"
Cohesion: 0.4
Nodes (5): escapeHtmlInner(), renderAccordionComponent(), renderBodyXml(), renderImageComponent(), renderTextComponent()

### Community 6 - "Community 6"
Cohesion: 0.4
Nodes (5): escapeRegex(), escapeXmlAttr(), extractBlueprintJcrTitle(), extractSiteKeyFromBlueprint(), pageXmlFromBlueprint()

### Community 7 - "Community 7"
Cohesion: 0.83
Nodes (3): collectArgs(), main(), readArg()

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `wpHtmlToAemBlocks()` connect `Community 0` to `Community 4`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **Why does `resolveBlocks()` connect `Community 4` to `Community 0`, `Community 3`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Why does `extractPageData()` connect `Community 1` to `Community 2`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._