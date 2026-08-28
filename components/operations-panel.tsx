"use client";

import { useCallback, useEffect, useState } from "react";
import { currencyFormatter } from "@/lib/format";

type Config = {
  accounts: Array<{ id: string; name: string; currentBalance: string; minimumRequiredBalance: string }>;
  cards: Array<{ id: string; nickname: string; statementBalance: string | null; minimumPaymentDue: string | null; paymentDueDay: number | null }>;
  autopayRules: Array<{ cardId: string; fundingAccountId: string | null; mode: string; executionDay: number | null; active: boolean }>;
  recurringTransactions: Array<{ id: string; name: string; type: string; amount: string; dayOfMonth: number }>;
  promotions: Array<{ id: string; cardId: string; currentPromoBalance: string | null; endDate: string | null; deferredInterest: boolean }>;
};

type ActionSummary = {
  todayEvents: Array<{ id: string; label: string; amount: string | null; unknownReason?: string }>;
  upcomingEvents: Array<{ id: string; date: string; label: string; amount: string | null; unknownReason?: string }>;
  cashWarnings: Array<{ accountId: string; accountName: string; date: string; shortfallAmount: string }>;
  promoWarnings: Array<{ promotionId: string; riskStatus: string; requiredMonthlyPayment: string | null; monthlyShortfall: string | null; reasons: string[] }>;
  dataQualityActions: Array<{ code: string; message: string }>;
  forecasts: Array<{ accountId: string; accountName: string; startingBalance: string; projectedLowBalance: string; projectedFinalBalance: string; minimumRequiredBalance: string; firstShortfallDate: string | null; events: Array<{ id: string; date: string; label: string; amount: string | null; runningBalance: string | null }> }>;
  plannedExtraPaymentBudget: string;
  cashSafeExtraAmount: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const amountLabel = (amount: string | null) => amount == null ? "Amount unknown" : currencyFormatter.format(Math.abs(Number(amount)));

export function OperationsPanel({ variant = "summary" }: { variant?: "summary" | "configuration" }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [actions, setActions] = useState<ActionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showHealthyForecasts, setShowHealthyForecasts] = useState(false);

  const refresh = useCallback(async () => {
    const [configResponse, actionResponse] = await Promise.all([fetch("/api/operations/config"), fetch(`/api/operations/actions?asOfDate=${today()}`)]);
    const configPayload = await configResponse.json();
    const actionPayload = await actionResponse.json();
    if (!configResponse.ok || !actionResponse.ok) throw new Error(configPayload.error ?? actionPayload.error ?? "Failed to load operations data");
    setConfig(configPayload); setActions(actionPayload);
  }, []);

  useEffect(() => { refresh().catch((reason) => setError(reason instanceof Error ? reason.message : "Failed to load operations data")); }, [refresh]);

  async function send(body: unknown, method: "PATCH" | "POST") {
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/operations/config", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Save failed");
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Save failed"); }
    finally { setSaving(false); }
  }

  async function addPromotion(body: unknown) {
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/operations/promotions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Save failed");
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Save failed"); }
    finally { setSaving(false); }
  }

  if (!config || !actions) return <section className="detail-panel"><p>{error ?? "Loading operations forecast…"}</p></section>;

  const riskForecasts = actions.forecasts.filter((forecast) => forecast.firstShortfallDate);
  const visibleForecasts = showHealthyForecasts ? actions.forecasts : riskForecasts;
  const upcomingEventCount = actions.todayEvents.length + actions.upcomingEvents.length;

  return (
    <section className={`operations-core operations-${variant}`}>
      {variant === "configuration" ? <div className="detail-header"><p className="eyebrow">Operations Setup</p><h3>Statements, autopay, promotions, and recurring cash flow</h3></div> : null}
      {error ? <p className="field-error">{error}</p> : null}
      {variant === "summary" ? <>
      <div className={`two-column-grid${upcomingEventCount === 0 ? " actions-only" : ""}`}>
        {upcomingEventCount > 0 ? <section className="signal-panel">
          <div className="signal-header"><p className="eyebrow">Next 7 Days</p><h3>Expected account activity</h3></div>
          <div className="signal-list">
            {[...actions.todayEvents.map((event) => ({ ...event, date: "Today" })), ...actions.upcomingEvents].map((event) => (
              <div className="signal-item" key={event.id}><div><strong>{event.label}</strong><span>{event.date} • {amountLabel(event.amount)}</span>{event.unknownReason ? <small>{event.unknownReason}</small> : null}</div></div>
            ))}
          </div>
        </section> : null}
        <section className="signal-panel">
          <div className="signal-header"><p className="eyebrow">Recommended Actions</p><h3>Shortfalls and missing data</h3></div>
          <div className="signal-list">
            {actions.cashWarnings.map((warning) => <div className="signal-item danger" key={warning.accountId}><div><strong>Fund {warning.accountName}</strong><span>Projected {amountLabel(warning.shortfallAmount)} short on {warning.date}</span></div></div>)}
            {actions.promoWarnings.length > 0 ? <div className="signal-item warning"><div><strong>Complete promotion details</strong><span>{actions.promoWarnings.length} promotion{actions.promoWarnings.length === 1 ? " is" : "s are"} missing a balance, expiration date, or payment pace.</span></div></div> : null}
            {actions.dataQualityActions.map((action, index) => <div className="signal-item watch" key={`${action.code}-${index}`}><div><strong>Update statement data</strong><span>{action.message}</span></div></div>)}
          </div>
        </section>
      </div>
      <details className="detail-panel forecast-panel">
        <summary className="forecast-summary"><span>35-day cash forecast</span><strong>{riskForecasts.length} risk{riskForecasts.length === 1 ? "" : "s"}</strong></summary>
        <div className="forecast-controls">{actions.forecasts.length > riskForecasts.length ? <button className="text-button neutral" type="button" onClick={() => setShowHealthyForecasts((current) => !current)}>{showHealthyForecasts ? "Show risks only" : `Show all ${actions.forecasts.length} accounts`}</button> : null}</div>
        <div className="two-column-grid">
          {visibleForecasts.map((forecast) => <details key={forecast.accountId}>
            <summary><strong>{forecast.accountName}</strong> — low {amountLabel(forecast.projectedLowBalance)}, final {amountLabel(forecast.projectedFinalBalance)}</summary>
            <div className="signal-list">{forecast.events.map((event) => <div className="signal-item" key={event.id}><div><strong>{event.date} · {event.label}</strong><span>{amountLabel(event.amount)} · running {amountLabel(event.runningBalance)}</span></div></div>)}</div>
          </details>)}
          {visibleForecasts.length === 0 ? <p className="empty-copy">No projected cash shortfalls in the next 35 days.</p> : null}
        </div>
      </details>
      </> : null}
      {variant === "configuration" ? <>
      <section className="detail-panel">
        <div className="detail-header"><p className="eyebrow">Fast Update</p><h3>Statement, minimum, due date, and autopay</h3></div>
        <div className="operations-card-list">
          {config.cards.map((card) => {
            const autopay = config.autopayRules.find((rule) => rule.cardId === card.id);
            return <form className="operations-card-form" key={card.id} onSubmit={(event) => {
              event.preventDefault(); const data = new FormData(event.currentTarget);
              void Promise.all([
                send({ entity: "card", id: card.id, statementBalance: data.get("statementBalance") || null, minimumPaymentDue: data.get("minimumPaymentDue") || null, paymentDueDay: data.get("paymentDueDay") ? Number(data.get("paymentDueDay")) : null, asOfDate: data.get("asOfDate"), source: "manual" }, "PATCH"),
                send({ entity: "autopay", cardId: card.id, fundingAccountId: data.get("fundingAccountId") || null, mode: data.get("mode"), executionDay: data.get("executionDay") ? Number(data.get("executionDay")) : null, fixedAmount: null, active: data.get("mode") !== "DISABLED" }, "PATCH"),
              ]);
            }}>
              <strong>{card.nickname}</strong>
              <label><span>Statement balance</span><input name="statementBalance" type="number" min="0" step="0.01" defaultValue={card.statementBalance ?? ""} /></label>
              <label><span>Minimum due</span><input name="minimumPaymentDue" type="number" min="0" step="0.01" defaultValue={card.minimumPaymentDue ?? ""} /></label>
              <label><span>Due day</span><input name="paymentDueDay" type="number" min="1" max="31" defaultValue={card.paymentDueDay ?? ""} /></label>
              <label><span>Autopay</span><select name="mode" defaultValue={autopay?.mode ?? "UNKNOWN"}><option value="STATEMENT_BALANCE">Statement balance</option><option value="MINIMUM_PAYMENT">Minimum</option><option value="PROMO_TARGET">Promo target</option><option value="DISABLED">Disabled</option><option value="UNKNOWN">Unknown</option></select></label>
              <label><span>Funding account</span><select name="fundingAccountId" defaultValue={autopay?.fundingAccountId ?? ""}><option value="">Not confirmed</option>{config.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
              <label><span>Execution day</span><input name="executionDay" type="number" min="1" max="31" defaultValue={autopay?.executionDay ?? ""} /></label>
              <label><span>As of</span><input name="asOfDate" type="date" defaultValue={today()} required /></label>
              <button className="secondary-button" disabled={saving} type="submit">Save card details</button>
            </form>;
          })}
        </div>
      </section>
      <section className="detail-panel">
        <div className="detail-header"><p className="eyebrow">Promo Deadlines</p><h3>Add a card-specific promotional balance</h3></div>
        <form className="form-grid" onSubmit={(event) => {
          event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
          void addPromotion({ creditCardId: data.get("creditCardId"), type: data.get("promoType"), currentPromoBalance: data.get("currentPromoBalance") || null, promotionalApr: data.get("promotionalApr") || null, standardAprAfterPromo: data.get("standardAprAfterPromo") || null, endDate: data.get("endDate") || null, targetPayoffDate: data.get("targetPayoffDate") || null, deferredInterest: data.get("deferredInterest") === "on", safetyBufferDays: Number(data.get("safetyBufferDays")) }).then(() => form.reset());
        }}>
          <label><span>Card</span><select name="creditCardId" required>{config.cards.map((card) => <option key={card.id} value={card.id}>{card.nickname}</option>)}</select></label>
          <label><span>Type</span><select name="promoType"><option value="BALANCE_TRANSFER">Balance transfer</option><option value="PURCHASE_PROMO">Purchase promo</option><option value="APR_PROMO">APR promo</option><option value="DEFERRED_INTEREST">Deferred interest</option><option value="UNKNOWN">Unknown</option></select></label>
          <label><span>Promo balance</span><input name="currentPromoBalance" type="number" min="0" step="0.01" /></label>
          <label><span>Promo APR</span><input name="promotionalApr" type="number" min="0" step="0.01" /></label>
          <label><span>Post-promo APR</span><input name="standardAprAfterPromo" type="number" min="0" step="0.01" /></label>
          <label><span>Expiration</span><input name="endDate" type="date" /></label>
          <label><span>Target payoff</span><input name="targetPayoffDate" type="date" /></label>
          <label><span>Safety days</span><input name="safetyBufferDays" type="number" min="0" max="90" defaultValue="14" /></label>
          <label><span>Deferred interest</span><input name="deferredInterest" type="checkbox" /></label>
          <button className="primary-button" disabled={saving || config.cards.length === 0} type="submit">Add promotion</button>
        </form>
        <div className="signal-list">{config.promotions.map((promo) => { const card = config.cards.find((item) => item.id === promo.cardId); return <div className="signal-item" key={promo.id}><div><strong>{card?.nickname ?? "Card"}</strong><span>{amountLabel(promo.currentPromoBalance)} • ends {promo.endDate ?? "unknown"}{promo.deferredInterest ? " • deferred interest" : ""}</span></div></div>; })}</div>
      </section>
      <section className="detail-panel">
        <div className="detail-header"><p className="eyebrow">Recurring Cash Flow</p><h3>Add monthly income, expenses, or transfers</h3></div>
        <form className="form-grid" onSubmit={(event) => {
          event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const type = String(data.get("type"));
          void send({ name: data.get("name"), type, amount: data.get("amount"), dayOfMonth: Number(data.get("dayOfMonth")), sourceAccountId: data.get("sourceAccountId") || null, destinationAccountId: data.get("destinationAccountId") || null, category: data.get("category") || null }, "POST").then(() => form.reset());
        }}>
          <label><span>Name</span><input name="name" required /></label>
          <label><span>Type</span><select name="type"><option value="EXPENSE">Expense</option><option value="INCOME">Income</option><option value="TRANSFER">Transfer</option><option value="DEBT_PAYMENT">Debt payment</option></select></label>
          <label><span>Amount</span><input name="amount" type="number" min="0.01" step="0.01" required /></label>
          <label><span>Day of month</span><input name="dayOfMonth" type="number" min="1" max="31" required /></label>
          <label><span>Source</span><select name="sourceAccountId"><option value="">None</option>{config.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          <label><span>Destination</span><select name="destinationAccountId"><option value="">None</option>{config.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          <label><span>Category</span><input name="category" placeholder="Mortgage, payroll…" /></label>
          <button className="primary-button" disabled={saving} type="submit">Add recurring transaction</button>
        </form>
        <div className="signal-list">{config.recurringTransactions.map((tx) => <div className="signal-item" key={tx.id}><div><strong>{tx.name}</strong><span>{tx.type.toLowerCase().replace("_", " ")} • {amountLabel(tx.amount)} on day {tx.dayOfMonth}</span></div></div>)}</div>
      </section>
      </> : null}
    </section>
  );
}
