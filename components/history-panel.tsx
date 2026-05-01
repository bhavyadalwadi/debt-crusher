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
                  : "Manual save"}
              </span>
              <span>
                Credit {currencyFormatter.format(snapshot.dashboardSummary.total_credit_balance)}
              </span>
              {snapshot.deltaFromPrevious ? (
                <span>
                  Δ credit {formatDelta(snapshot.deltaFromPrevious.creditBalanceChange)}
                </span>
              ) : null}
              {formatChangeSummary(snapshot) ? (
                <span>{formatChangeSummary(snapshot)}</span>
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
