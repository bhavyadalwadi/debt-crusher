# Graph Report - debt-crusher  (2026-06-04)

## Corpus Check
- 69 files · ~63,702 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 589 nodes · 901 edges · 50 communities (37 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4c208fa8`
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
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]

## God Nodes (most connected - your core abstractions)
1. `Debt Crusher Product Plan` - 19 edges
2. `Debt Crusher User Guide` - 18 edges
3. `compilerOptions` - 16 edges
4. `Debt Crusher` - 16 edges
5. `debt-crusher Project Context` - 16 edges
6. `Project Status` - 15 edges
7. `Finance Console` - 15 edges
8. `debt-crusher Architecture` - 14 edges
9. `buildComputedSnapshot()` - 13 edges
10. `savePortfolioBundle()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `analyzeScreenshotImport()`  [EXTRACTED]
  app/api/screenshot-import/analyze/route.ts → lib/screenshot-import.ts
- `POST()` --calls--> `savePortfolioBundle()`  [EXTRACTED]
  app/api/screenshot-import/save/route.ts → lib/portfolio-store.ts
- `middleware()` --calls--> `hasPrivateAccessCredentials()`  [EXTRACTED]
  middleware.ts → lib/auth.ts
- `middleware()` --calls--> `isValidSessionToken()`  [EXTRACTED]
  middleware.ts → lib/auth.ts
- `middleware()` --calls--> `getSessionCookieName()`  [EXTRACTED]
  middleware.ts → lib/auth.ts

## Communities (50 total, 13 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (40): CashAccountsView(), CashAccountsViewProps, columnHelper, CreditCardsView(), CreditCardsViewProps, formatAutoPayment(), chartColors, DashboardView() (+32 more)

### Community 1 - "Community 1"
Cohesion: 0.2
Nodes (9): Current Status Model, Debt Crusher Product Plan, Execution Phases, Goal, Implemented statuses, Next-Level Suggestions, Notes, Product Principles (+1 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (16): Business Purpose, Critical Dependencies, Current Architecture Themes, debt-crusher Project Context, Deployment Model, Environments, Important APIs, Important Databases (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (35): Backup And Export, Cash Accounts, code:bash (cp .env.example .env), Credit Cards, Danger, Dashboard, Debt Crusher User Guide, Export Backup (+27 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (30): CASH_HEADER_ALIASES, CashBaseRow, CREDIT_HEADER_ALIASES, CreditBaseRow, findHeaderRowIndex(), headerIndexMap(), parseCashRows(), parseCreditRows() (+22 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (33): dependencies, next, prisma, @prisma/client, react, react-dom, recharts, @tanstack/react-table (+25 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (15): Critical Workflows, Dangerous Code Paths, Databases Used, Dependencies, Failure Modes, Finance Console, Important Source Files, Inbound APIs (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.1
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (13): 1. Set local env, 1. Use local SQLite, 2. Generate Prisma client and create the local database schema, 2. Generate Prisma client and push the schema, 3. Start the app, 4. Switch to Neon later, 4. Vercel, code:bash (cp .env.example .env) (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (6): cashSheet, creditSheet, outputDir, outputPath, setupSheet, workbook

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (70): DebtCrusherApp(), views, HistoryPanel(), HistoryPanelProps, ImportPanel(), ImportPanelProps, ScreenshotReviewDraft, ScreenshotReviewPanel() (+62 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (18): code:bash (npm install), code:text (http://localhost:3000), Current status, Debt Crusher, Getting Started, Important workflow note, Key docs, License (+10 more)

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

### Community 31 - "Community 31"
Cohesion: 0.18
Nodes (21): SignInForm(), config, isPublicPath(), middleware(), constantTimeEqual(), createSessionToken(), getMissingPrivateAccessMessage(), getSessionCookieName() (+13 more)

### Community 32 - "Community 32"
Cohesion: 0.08
Nodes (24): code:typescript (credit_limit:), code:typescript (value={draft.capturedAt ? draft.capturedAt.split("T")[0] : "), code:typescript (id: `${line}:${raw}:${value}`.replace(/[^a-z0-9:\-$.]/gi, ""), code:typescript (return candidates.find((c) => c.value >= 0) ?? candidates[0]), code:bash (# Proposed test file location validates logic:), code:bash (nvm use 20.19.0), Environment Blockers, How to Verify Fixes (+16 more)

### Community 33 - "Community 33"
Cohesion: 0.18
Nodes (15): POST(), analyzeScreenshotImport(), chooseAvailableBalance(), chooseCurrentBalance(), cleanText(), engData, inferKind(), normalizeMoney() (+7 more)

### Community 34 - "Community 34"
Cohesion: 0.12
Nodes (15): Attention Now, Benefit, Category, Completion, Current Plan, Current Status, Done, Ecosystem (+7 more)

### Community 35 - "Community 35"
Cohesion: 0.25
Nodes (7): Current Phase, Key Metrics, Known Issues, Next Steps, Project Status, Questions or Feedback, Recent Changes

### Community 36 - "Community 36"
Cohesion: 0.29
Nodes (7): Done, Done, Phase B: History That Explains Change, Remaining, Remaining, Status, Status

### Community 37 - "Community 37"
Cohesion: 0.29
Nodes (7): Done, Done, Phase C: Recommendation Engine Upgrade, Remaining, Remaining, Status, Status

### Community 38 - "Community 38"
Cohesion: 0.29
Nodes (7): Done, Done, Phase D: Import / Export Reliability, Remaining, Remaining, Status, Status

### Community 39 - "Community 39"
Cohesion: 0.4
Nodes (4): Code Changes, Contributing, License, Reporting Issues

### Community 40 - "Community 40"
Cohesion: 0.4
Nodes (5): Done, Done, Phase A: Forms-first Foundation, Remaining, Status

### Community 41 - "Community 41"
Cohesion: 0.4
Nodes (5): Implemented, Implemented, Import / Export, Pending, Pending

### Community 42 - "Community 42"
Cohesion: 0.4
Nodes (5): Phase E: Event-based Tracking, Remaining, Remaining, Status, Status

### Community 44 - "Community 44"
Cohesion: 0.5
Nodes (4): Current Build Status, Done, Partially Done, Pending

### Community 45 - "Community 45"
Cohesion: 0.5
Nodes (4): Current core entities, Current storage, Data Model, Planned later entities

### Community 47 - "Community 47"
Cohesion: 0.67
Nodes (3): Completed baseline, Remaining UX work, UX Roadmap

### Community 48 - "Community 48"
Cohesion: 0.67
Nodes (3): Current Derived Logic, Implemented, Pending improvements

### Community 49 - "Community 49"
Cohesion: 0.67
Nodes (3): Implemented coverage, Pending coverage, Testing Status

## Knowledge Gaps
- **310 isolated node(s):** `config`, `name`, `version`, `private`, `predev` (+305 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Debt Crusher Product Plan` connect `Community 1` to `Community 36`, `Community 37`, `Community 38`, `Community 40`, `Community 41`, `Community 42`, `Community 44`, `Community 45`, `Community 47`, `Community 48`, `Community 49`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `createDefaultCustomStrategyWeights()` connect `Community 14` to `Community 4`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `config`, `name`, `version` to the rest of the system?**
  _310 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._