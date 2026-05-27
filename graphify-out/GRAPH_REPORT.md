# Graph Report - debt-crusher  (2026-05-26)

## Corpus Check
- 51 files · ~58,694 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 442 nodes · 645 edges · 31 communities (20 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d7db0e4c`
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
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]

## God Nodes (most connected - your core abstractions)
1. `Debt Crusher Product Plan` - 19 edges
2. `Debt Crusher User Guide` - 18 edges
3. `compilerOptions` - 16 edges
4. `debt-crusher Project Context` - 16 edges
5. `Finance Console` - 15 edges
6. `debt-crusher Architecture` - 14 edges
7. `Debt Crusher` - 13 edges
8. `dependencies` - 10 edges
9. `loadPortfolioBundle()` - 10 edges
10. `createDefaultCustomStrategyWeights()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `normalizePortfolioInput()` --calls--> `createDefaultCustomStrategyWeights()`  [EXTRACTED]
  app/api/portfolio/route.ts → lib/portfolio.ts
- `loadPortfolioBundle()` --calls--> `createEmptyPortfolio()`  [EXTRACTED]
  app/api/portfolio/route.ts → lib/portfolio.ts
- `loadPortfolioBundle()` --calls--> `buildComputedSnapshot()`  [EXTRACTED]
  app/api/portfolio/route.ts → lib/portfolio.ts
- `loadPortfolioBundle()` --calls--> `dbRowToPortfolioState()`  [EXTRACTED]
  app/api/portfolio/route.ts → lib/persistence.ts
- `loadPortfolioBundle()` --calls--> `buildSnapshotDelta()`  [EXTRACTED]
  app/api/portfolio/route.ts → lib/portfolio.ts

## Communities (31 total, 11 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (32): CashAccountsView(), CashAccountsViewProps, columnHelper, CreditCardsView(), CreditCardsViewProps, formatAutoPayment(), chartColors, DashboardView() (+24 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (48): Completed baseline, Current Build Status, Current core entities, Current Derived Logic, Current Status Model, Current storage, Data Model, Debt Crusher Product Plan (+40 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (16): Business Purpose, Critical Dependencies, Current Architecture Themes, debt-crusher Project Context, Deployment Model, Environments, Important APIs, Important Databases (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (35): Backup And Export, Cash Accounts, code:bash (cp .env.example .env), Credit Cards, Danger, Dashboard, Debt Crusher User Guide, Export Backup (+27 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (50): buildDashboardSummary(), buildRecommendedTargetReasons(), CashBaseRow, computePriorityScore(), CreditBaseRow, deriveCashAccounts(), deriveCreditAccounts(), diffInDays() (+42 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (26): dependencies, next, prisma, @prisma/client, react, react-dom, recharts, @tanstack/react-table (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (15): Critical Workflows, Dangerous Code Paths, Databases Used, Dependencies, Failure Modes, Finance Console, Important Source Files, Inbound APIs (+7 more)

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
Cohesion: 0.08
Nodes (48): DebtCrusherApp(), views, HistoryPanel(), HistoryPanelProps, ImportPanel(), ImportPanelProps, exportPortfolioWorkbook(), activityEventToDb() (+40 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (15): code:bash (cp .env.example .env), code:text (http://localhost:3000), Current status, Debt Crusher, Important workflow note, Key docs, License, Local setup (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.13
Nodes (14): Auth Flow, Caching Layers, debt-crusher Architecture, Deployment Topology, End-to-End Request Flows, Event-Driven Architecture, Failover Behavior, Frontend / Backend Interaction (+6 more)

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (10): debt-crusher Workflows, Debugging, Deployment, Feature Rollout, Incident Response, Local Development, Migrations, Observability Investigation (+2 more)

### Community 18 - "Community 18"
Cohesion: 0.2
Nodes (9): API Conventions, Architecture Patterns, Database / Migration Patterns, debt-crusher Coding Rules, Error Handling / Logging, Naming / Structure, State Management, Testing Conventions (+1 more)

### Community 19 - "Community 19"
Cohesion: 0.29
Nodes (6): Critical Entrypoints, debt-crusher Onboarding, First Read, How To Start Reasoning, Local Run Baseline, Module Map

### Community 20 - "Community 20"
Cohesion: 0.4
Nodes (4): debt-crusher Decision Log, Forms-first over workbook-first, Graphify-first repo discovery, Preserve repo separation

### Community 21 - "Community 21"
Cohesion: 0.5
Nodes (3): Critical Entrypoints, Read First, Top-Level Modules

## Knowledge Gaps
- **243 isolated node(s):** `name`, `version`, `private`, `dev`, `build` (+238 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createDefaultCustomStrategyWeights()` connect `Community 4` to `Community 14`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _243 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._