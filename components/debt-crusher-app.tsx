"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CashAccountsView } from "@/components/cash-accounts-view";
import { CreditCardsView } from "@/components/credit-cards-view";
import { DashboardView } from "@/components/dashboard-view";
import { HistoryPanel } from "@/components/history-panel";
import { ImportPanel } from "@/components/import-panel";
import { ManualWorkflow } from "@/components/manual-workflow";
import {
  ScreenshotReviewPanel,
  type ScreenshotReviewDraft,
} from "@/components/screenshot-review-panel";
import { exportPortfolioWorkbook } from "@/lib/export-workbook";
import { validatePortfolio } from "@/lib/form-validation";
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
  { id: "setup", label: "Setup" },
  { id: "monthly-review", label: "Monthly Review" },
  { id: "credit-cards", label: "Credit Cards" },
  { id: "cash-accounts", label: "Cash Accounts" },
  { id: "utilities", label: "Utilities" },
];

const AUTOSAVE_DELAY_MS = 800;

type SaveStatus = "loading" | "idle" | "saving" | "saved" | "invalid" | "error";

function portfolioComparable(portfolio: PortfolioState) {
  return {
    setup: portfolio.setup,
    creditAccounts: portfolio.creditAccounts.map((account) => ({
      id: account.id,
      institution: account.institution,
      nickname: account.nickname,
      account_type: account.account_type,
      current_balance: account.current_balance,
      credit_limit: account.credit_limit,
      apr_percent: account.apr_percent,
      promo_flag: account.promo_flag,
      promo_end_date: account.promo_end_date,
      min_payment: account.min_payment,
      interest_fees_this_month: account.interest_fees_this_month,
      auto_payment: account.auto_payment,
      payment_due: account.payment_due,
      how_are_we_taking_care_of_it: account.how_are_we_taking_care_of_it,
      rewards_available: account.rewards_available,
      points_available: account.points_available,
    })),
    cashAccounts: portfolio.cashAccounts.map((account) => ({
      id: account.id,
      institution: account.institution,
      account_name: account.account_name,
      type: account.type,
      current_balance: account.current_balance,
      min_day_end_balance_required: account.min_day_end_balance_required,
    })),
  };
}

function portfolioFingerprint(portfolio: PortfolioState) {
  return JSON.stringify(portfolioComparable(portfolio));
}

function snapshotFingerprint(snapshot: ActivitySnapshot) {
  return JSON.stringify(
    portfolioComparable({
      id: "snapshot",
      updatedAt: snapshot.importedAt,
      setup: snapshot.setup,
      creditAccounts: snapshot.creditAccounts,
      cashAccounts: snapshot.cashAccounts,
    }),
  );
}

