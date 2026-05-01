"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CashAccountsView } from "@/components/cash-accounts-view";
import { CreditCardsView } from "@/components/credit-cards-view";
import { DashboardView } from "@/components/dashboard-view";
import { HistoryPanel } from "@/components/history-panel";
import { ImportPanel } from "@/components/import-panel";
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
  const [toasts, setToasts] = useState<
    Array<{ id: string; tone: "success" | "error" | "warning"; message: string }>
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
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3600);
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

  async function persistPortfolio(
    portfolio: PortfolioState,
    source: "import" | "manual_save",
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

    if (!response.ok || !payload.portfolio) {
      throw new Error(payload.error ?? "Failed to save portfolio");
    }

    setSavedPortfolio(payload.portfolio);
    setDraftPortfolio(payload.portfolio);
    setSnapshots(payload.snapshots ?? []);
    setRecentEvents(payload.recentEvents ?? []);
    setDirty(false);
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
        importMode={importMode}
        onImportModeChange={setImportMode}
        onImport={handleImport}
      />

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
            <strong>
              {toast.tone === "success"
                ? "Saved"
                : toast.tone === "warning"
                  ? "Notice"
                  : "Problem"}
            </strong>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
