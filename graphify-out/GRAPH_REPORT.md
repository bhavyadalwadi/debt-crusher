# Graph Report - debt-crusher  (2026-08-30)

## Corpus Check
- 180 files · ~139,132 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1469 nodes · 2350 edges · 133 communities (111 shown, 22 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7c6b7b0c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- cash-accounts-view.tsx
- backfill-operations.mjs
- debt-crusher Project Context
- verify-operations.mjs
- import-workbook.ts
- manual-workflow.tsx
- operations.ts
- portfolio-store.ts
- Organizations (B2B SaaS)
- build-template.mjs
- layout.tsx
- Debt Crusher Mobile App Plan
- requireOwnerContext
- Debt Crusher Financial Integration Security Review
- debt-crusher-app.tsx
- manual-entry/route.ts
- debt-crusher Architecture
- debt-crusher Workflows
- debt-crusher Coding Rules
- debt-crusher Onboarding
- debt-crusher Decision Log
- repository_navigation.md
- graph_relationships.md
- known_pitfalls.md
- types.ts
- trend-panels.tsx
- Adding Clerk
- compilerOptions
- bank-sync-panel.tsx
- system_prompt.md
- form-validation.ts
- rotate-financial-token-key.mjs
- screenshot-import.ts
- plaid-webhook.ts
- clerk-backend-api/SKILL.md
- nextjs-basic-auth/package.json
- token-envelope.ts
- validation.ts
- credit-cards-view.tsx
- security.ts
- Webhooks
- Custom Sign-In Flow
- Custom Sign-Up Flow
- backup.ts
- release-environment.mjs
- `<Show>` Component
- Debt Crusher Product Plan
- Debt Crusher User Guide
- compilerOptions
- Issues Found & Fixed
- Finance Console
- dashboard-view.tsx
- dependencies
- Debt Crusher
- scripts
- Clerk CLI - Recipes
- Clerk CLI
- Custom UI
- Next.js Patterns
- architecture_review.md
- debug.md
- feature.md
- incident_response.md
- performance_analysis.md
- refactor.md
- next.config.ts
- next-env.d.ts
- Troubleshooting
- Sign-In Flow
- Custom Sign-Up Flow (Core 2)
- Organization Invitations
- Roles and Permissions
- Clerk Security Runbook
- Clerk CLI - Authentication & Targeting Reference
- Enterprise SSO
- Step-by-step local setup
- Clerk CLI - Agent Mode Reference
- Server vs Client
- Testing
- Framework-Specific Webhook Handlers
- bank-sync.ts
- Step-by-step Vercel and Neon staging setup
- Patterns for agent-driven use
- Middleware Strategies
- Next.js Patterns for Organizations
- Pre-Production Checklist
- Upgrading an existing SQLite database
- Using Plaid Sandbox
- Testing and verification
- API Routes
- Caching with Auth
- Server Actions
- Security boundaries
- Secret and Key Management
- Agent-first: Provision via CLI
- Prerequisites
- Architecture
- Data model
- bank-connections/route.ts
- api-specs-context.sh
- execute-request.sh
- extract-endpoint-detail.sh
- extract-tag-endpoints.sh
- proxy.ts
- changes/route.ts
- SDK Notes
- proxy.ts
- Plaid Sandbox Staging Runbook
- Local Database Setup
- Local Plaid Webhook Tunnel
- Debt Crusher Project Status
- Project Status
- Contributing
- plaid-webhook.test.ts
- Operations-core database rollout
- ScreenshotImportExtraction
- Setup Process
- Migrations and data movement

## God Nodes (most connected - your core abstractions)
1. `requireOwnerContext()` - 51 edges
2. `safeRouteError()` - 47 edges
3. `assertSameOrigin()` - 36 edges
4. `financialJson()` - 25 edges
5. `readBoundedJson()` - 24 edges
6. `scripts` - 23 edges
7. `Debt Crusher` - 23 edges
8. `savePortfolioBundle()` - 22 edges
9. `Debt Crusher Financial Integration Security Review` - 18 edges
10. `loadPortfolioBundle()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `requireOwnerContext()`  [EXTRACTED]
  app/api/screenshot-import/artifacts/[artifactId]/route.ts → lib/security.ts
- `POST()` --calls--> `assertSameOrigin()`  [EXTRACTED]
  app/api/bank-accounts/[accountId]/match/route.ts → lib/security.ts
- `POST()` --calls--> `enforceRateLimit()`  [EXTRACTED]
  app/api/bank-accounts/[accountId]/match/route.ts → lib/security.ts
- `POST()` --calls--> `financialJson()`  [EXTRACTED]
  app/api/bank-accounts/[accountId]/match/route.ts → lib/security.ts
- `POST()` --calls--> `readBoundedJson()`  [EXTRACTED]
  app/api/bank-accounts/[accountId]/match/route.ts → lib/security.ts

## Import Cycles
- None detected.

## Communities (133 total, 22 thin omitted)

### Community 0 - "cash-accounts-view.tsx"
Cohesion: 0.18
Nodes (14): CashAccountsView(), CashAccountsViewProps, numberValue(), InstitutionCombobox(), InstitutionComboboxProps, matchesOption(), LABELS, StatusBadge() (+6 more)

### Community 1 - "backfill-operations.mjs"
Cohesion: 0.60
Nodes (4): autopayMode(), canonicalize(), main(), prisma

### Community 2 - "debt-crusher Project Context"
Cohesion: 0.12
Nodes (16): Business Purpose, Critical Dependencies, Current Architecture Themes, debt-crusher Project Context, Deployment Model, Environments, Important APIs, Important Databases (+8 more)

### Community 4 - "import-workbook.ts"
Cohesion: 0.08
Nodes (54): buildDashboardSummary(), buildRecommendedTargetReasons(), CashBaseRow, computePriorityScore(), CreditBaseRow, deriveCashAccounts(), deriveCreditAccounts(), diffInDays() (+46 more)

### Community 5 - "manual-workflow.tsx"
Cohesion: 0.21
Nodes (10): CardEntryForm(), jsonRequest(), ManualWorkflow(), MonthlyReview(), OperationsConfig, PromoForm(), ReviewItem, ReviewState (+2 more)

### Community 6 - "operations.ts"
Cohesion: 0.16
Nodes (22): AccountForecast, assessPromotion(), AutopayMode, buildCashForecast(), centsToMoney(), ForecastEvent, isoDate(), Money (+14 more)

### Community 7 - "portfolio-store.ts"
Cohesion: 0.10
Nodes (47): command, GET(), POST(), runtime, activityEventToDb(), activitySnapshotToDb(), cashAccountToDb(), creditAccountToDb() (+39 more)

### Community 8 - "Organizations (B2B SaaS)"
Cohesion: 0.06
Nodes (31): 1. Read Organization from Auth, 2. Dynamic Routes with Org Slug, 3. Role-Based Access Control, 4. Conditional Rendering with `<Show>`, 5. OrganizationSwitcher, 6. Session Task — Choose Organization, Agent-first: Programmatic org management, Authorization Pattern (Complete Example) (+23 more)

### Community 9 - "build-template.mjs"
Cohesion: 0.22
Nodes (6): cashSheet, creditSheet, outputDir, outputPath, setupSheet, workbook

### Community 11 - "Debt Crusher Mobile App Plan"
Cohesion: 0.15
Nodes (12): Current State and Baseline, Data, Connectivity, and Security, Debt Crusher Mobile App Plan, Milestones, Mobile API Contracts, Native Product Scope, Objective, Platform integrations (+4 more)

### Community 12 - "requireOwnerContext"
Cohesion: 0.20
Nodes (24): POST(), schema, POST(), PATCH(), POST(), POST(), schema, GET() (+16 more)

### Community 13 - "Debt Crusher Financial Integration Security Review"
Cohesion: 0.07
Nodes (30): Architecture Assessment, Authentication Assessment, Authorization Assessment, Backup operations without reverification, Critical Findings, CSP still requires inline script/style compatibility, Data Storage Assessment, Debt Crusher Financial Integration Security Review (+22 more)

### Community 14 - "debt-crusher-app.tsx"
Cohesion: 0.14
Nodes (25): DebtCrusherApp(), portfolioComparable(), portfolioFingerprint(), SaveStatus, snapshotFingerprint(), views, ImportPanel(), ImportPanelProps (+17 more)

### Community 15 - "manual-entry/route.ts"
Cohesion: 0.10
Nodes (26): canonicalize(), day, entry, nullableMoney, runtime, GET(), runtime, day (+18 more)

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

### Community 24 - "types.ts"
Cohesion: 0.24
Nodes (10): HistoryPanel(), HistoryPanelProps, ActivityEvent, ActivitySnapshot, AppView, LegacyPortfolioBackup, NamedDelta, NormalizedPortfolioBackup (+2 more)

### Community 25 - "trend-panels.tsx"
Cohesion: 0.16
Nodes (12): AccountMetric, AccountOption, chronologicalSnapshots(), downsampleTrend(), filterByRange(), formatCheckpoint(), PortfolioMetric, portfolioMetrics (+4 more)

### Community 26 - "Adding Clerk"
Cohesion: 0.18
Nodes (11): Adding Clerk, Common Pitfalls, Decision Tree, Detect Existing Auth, Documentation, Framework Detection, Migrating from Another Auth Provider, Migration Process (+3 more)

### Community 28 - "compilerOptions"
Cohesion: 0.07
Nodes (26): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+18 more)

### Community 29 - "bank-sync-panel.tsx"
Cohesion: 0.25
Nodes (10): BankSyncPanel(), Change, checked(), checkedReverified(), ConnectedAccount, Connection, formatValue(), MatchTarget (+2 more)

### Community 31 - "form-validation.ts"
Cohesion: 0.31
Nodes (8): DashboardView(), PayoffSettingsPanel(), weightLabels, FieldErrors, validateCashAccounts(), validateCreditAccounts(), validatePortfolio(), validateSetup()

### Community 32 - "rotate-financial-token-key.mjs"
Cohesion: 0.39
Nodes (7): decode(), encode(), keyFor(), nextVersion, prisma, unwrap(), wrap()

### Community 33 - "screenshot-import.ts"
Cohesion: 0.22
Nodes (14): analyzeScreenshotImport(), chooseAvailableBalance(), chooseCurrentBalance(), cleanText(), engData, inferKind(), normalizeMoney(), pickAccountName() (+6 more)

### Community 34 - "plaid-webhook.ts"
Cohesion: 0.27
Nodes (10): POST(), runtime, providerItemHash(), keyCache, processPlaidWebhookJob(), receivePlaidWebhook(), verificationKey(), verifyPlaidWebhook() (+2 more)

### Community 35 - "clerk-backend-api/SKILL.md"
Cohesion: 0.08
Nodes (25): 0. Print usage, 1. Fetch tags, 2. Fetch tag endpoints, 3. Fetch endpoint detail, 4. Execute request, API specs context, Clerk Backend API — Full Endpoint Reference, Create organization + invite member (two-step) (+17 more)

### Community 36 - "nextjs-basic-auth/package.json"
Cohesion: 0.09
Nodes (21): dependencies, @clerk/nextjs, next, react, react-dom, devDependencies, @types/react, @types/react-dom (+13 more)

### Community 37 - "token-envelope.ts"
Cohesion: 0.24
Nodes (11): decode(), decryptAesGcm(), decryptFinancialToken(), encode(), encryptAesGcm(), encryptFinancialToken(), KeyResolver, rewrapFinancialToken() (+3 more)

### Community 41 - "validation.ts"
Cohesion: 0.13
Nodes (13): autosaveRequestSchema, cashAccountSchema, checkpointRequestSchema, creditAccountSchema, nullableNumber, nullableString, persistenceVersionSchema, portfolioStateSchema (+5 more)

### Community 42 - "credit-cards-view.tsx"
Cohesion: 0.33
Nodes (10): columnHelper, CreditCardsView(), CreditCardsViewProps, formatAutoPayment(), nullableNumberValue(), numberValue(), formatPercentFromValue(), formatShortDate() (+2 more)

### Community 43 - "security.ts"
Cohesion: 0.27
Nodes (16): DELETE(), POST(), POST(), inputSchema, POST(), POST(), deleteDisconnectedConnectionData(), enforceRateLimit() (+8 more)

### Community 44 - "Webhooks"
Cohesion: 0.10
Nodes (19): Common Pitfalls, Complete Webhook Handler (Next.js App Router), Full Example: Organization Membership Sync to Database, Full Example: Welcome Email (Resend) + Slack Notification on user.created, Make the Webhook Route Public, Organization events (`organization.created`, `organization.updated`, `organization.deleted`), Organization Membership events (`organizationMembership.created`, `organizationMembership.updated`, `organizationMembership.deleted`), Other Frameworks (+11 more)

### Community 45 - "Custom Sign-In Flow"
Cohesion: 0.11
Nodes (18): Complete Example: Email/Password with MFA, Custom Sign-In Flow, Device Trust, Docs, Email Code, Error Handling, Finalizing Sign-In, Hook API (+10 more)

### Community 46 - "Custom Sign-Up Flow"
Cohesion: 0.11
Nodes (17): Complete Example: Phone OTP Sign-Up, Custom Sign-Up Flow, Docs, Email Code, Email Link, Email / Phone Verification, Error Handling, Finalizing Sign-Up (+9 more)

### Community 47 - "backup.ts"
Cohesion: 0.30
Nodes (11): BACKUP_FORMAT_VERSION, eventEntityTypes, eventKinds, isActivityEvent(), isActivitySnapshot(), isPortfolioState(), isRecord(), parsePortfolioBackup() (+3 more)

### Community 48 - "release-environment.mjs"
Cohesion: 0.36
Nodes (7): decodedBase64Bytes(), isHttpsUrl(), present(), usable(), validateReleaseEnvironment(), errors, base

### Community 49 - "`<Show>` Component"
Cohesion: 0.12
Nodes (15): Authentication State, Billing Feature Check, Billing Plan Check, Custom Condition (Function), Docs, Fallback Content, Import, Migration from Core 2 (+7 more)

### Community 50 - "Debt Crusher Product Plan"
Cohesion: 0.07
Nodes (27): Core data groups, Current Architecture, Current Build Status, Current Operational Logic, Debt Crusher Product Plan, Done, Execution Phases, Forecasting (+19 more)

### Community 51 - "Debt Crusher User Guide"
Cohesion: 0.08
Nodes (25): Bank Sync, Cash Accounts, Credit Cards, Current Limits, Dashboard, Debt Crusher User Guide, Fast Operational Updates, First-Time Local Setup (+17 more)

### Community 52 - "compilerOptions"
Cohesion: 0.07
Nodes (27): .next/dev/types/**/*.ts, compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+19 more)

### Community 53 - "Issues Found & Fixed"
Cohesion: 0.11
Nodes (18): Environment Blockers, How to Verify Fixes, Issue #1: Missing credit_limit calculation ✅ FIXED, Issue #2: Null institution/accountName fields ✅ FIXED, Issue #3: Date field parsing failure ✅ FIXED, Issue #4: Parenthetical negatives not extracted ✅ FIXED, Issue #5: Over-matching single-value lines ✅ FIXED, Issue #6: Unstable candidate IDs ✅ FIXED (+10 more)

### Community 54 - "Finance Console"
Cohesion: 0.12
Nodes (15): Critical Workflows, Dangerous Code Paths, Databases Used, Dependencies, Failure Modes, Finance Console, Important Source Files, Inbound APIs (+7 more)

### Community 55 - "dashboard-view.tsx"
Cohesion: 0.21
Nodes (12): chartColors, DashboardViewProps, ActionSummary, amountLabel(), Config, OperationsPanel(), today(), currencyFormatter (+4 more)

### Community 56 - "dependencies"
Cohesion: 0.07
Nodes (29): exceljs, jose, dependencies, @clerk/nextjs, exceljs, jose, next, plaid (+21 more)

### Community 57 - "Debt Crusher"
Cohesion: 0.14
Nodes (14): Account-takeover response, API reference, Backups, Contents, Daily commands, Debt Crusher, Environment variables, Final invariants (+6 more)

### Community 58 - "scripts"
Cohesion: 0.04
Nodes (46): @clerk/testing, devDependencies, @clerk/testing, @playwright/test, prisma, @types/node, @types/react, @types/react-dom (+38 more)

### Community 59 - "Clerk CLI - Recipes"
Cohesion: 0.10
Nodes (20): Applications (Platform API), Clerk CLI - Recipes, Discovery first, Environment variables, Impersonation (sign in as a user), Instance configuration, Invitations (top-level, not org-scoped), JWT templates (+12 more)

### Community 60 - "Clerk CLI"
Cohesion: 0.14
Nodes (14): Agent-mode behavior (important), Clerk CLI, Core commands at a glance, Discover endpoints - don't memorize them, Execution environment (prefer the host, understand the sandbox warning), Inspecting large outputs (do not flood your context), Invoking the CLI, No login required (+6 more)

### Community 61 - "Custom UI"
Cohesion: 0.14
Nodes (13): Appearance Customization, Appearance Pattern, Common Pitfalls, Component Customization Options, Custom Flow References, Custom UI, options (structure, logo, social buttons), See Also (+5 more)

### Community 62 - "Next.js Patterns"
Cohesion: 0.14
Nodes (13): Common Pitfalls, Conditional Rendering with `<Show>`, Docs, getToken() for external APIs, Manual JWT verification (no Clerk middleware), Mental Model, Minimal Pattern, Next.js Patterns (+5 more)

### Community 69 - "next.config.ts"
Cohesion: 0.33
Nodes (4): clerkOrigin, csp, cspDirectives, nextConfig

### Community 71 - "Troubleshooting"
Cohesion: 0.14
Nodes (14): `403 Forbidden`, Build rejects the database URL, Clerk UI is blank or CSP-blocked, Data is stale, Link opens but exchange fails, MFA/reverification cannot complete, Missing tables/columns, No proposals appear (+6 more)

### Community 72 - "Sign-In Flow"
Cohesion: 0.15
Nodes (12): 1. Create Sign-In, 2. First Factor Verification, 3. Second Factor (MFA), 4. Finalize, Complete Example: Email/Password with MFA, Custom Sign-In Flow (Core 2), Docs, Error Handling (+4 more)

### Community 73 - "Custom Sign-Up Flow (Core 2)"
Cohesion: 0.17
Nodes (11): 1. Create Sign-Up, 2. Prepare Verification, 3. Attempt Verification, 4. Finalize, Complete Example: Email/Password with Email Verification, Custom Sign-Up Flow (Core 2), Docs, Error Handling (+3 more)

### Community 74 - "Organization Invitations"
Cohesion: 0.18
Nodes (10): Accept Invitations (Custom Flow), Built-in Invitation UI, Bulk Create, Create Invitation, Get a Single Invitation, Key Rules, List Invitations, Organization Invitations (+2 more)

### Community 76 - "Roles and Permissions"
Cohesion: 0.18
Nodes (10): Billing Gates Permissions, Change a User's Role, Checking Roles and Permissions, Custom Permissions, Custom Roles, Default Roles, Key Rules, Role Sets (+2 more)

### Community 77 - "Clerk Security Runbook"
Cohesion: 0.22
Nodes (9): Application environment variables, Change control, Clerk Security Runbook, Required access tests, Safe CLI verification, Security model, Sensitive-action reverification, Session or credential exposure response (+1 more)

### Community 78 - "Clerk CLI - Authentication & Targeting Reference"
Cohesion: 0.14
Nodes (14): Accountless: operating without an account, `--app` and `--instance` targeting, Auth commands, Backend API secret key resolution order, `clerk auth login`, `clerk auth logout`, Clerk CLI - Authentication & Targeting Reference, `clerk whoami` (+6 more)

### Community 79 - "Enterprise SSO"
Cohesion: 0.20
Nodes (9): Accessing SSO Info on the User, Common Mistakes, Configuration Flow, Custom Sign-In Flow with SSO, Enterprise SSO, JIT Provisioning (how SSO users auto-join), Key Rules, Strategy Name (+1 more)

### Community 80 - "Step-by-step local setup"
Cohesion: 0.20
Nodes (10): 1. Clone and enter the repository, 2. Configure Clerk, 3. Configure Plaid Sandbox, 4. Create `.env`, 5. Install dependencies, 6. Initialize a clean SQLite database, 7. Start the app, 8. Create trusted accounts (+2 more)

### Community 81 - "Clerk CLI - Agent Mode Reference"
Cohesion: 0.22
Nodes (9): Clerk CLI - Agent Mode Reference, Error output format, Exit codes, How agent mode is detected, Passing options as JSON: `--input-json`, Sandbox warning semantics, Structured outputs you can rely on, What changes in agent mode (+1 more)

### Community 82 - "Server vs Client"
Cohesion: 0.22
Nodes (8): Client Component, Conditional Rendering, CRITICAL: Always `await auth()`, Hybrid Pattern, Import Rules, Server Component, Server vs Client, When to Use

### Community 83 - "Testing"
Cohesion: 0.22
Nodes (8): Anti-Patterns, Best Practices, Decision Tree, Framework-Specific, Mental Model, See Also, Testing, Workflow

### Community 84 - "Framework-Specific Webhook Handlers"
Cohesion: 0.22
Nodes (8): Astro, Common Patterns Across Frameworks, Express, Fastify, Framework-Specific Webhook Handlers, Nuxt, React Router, TanStack Start

### Community 85 - "bank-sync.ts"
Cohesion: 0.13
Nodes (26): POST(), schema, CARD_FIELDS, CASH_FIELDS, createPlaidLinkSession(), disconnectFinancialConnection(), exchangePlaidPublicToken(), FinancialOwnerContext (+18 more)

### Community 86 - "Step-by-step Vercel and Neon staging setup"
Cohesion: 0.25
Nodes (8): 1. Create a Neon branch, 2. Initialize Neon, 3. Link Vercel, 4. Configure Preview-only variables, 5. Use a fixed webhook host, 6. Deploy Preview, 7. Complete the staging gate, Step-by-step Vercel and Neon staging setup

### Community 87 - "Patterns for agent-driven use"
Cohesion: 0.29
Nodes (7): Deploy handoff and verification, Diagnose before acting, Patterns for agent-driven use, Preview every mutation, Surface doctor remedies to the user, Target explicitly, Use the catalog, not hard-coded paths

### Community 88 - "Middleware Strategies"
Cohesion: 0.29
Nodes (6): Middleware Strategies, Permission-Gated Routes, Protected-First (internal tools, dashboards), Public-First (marketing sites, blogs), Session Tasks, Token-Based Protection (Machine APIs)

### Community 89 - "Next.js Patterns for Organizations"
Cohesion: 0.29
Nodes (6): API Route Example, Key Rules, Middleware: Role + Permission Protection, Next.js Patterns for Organizations, Server Actions: Scope Writes by `orgId`, URL Slug Safety Invariant

### Community 90 - "Pre-Production Checklist"
Cohesion: 0.18
Nodes (11): 1. Commit and deploy an isolated staging environment, 2. Rehearse migration and recovery, 3. Validate hosted Clerk authorization, 4. Complete the Plaid Sandbox gate, 5. Inspect hosted operational security, 6. Product acceptance, 7. Separate real-bank approval gate, Non-blocking product expansion (+3 more)

### Community 91 - "Upgrading an existing SQLite database"
Cohesion: 0.33
Nodes (6): 1. Stop and back up, 2. Inspect migration state, 3. Verify ownership, Already managed by Prisma migrations, Legacy database without migration tracking, Upgrading an existing SQLite database

### Community 92 - "Using Plaid Sandbox"
Cohesion: 0.33
Nodes (6): Connect, Connection states, Disconnect versus delete, Match accounts, Review fields, Using Plaid Sandbox

### Community 93 - "Testing and verification"
Cohesion: 0.25
Nodes (8): Browser release gates, Current test coverage, Daily checks, Dependency audit, Production-style build, Release environment checks, Schema checks, Testing and verification

### Community 95 - "API Routes"
Cohesion: 0.40
Nodes (4): 401 vs 403, API Routes, Auth Check Pattern, Org Route Protection

### Community 96 - "Caching with Auth"
Cohesion: 0.40
Nodes (4): Caching with Auth, Org-Scoped Cache, Revalidate After Updates, User-Scoped Cache

### Community 97 - "Server Actions"
Cohesion: 0.40
Nodes (4): Basic Protection, Org + Role Check (B2B), Permission Check (RBAC), Server Actions

### Community 98 - "Security boundaries"
Cohesion: 0.40
Nodes (5): Allowed Plaid behavior, Authentication and authorization, Explicitly prohibited, Financial credential protection, Security boundaries

### Community 99 - "Secret and Key Management"
Cohesion: 0.22
Nodes (9): Generate the initial keys, HMAC-key rotation, Provider-secret rotation, Secret and Key Management, Secret exposure check, Secret inventory, Storage and deployment rules, Token-wrapping key rotation (+1 more)

### Community 100 - "Agent-first: Provision via CLI"
Cohesion: 0.29
Nodes (7): Agent-first: Provision via CLI, Daily ops, Notes for agents, Rotate the secret key (replaces Dashboard rotation), Scenario A — New project, new Clerk app, Scenario B — Existing project, existing Clerk app, Scenario C — Existing project, new Clerk app

### Community 101 - "Prerequisites"
Cohesion: 0.50
Nodes (4): Complete Plaid flow, Hosted staging, Local development, Prerequisites

### Community 102 - "Architecture"
Cohesion: 0.67
Nodes (3): Architecture, Environment separation, Technology

### Community 103 - "Data model"
Cohesion: 0.67
Nodes (3): Data model, Plaid staging/security records, Trusted records

### Community 114 - "SDK Notes"
Cohesion: 0.29
Nodes (7): ClerkProvider Placement (Next.js), Dynamic Rendering (Next.js), Node.js Requirement, Package Names, SDK Notes, shadcn Theme, Themes Package

### Community 120 - "Plaid Sandbox Staging Runbook"
Cohesion: 0.25
Nodes (8): Compromise response, Database rollout, Key rotation, Local webhook tunnel, Plaid Sandbox Staging Runbook, Provisioning boundary, Release gate, Required staging exercise

### Community 121 - "Local Database Setup"
Cohesion: 0.29
Nodes (7): 1. Set local env, 2. Generate Prisma client and push the schema, 3. Start the app, 4. Vercel, Local Database Setup, Moving data between environments, Troubleshooting

### Community 122 - "Local Plaid Webhook Tunnel"
Cohesion: 0.29
Nodes (7): Local Plaid Webhook Tunnel, Shutdown, Start local services, Test an authentic Sandbox webhook, Tunnel lifecycle, Validate without printing secrets, What the tunnel exposes

### Community 123 - "Debt Crusher Project Status"
Cohesion: 0.29
Nodes (7): Current Priority, Debt Crusher Project Status, Evidence, Implemented, Main Risk, Purpose, Remaining

### Community 124 - "Project Status"
Cohesion: 0.29
Nodes (7): Completed Locally, Current Phase, Documentation, Key Metrics, Known Issues and Limits, Next Steps, Project Status

### Community 125 - "Contributing"
Cohesion: 0.40
Nodes (4): Code Changes, Contributing, License, Reporting Issues

### Community 130 - "ScreenshotImportExtraction"
Cohesion: 0.40
Nodes (5): ScreenshotReviewDraft, ScreenshotReviewPanel(), ScreenshotReviewPanelProps, ScreenshotImportAnalysis, ScreenshotImportExtraction

### Community 131 - "Setup Process"
Cohesion: 0.40
Nodes (5): 1. Detect the Framework, 2. Fetch the Quickstart Guide, 3. Follow the Instructions, 4. Get API Keys, Setup Process

### Community 132 - "Migrations and data movement"
Cohesion: 0.67
Nodes (3): Data movement, Migrations and data movement, Prisma schemas

## Knowledge Gaps
- **830 isolated node(s):** `api-specs-context.sh script`, `execute-request.sh script`, `extract-endpoint-detail.sh script`, `extract-tag-endpoints.sh script`, `name` (+825 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Debt Crusher` connect `Debt Crusher` to `Security boundaries`, `Migrations and data movement`, `Prerequisites`, `Architecture`, `Data model`, `Troubleshooting`, `Upgrading an existing SQLite database`, `Step-by-step local setup`, `Step-by-step Vercel and Neon staging setup`, `README.md`, `Using Plaid Sandbox`, `Testing and verification`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `Debt Crusher Financial Integration Security Review` connect `Debt Crusher Financial Integration Security Review` to `README.md`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `Debt Crusher Product Plan` connect `Debt Crusher Product Plan` to `README.md`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `api-specs-context.sh script`, `execute-request.sh script`, `extract-endpoint-detail.sh script` to the rest of the system?**
  _830 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `debt-crusher Project Context` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `import-workbook.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08192090395480225 - nodes in this community are weakly interconnected._
- **Should `portfolio-store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09506531204644413 - nodes in this community are weakly interconnected._