export function DebtCrusherApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");
  const [saveError, setSaveError] = useState<string | null>(null);
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
  const [loggingOut, startLogoutTransition] = useTransition();
  const [reviewSummary, setReviewSummary] = useState<{ setupNeeded: boolean; monthlyReviewDue: boolean; lastCompletedAt: string | null } | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const autosaveInFlightRef = useRef(false);
  const pendingAutosaveRef = useRef<PortfolioState | null>(null);
  const latestDraftRef = useRef(draftPortfolio);
  const persistenceVersionRef = useRef<string | null>(null);
  const autosaveConflictRetriesRef = useRef(0);

  const activeView = (searchParams.get("view") as AppView) || "dashboard";
  const computedSnapshot = useMemo(
    () => buildComputedSnapshot(draftPortfolio, { id: "current-view" }),
    [draftPortfolio],
  );
  const currentDelta = useMemo(
    () => buildSnapshotDelta(computedSnapshot, snapshots[0] ?? null),
    [computedSnapshot, snapshots],
  );
  const hasCheckpointChanges = useMemo(
    () =>
      snapshots.length === 0 ||
      portfolioFingerprint(draftPortfolio) !== snapshotFingerprint(snapshots[0]),
    [draftPortfolio, snapshots],
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
  const portfolioValidation = useMemo(
    () => validatePortfolio(draftPortfolio),
    [draftPortfolio],
  );
  const saveStatusLabel =
    saveStatus === "loading"
      ? "Loading"
      : saveStatus === "saving"
        ? "Saving"
        : saveStatus === "error"
          ? "Save failed"
          : saveStatus === "invalid"
            ? "Waiting for valid values"
            : !savedPortfolio
              ? "Ready"
              : dirty
                ? "Autosave queued"
                : "Autosaved";

  latestDraftRef.current = draftPortfolio;

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

  function handleLogout() {
    startLogoutTransition(async () => {
      await fetch("/signout", {
        method: "POST",
      });
      router.replace("/signin");
      router.refresh();
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPortfolio() {
      try {
        const [response, reviewResponse] = await Promise.all([fetch("/api/portfolio", { cache: "no-store" }), fetch("/api/reviews", { cache: "no-store" })]);
        const payload = (await response.json()) as {
          portfolio?: PortfolioState;
          snapshots?: ActivitySnapshot[];
          recentEvents?: ActivityEvent[];
          persistenceVersion?: string | null;
          error?: string;
        };
        const reviewPayload = await reviewResponse.json() as { setupNeeded?: boolean; monthlyReviewDue?: boolean; lastCompletedAt?: string | null };

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load portfolio");
        }

        if (!cancelled && payload.portfolio) {
          setSavedPortfolio(
            payload.persistenceVersion === null ? null : payload.portfolio,
          );
          setDraftPortfolio(payload.portfolio);
          setSnapshots(payload.snapshots ?? []);
          setRecentEvents(payload.recentEvents ?? []);
          persistenceVersionRef.current =
            payload.persistenceVersion !== undefined
              ? payload.persistenceVersion
              : payload.portfolio.updatedAt;
          setDirty(false);
          setReviewSummary({ setupNeeded: reviewPayload.setupNeeded ?? true, monthlyReviewDue: reviewPayload.monthlyReviewDue ?? false, lastCompletedAt: reviewPayload.lastCompletedAt ?? null });
          setSaveStatus("saved");
          setLoaded(true);
          if (!searchParams.get("view") && (reviewPayload.setupNeeded ?? true)) router.replace("/?view=setup");
        }
      } catch (error) {
        if (!cancelled) {
          setErrors([
            error instanceof Error ? error.message : "Failed to load portfolio",
          ]);
          setSaveStatus("error");
          setSaveError(
            error instanceof Error ? error.message : "Failed to load portfolio",
          );
          setLoaded(true);
        }
      }
    }

    void loadPortfolio();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  useEffect(() => {
    if (!loaded || !dirty) {
      return;
    }

    const validation = validatePortfolio(draftPortfolio);
    if (validation.hasErrors) {
      setSaveStatus("invalid");
      setSaveError("Fix the highlighted fields before autosave can continue.");
      return;
    }

    pendingAutosaveRef.current = draftPortfolio;
    setSaveStatus("idle");
    setSaveError(null);
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      void flushAutosave();
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [draftPortfolio, dirty, loaded]);

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

  async function createCheckpoint(
    portfolio: PortfolioState,
    source: ActivitySnapshot["source"],
    options?: { filename?: string; label?: string },
  ) {
    const portfolioToSave = {
      ...portfolio,
      updatedAt: new Date().toISOString(),
    };

    const response = await fetch("/api/portfolio/checkpoints", {
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
      persistenceVersion?: string | null;
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to save portfolio");
    }

    pendingAutosaveRef.current = null;
    persistenceVersionRef.current =
      payload.persistenceVersion !== undefined
        ? payload.persistenceVersion
        : (payload.portfolio?.updatedAt ?? null);
    applySavedBundle(payload);
    setSaveStatus("saved");
    setSaveError(null);
  }

  async function flushAutosave() {
    if (autosaveInFlightRef.current || !pendingAutosaveRef.current) {
      return;
    }

    const portfolio = pendingAutosaveRef.current;
    pendingAutosaveRef.current = null;
    autosaveInFlightRef.current = true;
    let shouldContinue = true;
    setSaveStatus("saving");
    setSaveError(null);
    const submittedFingerprint = portfolioFingerprint(portfolio);

    try {
      const response = await fetch("/api/portfolio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolio: {
            ...portfolio,
            updatedAt: new Date().toISOString(),
          },
          expectedUpdatedAt: persistenceVersionRef.current,
        }),
      });
      const payload = (await response.json()) as {
        portfolio?: PortfolioState;
        persistenceVersion?: string | null;
        error?: string;
      };

      if (response.status === 409 && payload.portfolio) {
        persistenceVersionRef.current =
          payload.persistenceVersion !== undefined
            ? payload.persistenceVersion
            : payload.portfolio.updatedAt;
        setSavedPortfolio(payload.portfolio);
        autosaveConflictRetriesRef.current += 1;
        if (autosaveConflictRetriesRef.current <= 2) {
          pendingAutosaveRef.current = latestDraftRef.current;
        } else {
          shouldContinue = false;
          setSaveStatus("error");
          setSaveError("Autosave found repeated conflicting updates. Retry when ready.");
        }
        return;
      }
      if (!response.ok || !payload.portfolio) {
        throw new Error(payload.error ?? "Autosave failed");
      }

      persistenceVersionRef.current =
        payload.persistenceVersion !== undefined
          ? payload.persistenceVersion
          : payload.portfolio.updatedAt;
      autosaveConflictRetriesRef.current = 0;
      setSavedPortfolio(payload.portfolio);
      if (portfolioFingerprint(latestDraftRef.current) === submittedFingerprint) {
        setDraftPortfolio(payload.portfolio);
        setDirty(false);
        setSaveStatus("saved");
      } else {
        pendingAutosaveRef.current = latestDraftRef.current;
      }
    } catch (error) {
      shouldContinue = false;
      pendingAutosaveRef.current = latestDraftRef.current;
      setDirty(true);
      setSaveStatus("error");
      setSaveError(error instanceof Error ? error.message : "Autosave failed");
    } finally {
      autosaveInFlightRef.current = false;
      if (pendingAutosaveRef.current && shouldContinue) {
        void flushAutosave();
      }
    }
  }

  function retryAutosave() {
    if (validatePortfolio(latestDraftRef.current).hasErrors) {
      setSaveStatus("invalid");
      return;
    }
    pendingAutosaveRef.current = latestDraftRef.current;
    autosaveConflictRetriesRef.current = 0;
    void flushAutosave();
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
        await createCheckpoint(nextPortfolio, "import", {
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

    const institution = review.institution || "Captured from Screenshot";
    const accountName = review.accountName || "Screenshot Import";

    if (review.accountKind === "credit") {
      const card = createCreditCardInput();
      return {
        ...base,
        creditAccounts: [
          {
            ...card,
            institution,
            nickname: accountName,
            current_balance: review.currentBalance,
            credit_limit:
              review.availableBalance !== null && review.availableBalance !== undefined
                ? review.currentBalance + review.availableBalance
                : null,
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
          institution,
          account_name: accountName,
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

  async function handleRecordUpdate(label = "Portfolio update") {
    setErrors([]);
    try {
      await createCheckpoint(draftPortfolio, "manual_save", { label });
      pushToast("success", "Recorded a new history checkpoint.");
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : "Failed to save portfolio",
      ]);
      pushToast("error", "Could not record this update.");
    }
  }

  async function handleExportBackup() {
    const response = await fetch("/api/portfolio/backup", { cache: "no-store" });
    if (!response.ok) {
      pushToast("error", "Backup export failed.");
      return;
    }
    const payload = await response.json();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `debt-crusher-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    pushToast("success", "Exported portfolio and complete history.");
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
      const payload = JSON.parse(await file.text()) as unknown;
      const response = await fetch("/api/portfolio/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const restored = (await response.json()) as {
        portfolio?: PortfolioState;
        snapshots?: ActivitySnapshot[];
        recentEvents?: ActivityEvent[];
        persistenceVersion?: string | null;
        error?: string;
      };
      if (!response.ok || !restored.portfolio) {
        throw new Error(restored.error ?? "Backup restore failed");
      }
      persistenceVersionRef.current =
        restored.persistenceVersion !== undefined
          ? restored.persistenceVersion
          : restored.portfolio.updatedAt;
      applySavedBundle(restored);
      setSaveStatus("saved");
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
            <span
              className={`save-state-dot${
                saveStatus === "error"
                  ? " error"
                  : saveStatus === "saving" || dirty
                    ? " dirty"
                    : ""
              }`}
            />
            <strong>{saveStatusLabel}</strong>
            <span>Last autosaved {lastSavedLabel}</span>
            {saveStatus === "error" ? (
              <button className="text-button" onClick={retryAutosave} type="button">
                Retry
              </button>
            ) : null}
          </div>
          <div className="legend-row">
            <span className="legend-chip danger">Danger</span>
            <span className="legend-chip warning">Warning</span>
            <span className="legend-chip watch">Watch</span>
            <span className="legend-chip ok">OK</span>
            <span className="legend-chip paid">Paid</span>
            <button className="ghost-button" onClick={handleLogout} type="button">
              {loggingOut ? "Signing Out..." : "Sign Out"}
            </button>
          </div>
        </div>
      </header>

      <section className="primary-actions-panel">
        <div className="primary-actions-copy">
          <p className="eyebrow">Primary Workflow</p>
          <p className="subtle-copy">
            Add records directly and review them monthly. Spreadsheet tools now live
            under Utilities.
          </p>
        </div>
        <div className="toolbar-actions">
          <button
            className="primary-button"
            disabled={
              !hasCheckpointChanges ||
              portfolioValidation.hasErrors ||
              saveStatus === "saving"
            }
            onClick={() => void handleRecordUpdate()}
            type="button"
          >
            Record Update
          </button>
          <button className="primary-button" onClick={handleAddCard} type="button">
            Add Card
          </button>
          <button className="primary-button" onClick={handleAddCashAccount} type="button">
            Add Cash Account
          </button>
          <button
            className="secondary-button"
            onClick={() => router.push("/?view=setup")}
            type="button"
          >
            Guided Setup
          </button>
          <button className="secondary-button" onClick={() => router.push("/?view=monthly-review")} type="button">Monthly Review</button>
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
            disabled={!dirty}
            onClick={resetUnsavedChanges}
            type="button"
          >
            Reset Unsaved
          </button>
        </div>
        {saveError ? <p className="form-warning">{saveError}</p> : null}
      </section>

      {activeView === "utilities" ? <>
        <section className="primary-actions-panel"><div><p className="eyebrow">Utilities</p><h2>Backups and optional spreadsheet tools</h2><p className="subtle-copy">Manual entry remains authoritative. Review imported changes before saving.</p></div><div className="toolbar-actions"><button className="secondary-button" onClick={handleExportBackup} type="button">Export Backup</button><button className="secondary-button" onClick={handleExportWorkbook} type="button">Export Workbook</button><button className="secondary-button" onClick={() => backupInputRef.current?.click()} type="button">Restore Backup</button></div></section>
        <ImportPanel importing={isPending} screenshotImporting={screenshotImporting} importMode={importMode} onImportModeChange={setImportMode} onImport={handleImport} onScreenshotImport={handleScreenshotImport} />
      </> : null}

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
          <p className="eyebrow">Problems</p>
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
                Add cards and cash accounts directly through the forms. Valid
                changes autosave; use Record Update when you want a history point.
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
            <>{reviewSummary?.monthlyReviewDue ? <section className="control-strip"><div><p className="eyebrow">Monthly Review Due</p><h2>Confirm this month&apos;s balances and payment details.</h2><p className="subtle-copy">Your last completed review was {reviewSummary.lastCompletedAt ? new Date(reviewSummary.lastCompletedAt).toLocaleDateString() : "not recorded"}.</p></div><button className="primary-button" onClick={() => router.push("/?view=monthly-review")}>Start monthly review</button></section> : null}<DashboardView
              snapshot={computedSnapshot}
              activitySnapshots={snapshots}
              setup={draftPortfolio.setup}
              deltaFromPrevious={currentDelta}
              onSetupChange={(setup) =>
                replaceDraft({
                  ...draftPortfolio,
                  setup,
                })
              }
            />
            </>
          ) : null}
          {activeView === "setup" ? <ManualWorkflow mode="setup" setup={draftPortfolio.setup} onSetupChange={(setup) => replaceDraft({ ...draftPortfolio, setup })} onSaveSetup={() => handleRecordUpdate("Setup preferences")} onFinished={() => { setReviewSummary((current) => current ? { ...current, setupNeeded: false } : current); router.push("/?view=dashboard"); }} /> : null}
          {activeView === "monthly-review" ? <ManualWorkflow mode="review" setup={draftPortfolio.setup} onSetupChange={(setup) => replaceDraft({ ...draftPortfolio, setup })} onSaveSetup={() => handleRecordUpdate("Monthly settings")} onFinished={() => { setReviewSummary((current) => current ? { ...current, monthlyReviewDue: false, lastCompletedAt: new Date().toISOString() } : current); router.push("/?view=dashboard"); }} /> : null}
          {activeView === "credit-cards" ? (
            <CreditCardsView
              accounts={computedSnapshot.creditAccounts}
              draftAccounts={draftPortfolio.creditAccounts}
              onChange={(creditAccounts) =>
                replaceDraft({
                  ...draftPortfolio,
                  creditAccounts,
                })
              }
              onAdd={handleAddCard}
            />
          ) : null}
          {activeView === "cash-accounts" ? (
            <CashAccountsView
              accounts={computedSnapshot.cashAccounts}
              draftAccounts={draftPortfolio.cashAccounts}
              globalBufferOverride={draftPortfolio.setup.global_cash_buffer_override}
              onChange={(cashAccounts) =>
                replaceDraft({
                  ...draftPortfolio,
                  cashAccounts,
                })
              }
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
