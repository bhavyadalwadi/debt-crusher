"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SetupConfig } from "@/lib/types";

type ReviewItem = { id: string; entityType: string; entityId: string; entityName: string; status: "PENDING" | "CONFIRMED" | "UPDATED" | "SKIPPED" | "UNKNOWN"; warnings: string[]; before: Record<string, unknown> | null };
type ReviewState = { review: null | { id: string; type: "SETUP" | "MONTHLY"; currentStep: number; status: string; items: ReviewItem[] }; progress: { reviewed: number; total: number; percent: number }; setupNeeded: boolean; monthlyReviewDue: boolean; lastCompletedAt: string | null };
type OperationsConfig = {
  accounts: Array<{ id: string; name: string; currentBalance: string; minimumRequiredBalance: string; targetBalance: string | null; balanceAsOf: string | null }>;
  cards: Array<{ id: string; nickname: string; issuerName: string; lastFour: string | null; currentBalance: string; statementBalance: string | null; minimumPaymentDue: string | null; purchaseApr: string; creditLimit: string | null; paymentDueDay: number | null; statementClosingDay: number | null; balanceAsOf: string | null; status: string; notes: string | null; completenessWarnings: string[] }>;
  autopayRules: Array<{ cardId: string; fundingAccountId: string | null; mode: string; executionDay: number | null }>;
  promotions: Array<{ id: string; cardId: string; currentPromoBalance: string | null; endDate: string | null }>;
  recurringTransactions: Array<{ id: string; name: string; type: string; amount: string; dayOfMonth: number }>;
};

const steps = ["Payoff preferences", "Cash accounts", "Credit cards", "Autopay", "Promotions", "Final review"];
const today = () => new Date().toISOString().slice(0, 10);

async function jsonRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) throw Object.assign(new Error(payload.error ?? "Request failed"), { duplicate: payload.duplicate });
  return payload;
}

