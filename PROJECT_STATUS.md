# Project Status

- Review State: Reviewed
- Source Type: project_status
- Confidence: high
- Last Updated: 2026-05-31T08:10:00.000Z

## What This Repo Is For
Debt Crusher is a forms-first finance workspace for managing credit cards, cash accounts, payoff priorities, and progress history.

## Category
Finance / decision support

## Benefit
Helps make clearer debt-payoff decisions and track progress without falling back to spreadsheets.

## Current Status
Implemented: - forms-first CRUD flow for cards, cash accounts, and settings - explainable recommendation engine baseline - history snapshots and trend charts - searchable institution picker - workbook import/export and JSON backup restore/export - screenshot OCR import with review-before-save and stored source screenshots Still planned: - native iPhone wrapper / true Share Sheet target if we want direct iOS intake - richer recommendation logic - stronger historical comparison views - more explicit event-level tracking - better notification polish - optional hosted persistence migration later

## Current Plan
Turn Debt Crusher into a forms-first finance console where the app is the primary source of truth, workbook import is a secondary bootstrap/backup path, and saved history supports payoff decisions and progress tracking.

## Done
- manages credit cards, cash accounts, and setup values in a forms-first UI - stores data locally with Prisma and SQLite for development - computes dashboard metrics such as total balance, utilization, cash above minimums, and top payoff target - explains the top recommendation rather than only giving a raw rank - supports payoff strategy modes such as avalanche, snowball, promo-first, and custom weighting - keeps snapshot history, trend views, and event-style save history - supports workbook import/export plus JSON backup export/restore - supports screenshot OCR intake, review-before-save, and saved screenshot artifacts

## Next Step
Decide whether to keep screenshot intake web-only or add a native iPhone wrapper with a true Share Sheet target and Shortcut entrypoint. After that: event-level tracking and optional hosted persistence migration.

## Working Status
Status: Working
Reason: Screenshot OCR import, review-before-save flow, and screenshot artifact storage shipped this session.

## Completion
Percentage: 97
Rationale: Shipped this session: screenshot OCR import, review-before-save editing, saved screenshot artifacts, and history links back to source screenshots. Remaining: native iPhone wrapper if desired, event-level tracking, optional Neon migration.

## Attention Now
Level: Medium
Why: Core daily-use workflow is now stronger for manual bank screenshot capture. The main open product decision is whether to stay web-only or add a native iPhone shell for direct Share Sheet intake.

## Main Blocker
No daily-use blocker. The main open gap is native iPhone integration; current screenshot intake still starts from the web app upload path.

## Ecosystem
Decision support ecosystem

## Merge Candidate
Candidate: No
Reason: No merge recommendation has been explicitly reviewed for this repo yet.

## Evidence
- README.md
- PLAN.md
- Plan.md
- graphify-out/repo-semantic-summary.md
