"use client";

import type { ScreenshotImportExtraction } from "@/lib/types";

export interface ScreenshotReviewDraft extends ScreenshotImportExtraction {
  fileName: string;
  mimeType: string;
  extractedText: string;
  institution: string;
  accountName: string;
}

interface ScreenshotReviewPanelProps {
  draft: ScreenshotReviewDraft;
  warnings: string[];
  saving: boolean;
  onChange: (draft: ScreenshotReviewDraft) => void;
  onDismiss: () => void;
  onSave: () => Promise<void>;
}

export function ScreenshotReviewPanel({
  draft,
  warnings,
  saving,
  onChange,
  onDismiss,
  onSave,
}: ScreenshotReviewPanelProps) {
  return (
    <section className="message-panel screenshot-review-panel">
      <div className="review-header">
        <div>
          <p className="eyebrow">Screenshot Review</p>
          <h3>Confirm the OCR before Debt Crusher saves anything.</h3>
        </div>
        <div className="toolbar-actions">
          <button className="secondary-button" onClick={onDismiss} type="button">
            Clear
          </button>
          <button className="primary-button" disabled={saving} onClick={() => void onSave()} type="button">
            {saving ? "Saving..." : "Save Screenshot Import"}
          </button>
        </div>
      </div>

      {warnings.length > 0 ? (
        <div className="review-warning-list">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      <div className="review-grid">
        <label>
          <span>Account kind</span>
          <select
            value={draft.accountKind}
            onChange={(event) =>
              onChange({
                ...draft,
                accountKind: event.target.value as ScreenshotReviewDraft["accountKind"],
              })
            }
          >
            <option value="cash">Cash</option>
            <option value="credit">Credit card</option>
          </select>
        </label>
        <label>
          <span>Institution</span>
          <input
            value={draft.institution}
            onChange={(event) => onChange({ ...draft, institution: event.target.value })}
          />
        </label>
        <label>
          <span>{draft.accountKind === "credit" ? "Card nickname" : "Account name"}</span>
          <input
            value={draft.accountName}
            onChange={(event) => onChange({ ...draft, accountName: event.target.value })}
          />
        </label>
        <label>
          <span>Current balance</span>
          <input
            type="number"
            step="0.01"
            value={draft.currentBalance}
            onChange={(event) =>
              onChange({
                ...draft,
                currentBalance: Number(event.target.value || 0),
              })
            }
          />
        </label>
        <label>
          <span>Available balance</span>
          <input
            type="number"
            step="0.01"
            value={draft.availableBalance ?? ""}
            onChange={(event) =>
              onChange({
                ...draft,
                availableBalance: event.target.value ? Number(event.target.value) : null,
              })
            }
          />
        </label>
        <label>
          <span>Captured at</span>
          <input
            type="date"
            value={draft.capturedAt ?? ""}
            onChange={(event) =>
              onChange({
                ...draft,
                capturedAt: event.target.value || null,
              })
            }
          />
        </label>
      </div>

      <div className="review-meta">
        <span>{draft.fileName}</span>
        <span>
          {draft.balanceCandidates} balance candidate{draft.balanceCandidates === 1 ? "" : "s"}
        </span>
        {draft.lowConfidence ? <span>Low confidence</span> : <span>Clear OCR</span>}
      </div>

      <details className="ocr-details">
        <summary>OCR text</summary>
        <pre>{draft.extractedText || "No OCR text was returned."}</pre>
      </details>
    </section>
  );
}
