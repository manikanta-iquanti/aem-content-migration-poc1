# Graph Report - wp migration ai  (2026-05-05)

## Corpus Check
- 6 files · ~4,586 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 36 nodes · 59 edges · 10 communities (9 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `df633579`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 9|Community 9]]

## God Nodes (most connected - your core abstractions)
1. `wpHtmlToAemBlocks()` - 11 edges
2. `main()` - 8 edges
3. `pageXmlFromBlueprint()` - 6 edges
4. `renderBodyXml()` - 5 edges
5. `trimOuter()` - 4 edges
6. `firstImg()` - 4 edges
7. `classifyFigure()` - 4 edges
8. `resolveBlocks()` - 3 edges
9. `isElement()` - 3 edges
10. `parseDetails()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `resolveBlocks()` --calls--> `wpHtmlToAemBlocks()`  [INFERRED]
  build-aem-package.js → lib/wp-html-to-aem-blocks.js

## Communities (10 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.46
Nodes (7): jcrPageName(), loadAemConfig(), main(), manifestMf(), packagePropertiesXml(), resolveBlocks(), workspaceFilterXml()

### Community 1 - "Community 1"
Cohesion: 0.67
Nodes (5): childElements(), escapeHtml(), flushParagraphBuffer(), meaningfulText(), wpHtmlToAemBlocks()

### Community 2 - "Community 2"
Cohesion: 0.5
Nodes (4): escapeRegex(), escapeXmlAttr(), extractSiteKeyFromBlueprint(), pageXmlFromBlueprint()

### Community 3 - "Community 3"
Cohesion: 0.5
Nodes (4): renderAccordionComponent(), renderBodyXml(), renderImageComponent(), renderTextComponent()

### Community 5 - "Community 5"
Cohesion: 0.67
Nodes (3): classifyFigure(), parseDetails(), trimOuter()

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `wpHtmlToAemBlocks()` connect `Community 1` to `Community 0`, `Community 9`, `Community 5`?**
  _High betweenness centrality (0.294) - this node is a cross-community bridge._
- **Why does `resolveBlocks()` connect `Community 0` to `Community 1`?**
  _High betweenness centrality (0.277) - this node is a cross-community bridge._
- **Why does `main()` connect `Community 0` to `Community 2`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._