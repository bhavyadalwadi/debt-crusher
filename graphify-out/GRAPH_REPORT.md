# Graph Report - debt-crusher  (2026-05-19)

## Corpus Check
- 34 files · ~17,892 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 337 nodes · 557 edges · 16 communities (14 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6554fed8`
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
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]

## God Nodes (most connected - your core abstractions)
1. `Debt Crusher Product Plan` - 19 edges
2. `Debt Crusher User Guide` - 18 edges
3. `compilerOptions` - 16 edges
4. `Debt Crusher` - 11 edges
5. `dependencies` - 10 edges
6. `loadPortfolioBundle()` - 10 edges
7. `createDefaultCustomStrategyWeights()` - 10 edges
8. `buildComputedSnapshot()` - 10 edges
9. `parseSetupSheet()` - 10 edges
10. `importWorkbook()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `normalizePortfolioInput()` --calls--> `createDefaultCustomStrategyWeights()`  [EXTRACTED]
  app/api/portfolio/route.ts → lib/portfolio.ts
- `loadPortfolioBundle()` --calls--> `createEmptyPortfolio()`  [EXTRACTED]
  app/api/portfolio/route.ts → lib/portfolio.ts
- `POST()` --calls--> `buildActivityEvents()`  [EXTRACTED]
  app/api/portfolio/route.ts → lib/portfolio.ts
- `loadPortfolioBundle()` --calls--> `buildComputedSnapshot()`  [EXTRACTED]
  app/api/portfolio/route.ts → lib/portfolio.ts
- `loadPortfolioBundle()` --calls--> `dbRowToPortfolioState()`  [EXTRACTED]
  app/api/portfolio/route.ts → lib/persistence.ts

## Communities (16 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (32): CashAccountsView(), CashAccountsViewProps, columnHelper, CreditCardsView(), CreditCardsViewProps, formatAutoPayment(), chartColors, DashboardView() (+24 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (48): Completed baseline, Current Build Status, Current core entities, Current Derived Logic, Current Status Model, Current storage, Data Model, Debt Crusher Product Plan (+40 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (22): activityEventToDb(), activitySnapshotToDb(), cashAccountToDb(), creditAccountToDb(), dbRowToActivityEvent(), dbRowToActivitySnapshot(), dbRowToPortfolioState(), normalizeCustomStrategyWeights() (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (35): Backup And Export, Cash Accounts, code:bash (cp .env.example .env), Credit Cards, Danger, Dashboard, Debt Crusher User Guide, Export Backup (+27 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (30): deriveCashAccounts(), CASH_HEADER_ALIASES, CashBaseRow, CREDIT_HEADER_ALIASES, CreditBaseRow, findHeaderRowIndex(), headerIndexMap(), importWorkbook() (+22 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (26): dependencies, next, prisma, @prisma/client, react, react-dom, recharts, @tanstack/react-table (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.1
Nodes (20): buildDashboardSummary(), buildRecommendedTargetReasons(), CashBaseRow, computePriorityScore(), CreditBaseRow, deriveCreditAccounts(), diffInDays(), resolveCreditStatus() (+12 more)

### Community 7 - "Community 7"
Cohesion: 0.1
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (10): 1. Use local SQLite, 2. Generate Prisma client and create the local database schema, 3. Start the app, 4. Switch to Neon later, code:bash (cp .env.example .env), code:env (DATABASE_URL="file:./dev.db"), code:bash (npm run prisma:generate), code:bash (npm run dev) (+2 more)

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (6): cashSheet, creditSheet, outputDir, outputPath, setupSheet, workbook

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (26): DebtCrusherApp(), views, HistoryPanel(), HistoryPanelProps, ImportPanel(), ImportPanelProps, exportPortfolioWorkbook(), buildActivityEvents() (+18 more)

### Community 15 - "Community 15"
Cohesion: 0.14
Nodes (13): code:bash (cp .env.example .env), code:text (http://localhost:3000), Current status, Debt Crusher, Important workflow note, Key docs, Local setup, Product shape (+5 more)

## Knowledge Gaps
- **162 isolated node(s):** `name`, `version`, `private`, `dev`, `build` (+157 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createDefaultCustomStrategyWeights()` connect `Community 4` to `Community 2`, `Community 6`, `Community 14`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _162 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._