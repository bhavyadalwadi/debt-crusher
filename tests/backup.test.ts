import { describe, expect, it } from "vitest";

import { createPortfolioBackup, parsePortfolioBackup } from "@/lib/backup";
import {
  buildActivitySnapshot,
  buildComputedSnapshot,
  createEmptyPortfolio,
} from "@/lib/portfolio";
import type { ActivityEvent, PortfolioState } from "@/lib/types";

function portfolioFixture(): PortfolioState {
  return {
    ...createEmptyPortfolio(),
    id: "portfolio-1",
    updatedAt: "2026-08-12T12:00:00.000Z",
  };
}

describe("portfolio JSON backups", () => {
  it("creates and parses a complete version 2 backup", () => {
    const portfolio = portfolioFixture();
    const snapshot = buildComputedSnapshot(portfolio, {
      id: "snapshot-1",
      source: "manual_save",
      importedAt: "2026-08-12T12:00:00.000Z",
      label: "August update",
    });
    const event: ActivityEvent = {
      id: "event-1",
      snapshotId: snapshot.id,
      kind: "setup_changed",
      entityType: "setup",
      entityId: portfolio.id,
      entityName: "Portfolio setup",
      amountDelta: null,
      summary: "Setup changed",
      occurredAt: "2026-08-12T12:00:00.000Z",
    };

    const backup = createPortfolioBackup({
      portfolio,
      snapshots: [snapshot],
      events: [event],
      exportedAt: "2026-08-12T12:30:00.000Z",
    });
    const parsed = parsePortfolioBackup(JSON.stringify(backup));

    expect(backup.version).toBe(2);
    expect(parsed).toEqual({
      sourceVersion: 2,
      exportedAt: "2026-08-12T12:30:00.000Z",
      portfolio,
      snapshots: [snapshot],
      events: [event],
    });
  });

  it("accepts legacy portfolio-only backups with empty history", () => {
    const portfolio = portfolioFixture();

    expect(parsePortfolioBackup({ portfolio })).toEqual({
      sourceVersion: 1,
      exportedAt: null,
      portfolio,
      snapshots: [],
      events: [],
    });
  });

  it("preserves history from the previous unversioned export shape", () => {
    const portfolio = portfolioFixture();
    const snapshot = buildActivitySnapshot(portfolio, "manual_save");

    expect(
      parsePortfolioBackup({
        exportedAt: "2026-08-12T12:30:00.000Z",
        portfolio,
        snapshots: [snapshot],
      }).snapshots,
    ).toEqual([snapshot]);
  });

  it("rejects invalid JSON, unknown versions, and malformed history", () => {
    const portfolio = portfolioFixture();

    expect(() => parsePortfolioBackup("{")).toThrow("not valid JSON");
    expect(() => parsePortfolioBackup({ version: 3, portfolio })).toThrow(
      "Unsupported backup version: 3",
    );
    expect(() =>
      parsePortfolioBackup({
        version: 2,
        exportedAt: "2026-08-12T12:30:00.000Z",
        portfolio,
        snapshots: [{}],
        events: [],
      }),
    ).toThrow("invalid snapshots");
  });
});