export function ManualWorkflow({ mode, setup, onSetupChange, onSaveSetup, onFinished }: { mode: "setup" | "review"; setup: SetupConfig; onSetupChange: (setup: SetupConfig) => void; onSaveSetup: () => Promise<void>; onFinished: () => void }) {
  const [state, setState] = useState<ReviewState | null>(null);
  const [config, setConfig] = useState<OperationsConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [reviewState, operations] = await Promise.all([jsonRequest("/api/reviews"), jsonRequest("/api/operations/config")]);
    setState(reviewState); setConfig(operations);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function begin() {
      try {
        let reviewState = await jsonRequest("/api/reviews");
        if (!reviewState.review || reviewState.review.type !== (mode === "setup" ? "SETUP" : "MONTHLY")) {
          reviewState = await jsonRequest("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", type: mode === "setup" ? "SETUP" : "MONTHLY" }) });
        }
        const operations = await jsonRequest("/api/operations/config");
        if (!cancelled) { setState(reviewState); setConfig(operations); }
      } catch (reason) { if (!cancelled) setError(reason instanceof Error ? reason.message : "Failed to start workflow"); }
    }
    void begin(); return () => { cancelled = true; };
  }, [mode]);

  const step = state?.review?.currentStep ?? 1;
  const grouped = useMemo(() => ({ cash: state?.review?.items.filter((item) => item.entityType === "cash_account") ?? [], cards: state?.review?.items.filter((item) => item.entityType === "credit_card") ?? [], recurring: state?.review?.items.filter((item) => item.entityType === "recurring_transaction") ?? [] }), [state]);

  async function command(body: unknown) {
    setBusy(true); setError(null);
    try { setState(await jsonRequest("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })); return true; }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Save failed"); return false; }
    finally { setBusy(false); }
  }

  async function go(next: number) { if (state?.review) await command({ action: "step", reviewId: state.review.id, currentStep: next }); }

  async function manualEntry(body: Record<string, unknown>, form?: HTMLFormElement) {
    setBusy(true); setError(null);
    try {
      let payload: OperationsConfig;
      try { payload = await jsonRequest("/api/manual-entry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
      catch (reason) {
        if (!(reason instanceof Error) || !(reason as Error & { duplicate?: boolean }).duplicate || !window.confirm("This institution and last four already exist. Add it anyway?")) throw reason;
        payload = await jsonRequest("/api/manual-entry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, confirmDuplicate: true }) });
      }
      setConfig(payload); form?.reset(); await command({ action: "start", type: "SETUP" });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Manual entry failed"); }
    finally { setBusy(false); }
  }

  async function mark(item: ReviewItem, status: ReviewItem["status"], after?: unknown, asOfDate?: string) {
    if (!state?.review) return;
    await command({ action: "item", reviewId: state.review.id, entityType: item.entityType, entityId: item.entityId, status, after, asOfDate: asOfDate ?? today(), warnings: item.warnings });
  }

  async function complete() {
    if (!state?.review) return;
    if (await command({ action: "complete", reviewId: state.review.id })) onFinished();
  }

  if (!state?.review || !config) return <section className="detail-panel"><p>{error ?? "Preparing your manual workflow…"}</p></section>;

  return <section className="view-shell manual-workflow">
    <div className="hero-band"><div className="hero-copy"><p className="eyebrow">{mode === "setup" ? "Guided Manual Setup" : "Monthly Review"}</p><h2>{mode === "setup" ? "Build your financial workspace without a spreadsheet." : "Confirm what changed this month."}</h2><p className="subtle-copy">Unknown values are allowed and stay visible as accuracy warnings.</p></div><div className="focus-strip"><strong>{mode === "setup" ? `Step ${step} of 6` : `${state.progress.percent}% reviewed`}</strong><span>{mode === "setup" ? steps[step - 1] : `${state.progress.reviewed} of ${state.progress.total} items`}</span></div></div>
    {error ? <p className="field-error">{error}</p> : null}
    {mode === "setup" ? <ol className="setup-progress">{steps.map((label, index) => <li className={index + 1 === step ? "active" : index + 1 < step ? "complete" : ""} key={label}>{label}</li>)}</ol> : null}

    {mode === "setup" && step === 1 ? <section className="detail-panel"><div className="detail-header"><h3>Choose payoff preferences</h3></div><div className="form-grid"><label><span>Strategy</span><select value={setup.payoff_strategy} onChange={(event) => onSetupChange({ ...setup, payoff_strategy: event.target.value as SetupConfig["payoff_strategy"] })}><option value="avalanche">Avalanche</option><option value="snowball">Snowball</option><option value="promo-first">Promo-first</option><option value="custom">Custom</option></select></label><label><span>Monthly extra-payment budget</span><input type="number" min="0" value={setup.extra_payment_budget} onChange={(event) => onSetupChange({ ...setup, extra_payment_budget: Number(event.target.value) })} /></label></div><div className="form-actions"><button className="secondary-button" disabled={busy} onClick={onSaveSetup}>Save draft</button><button className="primary-button" disabled={busy} onClick={async () => { await onSaveSetup(); await go(2); }}>Save and continue</button></div></section> : null}

    {mode === "setup" && step === 2 ? <section className="detail-panel"><div className="detail-header"><h3>Add every active cash account</h3></div><form className="form-grid" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); void manualEntry({ entity: "cash", institution: data.get("institution"), nickname: data.get("nickname"), accountType: data.get("accountType"), lastFour: data.get("lastFour") || null, currentBalance: data.get("currentBalance"), minimumRequiredBalance: data.get("minimumRequiredBalance") || "0", targetBalance: data.get("targetBalance") || null, asOfDate: data.get("asOfDate") }, form); }}><label><span>Institution *</span><input name="institution" required /></label><label><span>Account nickname *</span><input name="nickname" placeholder="Primary checking" required /></label><label><span>Type *</span><select name="accountType"><option>Checking</option><option>Savings</option><option>Money market</option><option>Other</option></select></label><label><span>Last four</span><input name="lastFour" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} /></label><label><span>Current balance *</span><input name="currentBalance" type="number" min="0" step="0.01" required /></label><label><span>Required minimum</span><input name="minimumRequiredBalance" type="number" min="0" step="0.01" /></label><label><span>Target balance</span><input name="targetBalance" type="number" min="0" step="0.01" /></label><label><span>As of *</span><input name="asOfDate" type="date" defaultValue={today()} required /></label><button className="primary-button" disabled={busy} type="submit">Save and add another</button></form><RecordList items={config.accounts.map((item) => `${item.name} · $${item.currentBalance}`)} /><NavButtons step={step} busy={busy} onBack={() => go(1)} onSave={() => go(step)} onNext={() => go(3)} nextDisabled={config.accounts.length === 0} /></section> : null}

    {mode === "setup" && step === 3 ? <section className="detail-panel"><div className="detail-header"><h3>Add every active credit card</h3></div><CardEntryForm accounts={config.accounts} busy={busy} onSubmit={manualEntry} /><RecordList items={config.cards.map((item) => `${item.nickname} · $${item.currentBalance}${item.lastFour ? ` · ••••${item.lastFour}` : ""}`)} /><NavButtons step={step} busy={busy} onBack={() => go(2)} onSave={() => go(step)} onNext={() => go(4)} nextDisabled={config.cards.length === 0} /></section> : null}

    {mode === "setup" && step === 4 ? <section className="detail-panel"><div className="detail-header"><h3>Confirm autopay and funding</h3><p className="subtle-copy">Cards entered in the previous step include their autopay mode, funding account, due day, and execution day.</p></div>{config.cards.map((card) => { const rule = config.autopayRules.find((item) => item.cardId === card.id); return <div className={`signal-item ${!rule || rule.mode === "UNKNOWN" ? "warning" : "ok"}`} key={card.id}><div><strong>{card.nickname}</strong><span>{rule?.mode.replaceAll("_", " ") ?? "Not configured"} · {config.accounts.find((account) => account.id === rule?.fundingAccountId)?.name ?? "Funding unknown"}</span></div></div>; })}<NavButtons step={step} busy={busy} onBack={() => go(3)} onSave={() => go(step)} onNext={() => go(5)} /></section> : null}

    {mode === "setup" && step === 5 ? <section className="detail-panel"><div className="detail-header"><h3>Add promotional balances</h3><p className="subtle-copy">Skip this step if no card currently has a promotional offer.</p></div><PromoForm cards={config.cards} busy={busy} onSaved={async () => { await refresh(); }} /><RecordList items={config.promotions.map((promo) => `${config.cards.find((card) => card.id === promo.cardId)?.nickname ?? "Card"} · ${promo.currentPromoBalance ? `$${promo.currentPromoBalance}` : "balance unknown"} · ${promo.endDate ?? "date unknown"}`)} /><NavButtons step={step} busy={busy} onBack={() => go(4)} onSave={() => go(step)} onNext={() => go(6)} /></section> : null}

    {mode === "setup" && step === 6 ? <FinalReview config={config} items={state.review.items} busy={busy} onBack={() => go(5)} onComplete={complete} /> : null}
    {mode === "review" ? <MonthlyReview state={state} config={config} busy={busy} onMark={mark} onComplete={complete} /> : null}
  </section>;
}

