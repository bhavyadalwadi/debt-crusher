# Graph Report - debt-crusher  (2026-08-09)

## Corpus Check
- 89 files · ~77,124 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 632 nodes · 1096 edges · 40 communities (27 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `eb777375`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- types.ts
- backfill-operations.mjs
- debt-crusher Project Context
- verify-operations.mjs
- import-workbook.ts
- manual-workflow.tsx
- operations.ts
- build-template.mjs
- layout.tsx
- portfolio.ts
- debt-crusher Architecture
- debt-crusher Workflows
- debt-crusher Coding Rules
- debt-crusher Onboarding
- debt-crusher Decision Log
- repository_navigation.md
- graph_relationships.md
- known_pitfalls.md
- system_prompt.md
- auth.ts
- screenshot-import.ts
- review-store.ts
- Debt Crusher Product Plan
- Debt Crusher User Guide
- compilerOptions
- Issues Found & Fixed
- Finance Console
- dependencies
- Debt Crusher
- scripts
- Contributing
- architecture_review.md
- debug.md
- feature.md
- incident_response.md
- performance_analysis.md
- refactor.md
- next.config.ts
- next-env.d.ts

## God Nodes (most connected - your core abstractions)
1. `savePortfolioBundle()` - 19 edges
2. `scripts` - 17 edges
3. `compilerOptions` - 16 edges
4. `debt-crusher Project Context` - 16 edges
5. `Finance Console` - 15 edges
6. `debt-crusher Architecture` - 14 edges
7. `Debt Crusher User Guide` - 14 edges
8. `parseCreditRows()` - 13 edges
9. `loadOperationsData()` - 13 edges
10. `loadPortfolioBundle()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `portfolioStateToDb()`  [EXTRACTED]
  app/api/manual-entry/route.ts → lib/persistence.ts
- `POST()` --calls--> `createEmptyPortfolio()`  [EXTRACTED]
  app/api/manual-entry/route.ts → lib/portfolio.ts
- `GET()` --calls--> `loadActionSummary()`  [EXTRACTED]
  app/api/operations/actions/route.ts → lib/operations-store.ts
- `GET()` --calls--> `loadOperationsData()`  [EXTRACTED]
  app/api/operations/config/route.ts → lib/operations-store.ts
- `PATCH()` --calls--> `loadOperationsData()`  [EXTRACTED]
  app/api/operations/config/route.ts → lib/operations-store.ts

## Import Cycles
- None detected.

## Communities (40 total, 13 thin omitted)

### Community 0 - "types.ts"
Cohesion: 0.08
Nodes (48): CashAccountsView(), CashAccountsViewProps, numberValue(), columnHelper, CreditCardsView(), CreditCardsViewProps, formatAutoPayment(), nullableNumberValue() (+40 more)

### Community 1 - "backfill-operations.mjs"
Cohesion: 0.60
Nodes (4): autopayMode(), canonicalize(), main(), prisma

### Community 2 - "debt-crusher Project Context"
Cohesion: 0.12
Nodes (16): Business Purpose, Critical Dependencies, Current Architecture Themes, debt-crusher Project Context, Deployment Model, Environments, Important APIs, Important Databases (+8 more)

### Community 4 - "import-workbook.ts"
Cohesion: 0.14
Nodes (33): CASH_HEADER_ALIASES, CashBaseRow, CREDIT_HEADER_ALIASES, CreditBaseRow, findHeaderRowIndex(), headerIndexMap(), importWorkbook(), isBlankMatrixRow() (+25 more)

### Community 5 - "manual-workflow.tsx"
Cohesion: 0.21
Nodes (10): CardEntryForm(), jsonRequest(), ManualWorkflow(), MonthlyReview(), OperationsConfig, PromoForm(), ReviewItem, ReviewState (+2 more)

### Community 6 - "operations.ts"
Cohesion: 0.17
Nodes (21): AccountForecast, assessPromotion(), AutopayMode, buildCashForecast(), centsToMoney(), ForecastEvent, isoDate(), moneyToCents() (+13 more)

### Community 9 - "build-template.mjs"
Cohesion: 0.22
Nodes (6): cashSheet, creditSheet, outputDir, outputPath, setupSheet, workbook

### Community 14 - "portfolio.ts"
Cohesion: 0.07
Nodes (63): GET(), POST(), POST(), runtime, DebtCrusherApp(), views, ImportPanel(), ImportPanelProps (+55 more)

### Community 16 - "debt-crusher Architecture"
Cohesion: 0.13
Nodes (14): Auth Flow, Caching Layers, debt-crusher Architecture, Deployment Topology, End-to-End Request Flows, Event-Driven Architecture, Failover Behavior, Frontend / Backend Interaction (+6 more)

### Community 17 - "debt-crusher Workflows"
Cohesion: 0.18
Nodes (10): debt-crusher Workflows, Debugging, Deployment, Feature Rollout, Incident Response, Local Development, Migrations, Observability Investigation (+2 more)

### Community 18 - "debt-crusher Coding Rules"
Cohesion: 0.20
Nodes (9): API Conventions, Architecture Patterns, Database / Migration Patterns, debt-crusher Coding Rules, Error Handling / Logging, Naming / Structure, State Management, Testing Conventions (+1 more)

### Community 19 - "debt-crusher Onboarding"
Cohesion: 0.29
Nodes (6): Critical Entrypoints, debt-crusher Onboarding, First Read, How To Start Reasoning, Local Run Baseline, Module Map

### Community 20 - "debt-crusher Decision Log"
Cohesion: 0.40
Nodes (4): debt-crusher Decision Log, Forms-first over workbook-first, Graphify-first repo discovery, Preserve repo separation

### Community 21 - "repository_navigation.md"
Cohesion: 0.50
Nodes (3): Critical Entrypoints, Read First, Top-Level Modules

### Community 31 - "auth.ts"
Cohesion: 0.17
Nodes (20): POST(), SignInPage(), POST(), SignInForm(), constantTimeEqual(), createSessionToken(), getSessionCookieName(), getSessionCookieOptions() (+12 more)

### Community 33 - "screenshot-import.ts"
Cohesion: 0.18
Nodes (16): POST(), runtime, analyzeScreenshotImport(), chooseAvailableBalance(), chooseCurrentBalance(), cleanText(), engData, inferKind() (+8 more)

### Community 43 - "review-store.ts"
Cohesion: 0.07
Nodes (43): canonicalize(), day, entry, nullableMoney, POST(), runtime, GET(), runtime (+35 more)

### Community 50 - "Debt Crusher Product Plan"
Cohesion: 0.08
Nodes (26): Core data groups, Current Architecture, Current Build Status, Current Operational Logic, Debt Crusher Product Plan, Done, Execution Phases, Forecasting (+18 more)

### Community 51 - "Debt Crusher User Guide"
Cohesion: 0.10
Nodes (21): Cash Accounts, Credit Cards, Current Limits, Dashboard, Debt Crusher User Guide, Fast Operational Updates, First-Time Local Setup, Import, Backup, and Export (+13 more)

### Community 52 - "compilerOptions"
Cohesion: 0.07
Nodes (26): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+18 more)

### Community 53 - "Issues Found & Fixed"
Cohesion: 0.11
Nodes (18): Environment Blockers, How to Verify Fixes, Issue #1: Missing credit_limit calculation ✅ FIXED, Issue #2: Null institution/accountName fields ✅ FIXED, Issue #3: Date field parsing failure ✅ FIXED, Issue #4: Parenthetical negatives not extracted ✅ FIXED, Issue #5: Over-matching single-value lines ✅ FIXED, Issue #6: Unstable candidate IDs ✅ FIXED (+10 more)

### Community 54 - "Finance Console"
Cohesion: 0.12
Nodes (15): Critical Workflows, Dangerous Code Paths, Databases Used, Dependencies, Failure Modes, Finance Console, Important Source Files, Inbound APIs (+7 more)

### Community 56 - "dependencies"
Cohesion: 0.09
Nodes (23): next, dependencies, next, prisma, @prisma/client, react, react-dom, recharts (+15 more)

### Community 57 - "Debt Crusher"
Cohesion: 0.06
Nodes (32): 1. Set local env, 2. Generate Prisma client and push the schema, 3. Start the app, 4. Vercel, Local Database Setup, Operations-core database rollout, Current Priority, Debt Crusher Project Status (+24 more)

### Community 58 - "scripts"
Cohesion: 0.06
Nodes (31): devDependencies, @types/node, @types/react, @types/react-dom, typescript, vitest, name, private (+23 more)

### Community 61 - "Contributing"
Cohesion: 0.40
Nodes (4): Code Changes, Contributing, License, Reporting Issues

## Knowledge Gaps
- **294 isolated node(s):** `runtime`, `nullableMoney`, `day`, `entry`, `runtime` (+289 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Debt Crusher Product Plan` connect `Debt Crusher Product Plan` to `Debt Crusher`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `Debt Crusher User Guide` connect `Debt Crusher User Guide` to `Debt Crusher`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `SetupConfig` connect `types.ts` to `import-workbook.ts`, `manual-workflow.tsx`, `portfolio.ts`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `runtime`, `nullableMoney`, `day` to the rest of the system?**
  _294 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07656341320864991 - nodes in this community are weakly interconnected._
- **Should `debt-crusher Project Context` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `import-workbook.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1365079365079365 - nodes in this community are weakly interconnected._