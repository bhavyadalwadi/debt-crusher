"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CashAccountsView } from "@/components/cash-accounts-view";
import { CreditCardsView } from "@/components/credit-cards-view";
import { DashboardView } from "@/components/dashboard-view";
import { HistoryPanel } from "@/components/history-panel";
import { ImportPanel } from "@/components/import-panel";
import {
  ScreenshotReviewPanel,
  type ScreenshotReviewDraft,
} from "@/components/screenshot-review-panel";
import { exportPortfolioWorkbook } from "@/lib/export-workbook";
import { importWorkbook } from "@/lib/import-workbook";
import {
  buildSnapshotDelta,
  buildComputedSnapshot,
  createCashAccountInput,
  createCreditCardInput,
  createEmptyPortfolio,
  portfolioFromImportSnapshot,
} from "@/lib/portfolio";
import type {
  ActivityEvent,
  ActivitySnapshot,
  AppView,
  PortfolioState,
  ScreenshotImportExtraction,
} from "@/lib/types";

const views: { id: AppView; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "credit-cards", label: "Credit Cards" },
  { id: "cash-accounts", label: "Cash Accounts" },
];

export function DebtCrusherApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [importMode, setImportMode] = useState<"replace" | "merge">("replace");
  const [draftPortfolio, setDraftPortfolio] = useState<PortfolioState>(
    createEmptyPortfolio(),
  );
  const [savedPortfolio, setSavedPortfolio] = useState<PortfolioState | null>(null);
  const [snapshots, setSnapshots] = useState<ActivitySnapshot[]>([]);
  const [recentEvents, setRecentEvents] = useState<ActivityEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [screenshotImporting, setScreenshotImporting] = useState(false);
  const [screenshotSaving, setScreenshotSaving] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotReview, setScreenshotReview] = useState<ScreenshotReviewDraft | null>(null);
  const [screenshotWarnings, setScreenshotWarnings] = useState<string[]>([]);
  const [toasts, setToasts] = useState<
    Array<{ id: string; tone: "success" | "error" | "warning"; message: string; count: number; createdAt: number }>
  >([]);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  const activeView = (searchParams.get("view") as AppView) || "dashboard";
  const computedSnapshot = useMemo(
    () => buildComputedSnapshot(draftPortfolio, { id: "current-view" }),
    [draftPortfolio],
  );
  const currentDelta = useMemo(
    () => buildSnapshotDelta(computedSnapshot, snapshots[0] ?? null),
    [computedSnapshot, snapshots],
  );
  const lastSavedLabel = useMemo(() => {
    if (!savedPortfolio) {
      return "Not saved yet";
    }

    return new Date(savedPortfolio.updatedAt).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, [savedPortfolio]);

  function pushToast(
    tone: "success" | "error" | "warning",
    message: string,
  ) {
    const DEDUPE_WINDOW_MS = 2000;
    const AUTO_DISMISS_MS = 4000;
    const now = Date.now();

    setToasts((current) => {
      // Check for a recent duplicate (same tone + message within the dedupe window)
      const existingIndex = current.findIndex(
        (t) =>
          t.tone === tone &&
          t.message === message &&
          (now - t.createdAt) < DEDUPE_WINDOW_MS,
      );
      if (existingIndex !== -1) {
        // Bump count on the existing toast instead of adding a new one
        return current.map((t, i) =>
          i === existingIndex ? { ...t, count: t.count + 1 } : t,
        );
      }
      const id = crypto.randomUUID();
      window.setTimeout(() => {
        setToasts((c) => c.filter((toast) => toast.id !== id));
      }, AUTO_DISMISS_MS);
      return [...current, { id, tone, message, count: 1, createdAt: now }];
    });
  }

  function dismissToast(id: string) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPortfolio() {
      try {
        const response = await fetch("/api/portfolio", { cache: "no-store" });
        const payload = (await response.json()) as {
          portfolio?: PortfolioState;
          snapshots?: ActivitySnapshot[];
          recentEvents?: ActivityEvent[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load portfolio");
        }

        if (!cancelled && payload.portfolio) {
          setSavedPortfolio(payload.portfolio);
          setDraftPortfolio(payload.portfolio);
          setSnapshots(payload.snapshots ?? []);
          setRecentEvents(payload.recentEvents ?? []);
          setDirty(false);
          setLoaded(true);
        }
      } catch (error) {
        if (!cancelled) {
          setErrors([
            error instanceof Error ? error.message : "Failed to load portfolio",
          ]);
          setLoaded(true);
        }
      }
    }

    void loadPortfolio();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleAddCard() {
    replaceDraft({
      ...draftPortfolio,
      creditAccounts: [...draftPortfolio.creditAccounts, createCreditCardInput()],
    });
    router.push("/?view=credit-cards");
  }

  function handleAddCashAccount() {
    replaceDraft({
      ...draftPortfolio,
      cashAccounts: [...draftPortfolio.cashAccounts, createCashAccountInput()],
    });
    router.push("/?view=cash-accounts");
  }

  function resetUnsavedChanges() {
    if (!savedPortfolio) {
      replaceDraft(createEmptyPortfolio());
      setDirty(false);
      pushToast("warning", "Cleared unsaved working changes.");
      return;
    }

    if (!window.confirm("Discard unsaved changes and revert to the last saved portfolio?")) {
      return;
    }

    setDraftPortfolio(savedPortfolio);
    setDirty(false);
    pushToast("warning", "Reverted to the last saved portfolio.");
  }

  function mergePortfolio(
    current: PortfolioState,
    incoming: PortfolioState,
  ): PortfolioState {
    const creditMap = new Map(
      current.creditAccounts.map((account) => [
        `${account.institution.toLowerCase()}::${account.nickname.toLowerCase()}`,
        account,
      ]),
    );
    for (const account of incoming.creditAccounts) {
      creditMap.set(
        `${account.institution.toLowerCase()}::${account.nickname.toLowerCase()}`,
        account,
      );
    }

    const cashMap = new Map(
      current.cashAccounts.map((account) => [
        `${account.institution.toLowerCase()}::${account.account_name.toLowerCase()}::${account.type.toLowerCase()}`,
        account,
      ]),
    );
    for (const account of incoming.cashAccounts) {
      cashMap.set(
        `${account.institution.toLowerCase()}::${account.account_name.toLowerCase()}::${account.type.toLowerCase()}`,
        account,
      );
    }

    return {
      ...current,
      updatedAt: new Date().toISOString(),
      setup:
        importMode === "replace"
          ? incoming.setup
          : {
              ...current.setup,
              ...incoming.setup,
              custom_strategy_weights: {
                ...current.setup.custom_strategy_weights,
                ...incoming.setup.custom_strategy_weights,
              },
            },
      creditAccounts: [...creditMap.values()],
      cashAccounts: [...cashMap.values()],
    };
  }

  function applySavedBundle(payload: {
    portfolio?: PortfolioState;
    snapshots?: ActivitySnapshot[];
    recentEvents?: ActivityEvent[];
    error?: string;
  }) {
    if (!payload.portfolio) {
      throw new Error(payload.error ?? "Failed to save portfolio");
    }

    setSavedPortfolio(payload.portfolio);
    setDraftPortfolio(payload.portfolio);
    setSnapshots(payload.snapshots ?? []);
    setRecentEvents(payload.recentEvents ?? []);
    setDirty(false);
  }

  async function persistPortfolio(
    portfolio: PortfolioState,
    source: ActivitySnapshot["source"],
    options?: { filename?: string; label?: string },
  ) {
    const portfolioToSave = {
      ...portfolio,
      updatedAt: new Date().toISOString(),
    };

    const response = await fetch("/api/portfolio", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        portfolio: portfolioToSave,
        source,
        filename: options?.filename,
        label: options?.label,
      }),
    });
    const payload = (await response.json()) as {
      portfolio?: PortfolioState;
      snapshots?: ActivitySnapshot[];
      recentEvents?: ActivityEvent[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to save portfolio");
    }

    applySavedBundle(payload);
  }

  function replaceDraft(nextPortfolio: PortfolioState) {
    setDraftPortfolio(nextPortfolio);
    setDirty(true);
  }

  async function handleImport(file: File) {
    setErrors([]);
    setWarnings([]);

    if (
      (savedPortfolio || draftPortfolio.creditAccounts.length > 0 || draftPortfolio.cashAccounts.length > 0) &&
      !window.confirm(
        importMode === "replace"
          ? "Importing will replace the current working portfolio. Continue?"
          : "Importing will merge workbook records into the current working portfolio. Continue?",
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await importWorkbook(file);
        setWarnings(result.warnings);

        if (!result.success || !result.snapshot) {
          setErrors(result.errors);
          return;
        }

        const importedPortfolio = portfolioFromImportSnapshot(result.snapshot);
        const nextPortfolio =
          importMode === "replace"
            ? importedPortfolio
            : mergePortfolio(draftPortfolio, importedPortfolio);
        await persistPortfolio(nextPortfolio, "import", {
          filename: file.name,
          label:
            importMode === "replace"
              ? "Workbook import"
              : "Workbook merge import",
        });
        pushToast(
          "success",
          importMode === "replace"
            ? `Imported ${file.name} into the working portfolio.`
            : `Merged ${file.name} into the working portfolio.`,
        );
      } catch (error) {
        setErrors([
          error instanceof Error ? error.message : "Failed to import workbook",
        ]);
        pushToast("error", "Workbook import failed.");
      }
    });
  }

  async function handleScreenshotImport(file: File) {
    setErrors([]);
    setWarnings([]);
    setScreenshotWarnings([]);
    setScreenshotImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/screenshot-import/analyze", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        extraction?: ScreenshotImportExtraction;
        extractedText?: string;
        warnings?: string[];
        error?: string;
        fileName?: string;
        mimeType?: string;
      };

      if (!response.ok || !payload.extraction || !payload.fileName || !payload.mimeType) {
        throw new Error(payload.error ?? "Failed to analyze screenshot");
      }

      setScreenshotFile(file);
      setScreenshotWarnings(payload.warnings ?? []);
      setScreenshotReview({
        ...payload.extraction,
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        extractedText: payload.extractedText ?? "",
        institution: payload.extraction.institution ?? "",
        accountName: payload.extraction.accountName ?? "",
      });
      pushToast("success", `Read screenshot ${file.name} for review.`);
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : "Failed to analyze screenshot",
      ]);
      pushToast("error", "Screenshot import failed.");
    } finally {
      setScreenshotImporting(false);
    }
  }

  function clearScreenshotReview() {
    setScreenshotFile(null);
    setScreenshotReview(null);
    setScreenshotWarnings([]);
  }

  function buildScreenshotPortfolio(review: ScreenshotReviewDraft): PortfolioState {
    const base: PortfolioState = {
      ...createEmptyPortfolio(),
      setup: draftPortfolio.setup,
    };

    if (review.accountKind === "credit") {
      const card = createCreditCardInput();
      return {
        ...base,
        creditAccounts: [
          {
            ...card,
            institution: review.institution,
            nickname: review.accountName,
            current_balance: review.currentBalance,
          },
        ],
      };
    }

    const cash = createCashAccountInput();
    return {
      ...base,
      cashAccounts: [
        {
          ...cash,
          institution: review.institution,
          account_name: review.accountName,
          current_balance: review.currentBalance,
        },
      ],
    };
  }

  async function handleSaveScreenshotImport() {
    if (!screenshotFile || !screenshotReview) {
      return;
    }

    setErrors([]);
    setWarnings([]);
    setScreenshotSaving(true);

    try {
      const extractedPortfolio = buildScreenshotPortfolio(screenshotReview);
      const nextPortfolio =
        importMode === "merge"
          ? mergePortfolio(draftPortfolio, extractedPortfolio)
          : extractedPortfolio;
      const portfolioToSave = {
        ...nextPortfolio,
        updatedAt: new Date().toISOString(),
      };
      const formData = new FormData();
      formData.append("file", screenshotFile);
      formData.append("portfolio", JSON.stringify(portfolioToSave));
      const extractionPayload: ScreenshotImportExtraction = {
        accountKind: screenshotReview.accountKind,
        institution: screenshotReview.institution || null,
        accountName: screenshotReview.accountName || null,
        currentBalance: screenshotReview.currentBalance,
        availableBalance: screenshotReview.availableBalance,
        capturedAt: screenshotReview.capturedAt,
        balanceCandidates: screenshotReview.balanceCandidates,
        lowConfidence: screenshotReview.lowConfidence,
      };
      formData.append(
        "extraction",
        JSON.stringify(extractionPayload),
      );
      formData.append("extractedText", screenshotReview.extractedText);
      formData.append(
        "label",
        importMode === "merge" ? "Screenshot merge import" : "Screenshot import",
      );
      const response = await fetch("/api/screenshot-import/save", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        portfolio?: PortfolioState;
        snapshots?: ActivitySnapshot[];
        recentEvents?: ActivityEvent[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save screenshot import");
      }

      applySavedBundle(payload);
      clearScreenshotReview();
      pushToast("success", `Saved screenshot import from ${screenshotFile.name}.`);
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : "Failed to save screenshot import",
      ]);
      pushToast("error", "Screenshot save failed.");
    } finally {
      setScreenshotSaving(false);
    }
  }

  async function handleSave(label: string) {
    setErrors([]);
    try {
      await persistPortfolio(draftPortfolio, "manual_save", { label });
      pushToast("success", `${label} saved locally.`);
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : "Failed to save portfolio",
      ]);
      pushToast("error", "Save failed.");
    }
  }

  function handleExportBackup() {
    const payload = {
      exportedAt: new Date().toISOString(),
      portfolio: draftPortfolio,
      snapshots,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `debt-crusher-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    pushToast("success", "Exported local backup JSON.");
  }

  function handleExportWorkbook() {
    const blob = exportPortfolioWorkbook(draftPortfolio);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `debt-crusher-portfolio-${new Date().toISOString().slice(0, 10)}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
    pushToast("success", "Exported the current portfolio as a workbook.");
  }

  async function handleImportBackup(file: File) {
    setErrors([]);
    setWarnings([]);

    if (
      (savedPortfolio || draftPortfolio.creditAccounts.length > 0 || draftPortfolio.cashAccounts.length > 0) &&
      !window.confirm("Restoring a backup will replace the current working portfolio. Continue?")
    ) {
      return;
    }

    try {
      const payload = JSON.parse(await file.text()) as {
        portfolio?: PortfolioState;
      };

      if (!payload.portfolio) {
        throw new Error("Backup file does not contain a portfolio payload.");
      }

      await persistPortfolio(payload.portfolio, "manual_save", {
        label: "Backup restore",
        filename: file.name,
      });
      pushToast("success", `Restored backup from ${file.name}.`);
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : "Failed to import backup JSON",
      ]);
      pushToast("error", "Backup restore failed.");
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="header-copy">
          <h1>Debt Crusher</h1>
          <p className="subtle-copy">
            Direct-entry payoff workspace with saved history and backup import.
          </p>
        </div>
        <div className="header-meta">
          <div className="save-state-strip">
            <span className={`save-state-dot${dirty ? " dirty" : ""}`} />
            <strong>{dirty ? "Unsaved changes" : "Saved"}</strong>
            <span>Last saved {lastSavedLabel}</span>
          </div>
          <div className="legend-row">
            <span className="legend-chip danger">Danger</span>
            <span className="legend-chip warning">Warning</span>
            <span className="legend-chip watch">Watch</span>
            <span className="legend-chip ok">OK</span>
            <span className="legend-chip paid">Paid</span>
          </div>
        </div>
      </header>

      <section className="primary-actions-panel">
        <div className="primary-actions-copy">
          <p className="eyebrow">Primary Workflow</p>
          <p className="subtle-copy">
            Add records directly here. Workbook import stays available as a backup
            or seed path.
          </p>
        </div>
        <div className="toolbar-actions">
          <button className="primary-button" onClick={handleAddCard} type="button">
            Add Card
          </button>
          <button className="primary-button" onClick={handleAddCashAccount} type="button">
            Add Cash Account
          </button>
          <button
            className="secondary-button"
            onClick={() => router.push("/?view=dashboard")}
            type="button"
          >
            Edit Setup
          </button>
          <button className="secondary-button" onClick={handleExportBackup} type="button">
            Export Backup
          </button>
          <button className="secondary-button" onClick={handleExportWorkbook} type="button">
            Export Workbook
          </button>
          <input
            ref={backupInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden-input"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }
              await handleImportBackup(file);
              event.target.value = "";
            }}
          />
          <button
            className="secondary-button"
            onClick={() => backupInputRef.current?.click()}
            type="button"
          >
            Restore Backup
          </button>
          <button
            className="secondary-button"
            disabled={!dirty}
            onClick={resetUnsavedChanges}
            type="button"
          >
            Reset Unsaved
          </button>
        </div>
      </section>

      <ImportPanel
        importing={isPending}
        screenshotImporting={screenshotImporting}
        importMode={importMode}
        onImportModeChange={setImportMode}
        onImport={handleImport}
        onScreenshotImport={handleScreenshotImport}
      />

      {screenshotReview ? (
        <ScreenshotReviewPanel
          draft={screenshotReview}
          warnings={screenshotWarnings}
          saving={screenshotSaving}
          onChange={setScreenshotReview}
          onDismiss={clearScreenshotReview}
          onSave={handleSaveScreenshotImport}
        />
      ) : null}

      {errors.length > 0 ? (
        <section className="message-panel error-panel">
          <p className="eyebrow">Import Errors</p>
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </section>
      ) : null}

      {warnings.length > 0 ? (
        <section className="message-panel warning-panel">
          <p className="eyebrow">Import Warnings</p>
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </section>
      ) : null}

      <div className="workspace-grid">
        <HistoryPanel snapshots={snapshots} recentEvents={recentEvents} />

        <section className="workspace-panel">
          <nav className="tabs">
            {views.map((view) => (
              <button
                key={view.id}
                className={`tab${activeView === view.id ? " active" : ""}`}
                onClick={() => router.push(`/?view=${view.id}`)}
                type="button"
              >
                {view.label}
              </button>
            ))}
          </nav>

          {loaded && savedPortfolio === null && snapshots.length === 0 ? (
            <section className="empty-state">
              <p className="eyebrow">Start Here</p>
              <h2>No saved portfolio yet.</h2>
              <p className="subtle-copy">
                Add cards and cash accounts directly through the forms and save
                them locally. Use workbook import only if you want to seed the app
                from a spreadsheet.
              </p>
              <div className="toolbar-actions">
                <button className="primary-button" onClick={handleAddCard} type="button">
                  Add First Card
                </button>
                <button
                  className="secondary-button"
                  onClick={handleAddCashAccount}
                  type="button"
                >
                  Add First Cash Account
                </button>
              </div>
            </section>
          ) : null}

          {activeView === "dashboard" ? (
            <DashboardView
              snapshot={computedSnapshot}
              activitySnapshots={snapshots}
              setup={draftPortfolio.setup}
              deltaFromPrevious={currentDelta}
              dirty={dirty}
              onSetupChange={(setup) =>
                replaceDraft({
                  ...draftPortfolio,
                  setup,
                })
              }
              onSave={() => handleSave("Settings update")}
            />
          ) : null}
          {activeView === "credit-cards" ? (
            <CreditCardsView
              accounts={computedSnapshot.creditAccounts}
              draftAccounts={draftPortfolio.creditAccounts}
              dirty={dirty}
              onChange={(creditAccounts) =>
                replaceDraft({
                  ...draftPortfolio,
                  creditAccounts,
                })
              }
              onSave={() => handleSave("Credit card update")}
              onAdd={handleAddCard}
            />
          ) : null}
          {activeView === "cash-accounts" ? (
            <CashAccountsView
              accounts={computedSnapshot.cashAccounts}
              draftAccounts={draftPortfolio.cashAccounts}
              globalBufferOverride={draftPortfolio.setup.global_cash_buffer_override}
              dirty={dirty}
              onChange={(cashAccounts) =>
                replaceDraft({
                  ...draftPortfolio,
                  cashAccounts,
                })
              }
              onSave={() => handleSave("Cash account update")}
              onAdd={handleAddCashAccount}
            />
          ) : null}
        </section>
      </div>
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-card ${toast.tone}`}>
            <div className="toast-header">
              <strong>
                {toast.tone === "success"
                  ? "Saved"
                  : toast.tone === "warning"
                    ? "Notice"
                    : "Problem"}
              </strong>
              {toast.count > 1 ? (
                <span className="toast-count">{toast.count}</span>
              ) : null}
              <button
                className="toast-dismiss"
                type="button"
                aria-label="Dismiss"
                onClick={() => dismissToast(toast.id)}
              >
                ×
              </button>
            </div>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