function NavButtons({ busy, onBack, onSave, onNext, nextDisabled }: { step: number; busy: boolean; onBack: () => void; onSave: () => void; onNext: () => void; nextDisabled?: boolean }) { return <div className="form-actions"><button className="secondary-button" disabled={busy} onClick={onBack}>Back</button><button className="secondary-button" disabled={busy} onClick={onSave}>Save draft</button><button className="primary-button" disabled={busy || nextDisabled} onClick={onNext}>Continue</button></div>; }
function RecordList({ items }: { items: string[] }) { return <div className="signal-list">{items.map((item) => <div className="signal-item ok" key={item}><strong>{item}</strong></div>)}</div>; }

function CardEntryForm({ accounts, busy, onSubmit }: { accounts: OperationsConfig["accounts"]; busy: boolean; onSubmit: (body: Record<string, unknown>, form?: HTMLFormElement) => Promise<void> }) {
  return <form className="form-grid" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); void onSubmit({ entity: "card", institution: data.get("institution"), nickname: data.get("nickname"), product: data.get("product") || null, lastFour: data.get("lastFour") || null, currentBalance: data.get("currentBalance"), statementBalance: data.get("statementBalance") || null, minimumPaymentDue: data.get("minimumPaymentDue") || null, creditLimit: data.get("creditLimit") || null, purchaseApr: data.get("purchaseApr") || "0", paymentDueDay: data.get("paymentDueDay") ? Number(data.get("paymentDueDay")) : null, statementClosingDay: data.get("statementClosingDay") ? Number(data.get("statementClosingDay")) : null, status: data.get("status"), asOfDate: data.get("asOfDate"), notes: data.get("notes") || null, autopayMode: data.get("autopayMode"), fundingAccountId: data.get("fundingAccountId") || null, executionDay: data.get("executionDay") ? Number(data.get("executionDay")) : null, fixedAmount: data.get("fixedAmount") || null }, form); }}><label><span>Institution *</span><input name="institution" required /></label><label><span>Nickname *</span><input name="nickname" required /></label><label><span>Product</span><input name="product" /></label><label><span>Last four</span><input name="lastFour" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} /></label><label><span>Current balance *</span><input name="currentBalance" type="number" min="0" step="0.01" required /></label><label><span>Statement balance</span><input name="statementBalance" type="number" min="0" step="0.01" /></label><label><span>Minimum due</span><input name="minimumPaymentDue" type="number" min="0" step="0.01" /></label><label><span>Credit limit</span><input name="creditLimit" type="number" min="0" step="0.01" /></label><label><span>APR %</span><input name="purchaseApr" type="number" min="0" max="99.99" step="0.01" /></label><label><span>Due day</span><input name="paymentDueDay" type="number" min="1" max="31" /></label><label><span>Statement closing day</span><input name="statementClosingDay" type="number" min="1" max="31" /></label><label><span>Status</span><select name="status"><option value="ACTIVE">Active</option><option value="PAID_OFF">Paid off</option><option value="CLOSED">Closed</option><option value="TRANSFERRED">Transferred</option><option value="SUSPENDED">Suspended</option></select></label><label><span>Autopay</span><select name="autopayMode"><option value="UNKNOWN">Unknown</option><option value="STATEMENT_BALANCE">Statement balance</option><option value="MINIMUM_PAYMENT">Minimum payment</option><option value="FIXED_AMOUNT">Fixed amount</option><option value="PROMO_TARGET">Promo target</option><option value="DISABLED">Disabled</option></select></label><label><span>Funding account</span><select name="fundingAccountId"><option value="">Unknown</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label><span>Execution day</span><input name="executionDay" type="number" min="1" max="31" /></label><label><span>Fixed amount</span><input name="fixedAmount" type="number" min="0" step="0.01" /></label><label><span>As of *</span><input name="asOfDate" type="date" defaultValue={today()} required /></label><label><span>Notes</span><input name="notes" /></label><button className="primary-button" disabled={busy} type="submit">Save and add another</button></form>;
}

