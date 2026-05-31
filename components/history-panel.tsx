"use client";

import { currencyFormatter } from "@/lib/format";
import type { ActivityEvent, ActivitySnapshot, NamedDelta } from "@/lib/types";

interface HistoryPanelProps {
  snapshots: ActivitySnapshot[];
  recentEvents: ActivityEvent[];
}

export function HistoryPanel({ snapshots, recentEvents }: HistoryPanelProps) {
  function formatDelta(value: number) {
    const prefix = value > 0 ? "+" : "";
    return `${prefix}${currencyFormatter.format(value)}`;
  }

  function formatPctDelta(value: number) {
    const prefix = value > 0 ? "+" : "";
    return `${prefix}${value.toFixed(1)}%`;
  }

  /**
   * Renders a single comparison metric with directional arrow and color.
   * lower_is_better=true means a negative delta is good (e.g., balance going down).
   */
  function ComparisonChip({
    label,
    delta,
    pctDelta,
    lowerIsBetter,
  }: {
    label: string;
    delta: number;
    pctDelta: number | null;
    lowerIsBetter: boolean;
  }) {
    if (delta === 0) return null;
    const improved = lowerIsBetter ? delta < 0 : delta > 0;
    const arrow = delta < 0 ? "↓" : "↑";
    const tone = improved ? "comparison-chip good" : "comparison-chip bad";
    return (
      <span className={tone} title={label}>
        {arrow} {label}: {formatDelta(delta)}
        {pctDelta !== null ? ` (${formatPctDelta(pctDelta)})` : ""}
      </span>
    );
  }

  function renderComparisonRow(snapshot: ActivitySnapshot, prevSnapshot: ActivitySnapshot | null) {
    if (!snapshot.deltaFromPrevious || !prevSnapshot) return null;
    const d = snapshot.deltaFromPrevious;

    const prevBalance = prevSnapshot.dashboardSummary.total_credit_balance;
    const prevCash = prevSnapshot.dashboardSummary.total_cash_above_minimums;
    const prevUtil = prevSnapshot.dashboardSummary.weighted_utilization_percent;
    const currUtil = snapshot.dashboardSummary.weighted_utilization_percent;
    const utilizationDelta = currUtil - prevUtil;

    const creditPct = prevBalance !== 0 ? (d.creditBalanceChange / prevBalance) * 100 : null;
    const cashPct = prevCash !== 0 ? (d.cashAboveMinimumChange / prevCash) * 100 : null;

    return (
      <div className="comparison-row">
        <span className="comparison-label">vs prev</span>
        <ComparisonChip
          label="Credit"
          delta={d.creditBalanceChange}
          pctDelta={creditPct}
          lowerIsBetter={true}
        />
        <ComparisonChip
          label="Cash"
          delta={d.cashAboveMinimumChange}
          pctDelta={cashPct}
          lowerIsBetter={false}
        />
        {utilizationDelta !== 0 ? (
          <span className={`comparison-chip ${utilizationDelta < 0 ? "good" : "bad"}`}>
            {utilizationDelta < 0 ? "↓" : "↑"} Util: {formatPctDelta(utilizationDelta)}
          </span>
        ) : null}
      </div>
    );
  }

  function renderNamedDeltas(title: string, deltas: NamedDelta[] | undefined) {
    if (!deltas || deltas.length === 0) {
      return null;
    }

    return (
      <div className="history-subsection">
        <strong>{title}</strong>
        {deltas.map((entry) => (
          <span key={`${title}-${entry.name}`}>
            {entry.name}: {formatDelta(entry.delta)}
          </span>
        ))}
      </div>
    );
  }

  function formatChangeSummary(snapshot: ActivitySnapshot) {
    if (!snapshot.changeSummary) {
      return null;
    }

    const bits: string[] = [];
    if (snapshot.changeSummary.creditAccountsAdded > 0) {
      bits.push(`+${snapshot.changeSummary.creditAccountsAdded} card`);
    }
    if (snapshot.changeSummary.creditAccountsRemoved > 0) {
      bits.push(`-${snapshot.changeSummary.creditAccountsRemoved} card`);
    }
    if (snapshot.changeSummary.cashAccountsAdded > 0) {
      bits.push(`+${snapshot.changeSummary.cashAccountsAdded} cash`);
    }
    if (snapshot.changeSummary.cashAccountsRemoved > 0) {
      bits.push(`-${snapshot.changeSummary.cashAccountsRemoved} cash`);
    }

    return bits.length > 0 ? bits.join(" • ") : null;
  }

  return (
    <section className="history-panel">
      <div className="history-header">
        <div>
          <p className="eyebrow">Activity History</p>
          <h3>Saves and imports stay local to this browser.</h3>
        </div>
        <span className="history-count">{snapshots.length} saved</span>
      </div>
      <div className="history-list">
        {snapshots.length === 0 ? (
          <p className="empty-copy">
            No saves yet. Import a workbook or save form changes to start
            tracking history.
          </p>
        ) : (
          snapshots.map((snapshot, index) => (
            <div
              key={snapshot.id}
              className={`history-item${index === 0 ? " active" : ""}`}
            >
              <strong>{snapshot.label}</strong>
              <span>
                {snapshot.source === "import"
                  ? snapshot.filename || "Workbook import"
                  : snapshot.source === "screenshot_import"
                    ? snapshot.filename || "Screenshot import"
                    : "Manual save"}
              </span>
              {snapshot.sourceArtifact ? (
                <a
                  className="text-link"
                  href={`/api/screenshot-import/artifacts/${snapshot.sourceArtifact.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View saved screenshot
                </a>
              ) : null}
              <span>
                Credit {currencyFormatter.format(snapshot.dashboardSummary.total_credit_balance)}
              </span>
              {renderComparisonRow(snapshot, snapshots[index + 1] ?? null)}
              {formatChangeSummary(snapshot) ? (
                <span className="change-summary">{formatChangeSummary(snapshot)}</span>
              ) : null}
              {snapshot.changeDetail?.creditAddedNames.length ? (
                <span>
                  Added cards: {snapshot.changeDetail.creditAddedNames.join(", ")}
                </span>
              ) : null}
              {snapshot.changeDetail?.cashAddedNames.length ? (
                <span>
                  Added cash: {snapshot.changeDetail.cashAddedNames.join(", ")}
                </span>
              ) : null}
              {snapshot.changeDetail?.setupChanges.length ? (
                <span>
                  Setup: {snapshot.changeDetail.setupChanges.join(", ")}
                </span>
              ) : null}
              {renderNamedDeltas(
                "Card balance moves",
                snapshot.changeDetail?.creditBalanceChanges,
              )}
              {renderNamedDeltas(
                "Cash balance moves",
                snapshot.changeDetail?.cashBalanceChanges,
              )}
              <span>
                {new Date(snapshot.importedAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="history-events">
        <div className="history-subheader">
          <p className="eyebrow">Recent Events</p>
        </div>
        {recentEvents.length === 0 ? (
          <p className="empty-copy">No event trail yet.</p>
        ) : (
          recentEvents.slice(0, 10).map((event) => (
            <div key={event.id} className="event-item">
              <strong>{event.entityName}</strong>
              <span>{event.summary}</span>
              {event.amountDelta !== null ? (
                <span>{formatDelta(event.amountDelta)}</span>
              ) : null}
              <span>
                {new Date(event.occurredAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
