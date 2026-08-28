"use client";

import { validateSetup } from "@/lib/form-validation";
import type { SetupConfig } from "@/lib/types";

const weightLabels: Record<keyof SetupConfig["custom_strategy_weights"], string> = {
  interest_now: "Interest now",
  apr_percent: "APR",
  utilization_percent: "Utilization",
  promo_expired: "Promo expired",
  promo_end_soon: "Promo ending soon",
  balance_size: "Small-balance push",
  due_soon: "Due soon",
  statement_balance_autopay_penalty: "Autopay penalty",
};

export function PayoffSettingsPanel({
  setup,
  onSetupChange,
}: {
  setup: SetupConfig;
  onSetupChange: (setup: SetupConfig) => void;
}) {
  const errors = validateSetup(setup);
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <section className="detail-panel payoff-settings-panel">
      <div className="detail-header">
        <p className="eyebrow">Payoff Settings</p>
        <h3>Ranking and safe-cash preferences</h3>
      </div>
      <p className="form-intro">These values control payoff priority, promotional urgency, and safe-cash calculations.</p>
      <div className="form-grid">
        <label>
          <span>Payoff strategy</span>
          <select value={setup.payoff_strategy} onChange={(event) => onSetupChange({ ...setup, payoff_strategy: event.target.value as SetupConfig["payoff_strategy"] })}>
            <option value="avalanche">Avalanche</option>
            <option value="snowball">Snowball</option>
            <option value="promo-first">Promo-first</option>
            <option value="custom">Custom</option>
          </select>
          <small className="field-hint">Avalanche favors APR, snowball favors smaller wins, and promo-first favors expiring offers.</small>
        </label>
        <label>
          <span>Extra payment budget</span>
          <input className={errors.extra_payment_budget ? "field-invalid" : ""} type="number" min="0" value={setup.extra_payment_budget} onChange={(event) => onSetupChange({ ...setup, extra_payment_budget: Number(event.target.value) })} />
          <small className={errors.extra_payment_budget ? "field-error" : "field-hint"}>{errors.extra_payment_budget ?? "Amount available above required payments."}</small>
        </label>
        <label>
          <span>Promo soon days</span>
          <input className={errors.promo_end_soon_days ? "field-invalid" : ""} type="number" min="0" value={setup.promo_end_soon_days} onChange={(event) => onSetupChange({ ...setup, promo_end_soon_days: Number(event.target.value) })} />
          <small className={errors.promo_end_soon_days ? "field-error" : "field-hint"}>{errors.promo_end_soon_days ?? "Cards inside this window receive promo urgency."}</small>
        </label>
        <label>
          <span>Global cash buffer override</span>
          <input className={errors.global_cash_buffer_override ? "field-invalid" : ""} type="number" min="0" value={setup.global_cash_buffer_override ?? ""} placeholder="Use account minimums" onChange={(event) => onSetupChange({ ...setup, global_cash_buffer_override: event.target.value === "" ? null : Number(event.target.value) })} />
          <small className={errors.global_cash_buffer_override ? "field-error" : "field-hint"}>{errors.global_cash_buffer_override ?? "Leave blank to use each account’s minimum."}</small>
        </label>
      </div>
      {setup.payoff_strategy === "custom" ? (
        <div className="custom-weights-panel">
          <div className="detail-header"><p className="eyebrow">Custom Weights</p><h3>Fine-tune the ranking engine</h3></div>
          <div className="form-grid">
            {(Object.keys(weightLabels) as Array<keyof SetupConfig["custom_strategy_weights"]>).map((key) => (
              <label key={key}>
                <span>{weightLabels[key]}</span>
                <input type="number" value={setup.custom_strategy_weights[key]} onChange={(event) => onSetupChange({ ...setup, custom_strategy_weights: { ...setup.custom_strategy_weights, [key]: Number(event.target.value) } })} />
              </label>
            ))}
          </div>
          {errors.custom_strategy_weights ? <p className="form-warning">{errors.custom_strategy_weights}</p> : <p className="form-intro">Higher values make a factor matter more.</p>}
        </div>
      ) : null}
      <p className={hasErrors ? "form-warning" : "form-status-note"}>{hasErrors ? "Fix setup errors before saving." : "Valid settings autosave. Record an update when you want a history checkpoint."}</p>
    </section>
  );
}