function PromoForm({ cards, busy, onSaved }: { cards: OperationsConfig["cards"]; busy: boolean; onSaved: () => Promise<void> }) { return <form className="form-grid" onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); await jsonRequest("/api/operations/promotions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creditCardId: data.get("creditCardId"), type: data.get("type"), currentPromoBalance: data.get("balance") || null, promotionalApr: data.get("apr") || null, standardAprAfterPromo: data.get("postApr") || null, endDate: data.get("endDate") || null, targetPayoffDate: data.get("targetDate") || null, deferredInterest: data.get("deferredInterest") === "on", safetyBufferDays: 14 }) }); form.reset(); await onSaved(); }}><label><span>Card</span><select name="creditCardId">{cards.map((card) => <option key={card.id} value={card.id}>{card.nickname}</option>)}</select></label><label><span>Type</span><select name="type"><option value="BALANCE_TRANSFER">Balance transfer</option><option value="PURCHASE_PROMO">Purchase promo</option><option value="APR_PROMO">APR promo</option><option value="DEFERRED_INTEREST">Deferred interest</option><option value="UNKNOWN">Unknown</option></select></label><label><span>Promo balance</span><input name="balance" type="number" min="0" step="0.01" /></label><label><span>Promo APR</span><input name="apr" type="number" min="0" step="0.01" /></label><label><span>Post-promo APR</span><input name="postApr" type="number" min="0" step="0.01" /></label><label><span>End date</span><input name="endDate" type="date" /></label><label><span>Target payoff</span><input name="targetDate" type="date" /></label><label><span>Deferred interest</span><input name="deferredInterest" type="checkbox" /></label><button className="primary-button" disabled={busy || cards.length === 0}>Add promotion</button></form>; }

function FinalReview({ config, items, busy, onBack, onComplete }: { config: OperationsConfig; items: ReviewItem[]; busy: boolean; onBack: () => void; onComplete: () => void }) { const warnings = [...config.cards.flatMap((card) => card.completenessWarnings.map((warning) => `${card.nickname}: ${warning}`)), ...items.flatMap((item) => item.warnings.map((warning) => `${item.entityName}: ${warning}`))]; return <section className="detail-panel"><div className="detail-header"><h3>Review your setup</h3></div><div className="metric-grid"><article><span>Cash accounts</span><strong>{config.accounts.length}</strong></article><article><span>Credit cards</span><strong>{config.cards.length}</strong></article><article><span>Promotions</span><strong>{config.promotions.length}</strong></article><article><span>Warnings</span><strong>{warnings.length}</strong></article></div>{warnings.length ? <ul className="reason-list">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : <p>Everything required for accurate forecasts is present.</p>}<div className="form-actions"><button className="secondary-button" disabled={busy} onClick={onBack}>Back</button><button className="primary-button" disabled={busy} onClick={onComplete}>Finish setup</button></div></section>; }

function MonthlyReview({ state, config, busy, onMark, onComplete }: { state: ReviewState; config: OperationsConfig; busy: boolean; onMark: (item: ReviewItem, status: ReviewItem["status"], after?: unknown, asOfDate?: string) => Promise<void>; onComplete: () => void }) {
  async function updateItem(item: ReviewItem, body: Record<string, unknown>, asOfDate: string) {
    await jsonRequest("/api/operations/config", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    await onMark(item, "UPDATED", body, asOfDate);
  }
  return <section className="detail-panel"><div className="detail-header"><h3>Review every active account</h3><p className="subtle-copy">Confirm unchanged values, update current statement details here, or mark a record unknown/skipped.</p></div><div className="review-item-list">{state.review?.items.map((item) => { const card = config.cards.find((value) => item.entityType === "credit_card" && value.id === item.entityId); const cash = config.accounts.find((value) => item.entityType === "cash_account" && value.id === item.entityId); const recurring = config.recurringTransactions.find((value) => item.entityType === "recurring_transaction" && value.id === item.entityId); return <article className={`review-item ${item.status.toLowerCase()}`} key={item.id}><div><strong>{item.entityName}</strong>{item.warnings.map((warning) => <small key={warning}>{warning}</small>)}</div>{card ? <form className="review-update-grid" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const asOfDate = String(data.get("asOfDate")); const body = { entity: "card", id: card.id, currentBalance: data.get("currentBalance"), statementBalance: data.get("statementBalance") || null, minimumPaymentDue: data.get("minimumPaymentDue") || null, creditLimit: data.get("creditLimit") || null, purchaseApr: data.get("purchaseApr") || null, paymentDueDay: data.get("paymentDueDay") ? Number(data.get("paymentDueDay")) : null, statementClosingDay: card.statementClosingDay, asOfDate, source: "monthly_review" }; void updateItem(item, body, asOfDate); }}><label><span>Current balance</span><input name="currentBalance" type="number" min="0" step="0.01" defaultValue={card.currentBalance} required /></label><label><span>Statement</span><input name="statementBalance" type="number" min="0" step="0.01" defaultValue={card.statementBalance ?? ""} /></label><label><span>Minimum</span><input name="minimumPaymentDue" type="number" min="0" step="0.01" defaultValue={card.minimumPaymentDue ?? ""} /></label><label><span>APR</span><input name="purchaseApr" type="number" min="0" step="0.01" defaultValue={card.purchaseApr} /></label><label><span>Limit</span><input name="creditLimit" type="number" min="0" step="0.01" defaultValue={card.creditLimit ?? ""} /></label><label><span>Due day</span><input name="paymentDueDay" type="number" min="1" max="31" defaultValue={card.paymentDueDay ?? ""} /></label><label><span>As of</span><input name="asOfDate" type="date" defaultValue={today()} required /></label><button className="primary-button" disabled={busy}>Save update</button></form> : null}{cash ? <form className="review-update-grid" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const asOfDate = String(data.get("asOfDate")); const body = { entity: "cash", id: cash.id, currentBalance: data.get("currentBalance"), minimumRequiredBalance: data.get("minimumRequiredBalance"), targetBalance: data.get("targetBalance") || null, asOfDate, source: "monthly_review" }; void updateItem(item, body, asOfDate); }}><label><span>Current balance</span><input name="currentBalance" type="number" min="0" step="0.01" defaultValue={cash.currentBalance} required /></label><label><span>Required minimum</span><input name="minimumRequiredBalance" type="number" min="0" step="0.01" defaultValue={cash.minimumRequiredBalance} /></label><label><span>Target</span><input name="targetBalance" type="number" min="0" step="0.01" defaultValue={cash.targetBalance ?? ""} /></label><label><span>As of</span><input name="asOfDate" type="date" defaultValue={today()} required /></label><button className="primary-button" disabled={busy}>Save update</button></form> : null}{recurring ? <span>{recurring.type} · ${recurring.amount} on day {recurring.dayOfMonth}</span> : null}<div className="toolbar-actions"><button disabled={busy} className="secondary-button" onClick={() => onMark(item, "CONFIRMED", card ?? cash ?? recurring)}>Confirm unchanged</button><button disabled={busy} className="secondary-button" onClick={() => onMark(item, "UNKNOWN")}>Unknown</button><button disabled={busy} className="ghost-button" onClick={() => onMark(item, "SKIPPED")}>Skip</button></div></article>; })}</div><div className="form-actions"><span>{state.progress.reviewed} of {state.progress.total} reviewed</span><button className="primary-button" disabled={busy} onClick={onComplete}>Complete monthly review</button></div></section>;
}
