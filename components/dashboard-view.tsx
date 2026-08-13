"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatusBadge } from "@/components/status-badge";
import { OperationsPanel } from "@/components/operations-panel";
import { TrendPanels } from "@/components/trend-panels";
import { currencyFormatter, formatPercentFromValue } from "@/lib/format";
import { validateSetup } from "@/lib/form-validation";
import type {
  ActivitySnapshot,
  ActivitySnapshot as Snapshot,
  SetupConfig,
  SnapshotDelta,
} from "@/lib/types";

const chartColors = ["#1f6b5d", "#c4893b", "#6f7c73", "#b3452f", "#3d5f83"];

interface DashboardViewProps {
  snapshot: Snapshot;
  activitySnapshots: ActivitySnapshot[];
  setup: SetupConfig;
  deltaFromPrevious: SnapshotDelta | null;
  onSetupChange: (setup: SetupConfig) => void;
}

export function DashboardView({
  snapshot,
  activitySnapshots,
  setup,
  deltaFromPrevious,
  onSetupChange,
}: DashboardViewProps) {
  const setupErrors = validateSetup(setup);
  const hasSetupErrors = Object.keys(setupErrors).length > 0;
  const { dashboardSummary, creditAccounts, cashAccounts } = snapshot;
  const debtChartData = creditAccounts
    .filter((account) => account.current_balance > 0)
    .sort((left, right) => right.current_balance - left.current_balance)
    .slice(0, 8)
    .map((account) => ({
      name: account.nickname,
      value: account.current_balance,
    }));
  const utilizationChartData = creditAccounts.map((account) => ({
    name: account.nickname,
    utilization: Number(account.utilization_percent.toFixed(1)),
  }));
  const cashChartData = cashAccounts.map((account) => ({
    name: account.account_name,
    value: Number(account.available_above_minimum.toFixed(2)),
  }));
  const recommendedReasons = dashboardSummary.recommended_target_reasons;

  function formatDelta(value: number) {
    const prefix = value > 0 ? "+" : "";
    return `${prefix}${currencyFormatter.format(value)}`;
  }

  function formatStrategyLabel(value: SetupConfig["payoff_strategy"]) {
    if (value === "promo-first") {
      return "promo-first";
    }

    return value;
  }

  return (
    <section className="view-shell">
      <div className="hero-band">
        <div className="hero-copy">
          <p className="eyebrow">Immediate Focus</p>
          <h2>
            {dashboardSummary.recommended_target_card
              ? `${dashboardSummary.recommended_target_card.nickname} should take the next extra dollar.`
              : "All credit cards are paid off right now."}
          </h2>
          <p className="subtle-copy">
            The ranking still weights active interest first, but statement-balance
            autopay cards are downgraded to a watch state unless a promo has
            already expired. Current strategy:{" "}
            <strong>{formatStrategyLabel(dashboardSummary.payoff_strategy)}</strong>.
          </p>
          {recommendedReasons.length > 0 ? (
            <ul className="reason-list">
              {recommendedReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="focus-strip">
          {dashboardSummary.recommended_target_card ? (
            <>
              <div className="focus-headline">
                <span>{dashboardSummary.recommended_target_card.institution}</span>
                <StatusBadge
                  status={dashboardSummary.recommended_target_card.status_flag}
                />
              </div>
              <strong>
                {currencyFormatter.format(
                  dashboardSummary.recommended_target_card.current_balance,
                )}
              </strong>
              <span>
                APR{" "}
                {formatPercentFromValue(
                  dashboardSummary.recommended_target_card.apr_percent,
                )}{" "}
                • Rank #{dashboardSummary.recommended_target_card.priority_rank}
              </span>
            </>
          ) : (
            <strong>Nothing currently needs a payoff target.</strong>
          )}
        </div>
      </div>

      <div className="metric-grid">
        <article>
          <span>Total Credit Balance</span>
          <strong>{currencyFormatter.format(dashboardSummary.total_credit_balance)}</strong>
        </article>
        <article>
          <span>Weighted Utilization</span>
          <strong>
            {formatPercentFromValue(
              dashboardSummary.weighted_utilization_percent,
            )}
          </strong>
        </article>
        <article>
          <span>Cash Above Minimums</span>
          <strong>
            {currencyFormatter.format(
              dashboardSummary.total_cash_above_minimums,
            )}
          </strong>
        </article>
        <article>
          <span>Extra Payment Budget</span>
          <strong>{currencyFormatter.format(dashboardSummary.extra_payment_budget)}</strong>
        </article>
      </div>

      <OperationsPanel />

      <div className="two-column-grid">
        <section className="signal-panel">
          <div className="signal-header">
            <p className="eyebrow">Watchlist</p>
            <h3>Urgent, warning, and watch accounts</h3>
          </div>
          <div className="signal-list">
            {dashboardSummary.credit_danger_items.map((item) => (
              <div key={item.id} className="signal-item danger">
                <div>
                  <strong>{item.nickname}</strong>
                  <span>
                    {item.institution} • {currencyFormatter.format(item.current_balance)}
                  </span>
                </div>
                <StatusBadge status={item.status_flag} />
              </div>
            ))}
            {dashboardSummary.credit_warning_items.map((item) => (
              <div key={item.id} className="signal-item warning">
                <div>
                  <strong>{item.nickname}</strong>
                  <span>
                    APR {formatPercentFromValue(item.apr_percent)} • Due soon
                  </span>
                </div>
                <StatusBadge status={item.status_flag} />
              </div>
            ))}
            {dashboardSummary.credit_watch_items.map((item) => (
              <div key={item.id} className="signal-item watch">
                <div>
                  <strong>{item.nickname}</strong>
                  <span>
                    Statement balance autopay • {currencyFormatter.format(item.current_balance)}
                  </span>
                </div>
                <StatusBadge status={item.status_flag} />
              </div>
            ))}
            {dashboardSummary.cash_danger_items.map((item) => (
              <div key={item.id} className="signal-item danger">
                <div>
                  <strong>{item.account_name}</strong>
                  <span>
                    {item.institution} • {currencyFormatter.format(item.available_above_minimum)}
                  </span>
                </div>
                <StatusBadge status={item.status_flag} />
              </div>
            ))}
          </div>
        </section>

        <section className="detail-panel">
          <div className="detail-header">
            <p className="eyebrow">Setup</p>
            <h3>Edit payoff settings</h3>
          </div>
          <p className="form-intro">
            These values change ranking urgency and safe cash calculations across
            the whole dashboard.
          </p>
          <div className="form-grid">
            <label>
              <span>Payoff strategy</span>
              <select
                className={setupErrors.payoff_strategy ? "field-invalid" : ""}
                value={setup.payoff_strategy}
                onChange={(event) =>
                  onSetupChange({
                    ...setup,
                    payoff_strategy: event.target.value as SetupConfig["payoff_strategy"],
                  })
                }
              >
                <option value="avalanche">Avalanche</option>
                <option value="snowball">Snowball</option>
                <option value="promo-first">Promo-first</option>
              </select>
              {setupErrors.payoff_strategy ? (
                <small className="field-error">{setupErrors.payoff_strategy}</small>
              ) : (
                <small className="field-hint">
                  Avalanche favors APR, snowball favors smaller wins, and promo-first
                  pushes expiring promos higher. Custom lets you tune the weights directly.
                </small>
              )}
            </label>
            <label>
              <span>Extra payment budget</span>
              <input
                className={setupErrors.extra_payment_budget ? "field-invalid" : ""}
                type="number"
                value={setup.extra_payment_budget}
                onChange={(event) =>
                  onSetupChange({
                    ...setup,
                    extra_payment_budget: Number(event.target.value),
                  })
                }
              />
              {setupErrors.extra_payment_budget ? (
                <small className="field-error">{setupErrors.extra_payment_budget}</small>
              ) : (
                <small className="field-hint">
                  The extra amount you can send above minimum payments.
                </small>
              )}
            </label>
            <label>
              <span>Promo soon days</span>
              <input
                className={setupErrors.promo_end_soon_days ? "field-invalid" : ""}
                type="number"
                value={setup.promo_end_soon_days}
                onChange={(event) =>
                  onSetupChange({
                    ...setup,
                    promo_end_soon_days: Number(event.target.value),
                  })
                }
              />
              {setupErrors.promo_end_soon_days ? (
                <small className="field-error">{setupErrors.promo_end_soon_days}</small>
              ) : (
                <small className="field-hint">
                  Cards inside this window get promo urgency.
                </small>
              )}
            </label>
            <label>
              <span>Global cash buffer override</span>
              <input
                className={
                  setupErrors.global_cash_buffer_override ? "field-invalid" : ""
                }
                type="number"
                value={setup.global_cash_buffer_override ?? ""}
                placeholder="Optional"
                onChange={(event) =>
                  onSetupChange({
                    ...setup,
                    global_cash_buffer_override:
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                  })
                }
              />
              {setupErrors.global_cash_buffer_override ? (
                <small className="field-error">
                  {setupErrors.global_cash_buffer_override}
                </small>
              ) : (
                <small className="field-hint">
                  Leave blank to use each account&apos;s own minimum.
                </small>
              )}
            </label>
          </div>
          {setup.payoff_strategy === "custom" ? (
            <div className="custom-weights-panel">
              <div className="detail-header">
                <p className="eyebrow">Custom Weights</p>
                <h3>Fine-tune the ranking engine</h3>
              </div>
              <div className="form-grid">
                <label>
                  <span>Interest now</span>
                  <input
                    type="number"
                    value={setup.custom_strategy_weights.interest_now}
                    onChange={(event) =>
                      onSetupChange({
                        ...setup,
                        custom_strategy_weights: {
                          ...setup.custom_strategy_weights,
                          interest_now: Number(event.target.value),
                        },
                      })
                    }
                  />
                </label>
                <label>
                  <span>APR</span>
                  <input
                    type="number"
                    value={setup.custom_strategy_weights.apr_percent}
                    onChange={(event) =>
                      onSetupChange({
                        ...setup,
                        custom_strategy_weights: {
                          ...setup.custom_strategy_weights,
                          apr_percent: Number(event.target.value),
                        },
                      })
                    }
                  />
                </label>
                <label>
                  <span>Utilization</span>
                  <input
                    type="number"
                    value={setup.custom_strategy_weights.utilization_percent}
                    onChange={(event) =>
                      onSetupChange({
                        ...setup,
                        custom_strategy_weights: {
                          ...setup.custom_strategy_weights,
                          utilization_percent: Number(event.target.value),
                        },
                      })
                    }
                  />
                </label>
                <label>
                  <span>Promo expired</span>
                  <input
                    type="number"
                    value={setup.custom_strategy_weights.promo_expired}
                    onChange={(event) =>
                      onSetupChange({
                        ...setup,
                        custom_strategy_weights: {
                          ...setup.custom_strategy_weights,
                          promo_expired: Number(event.target.value),
                        },
                      })
                    }
                  />
                </label>
                <label>
                  <span>Promo ending soon</span>
                  <input
                    type="number"
                    value={setup.custom_strategy_weights.promo_end_soon}
                    onChange={(event) =>
                      onSetupChange({
                        ...setup,
                        custom_strategy_weights: {
                          ...setup.custom_strategy_weights,
                          promo_end_soon: Number(event.target.value),
                        },
                      })
                    }
                  />
                </label>
                <label>
                  <span>Small-balance push</span>
                  <input
                    type="number"
                    value={setup.custom_strategy_weights.balance_size}
                    onChange={(event) =>
                      onSetupChange({
                        ...setup,
                        custom_strategy_weights: {
                          ...setup.custom_strategy_weights,
                          balance_size: Number(event.target.value),
                        },
                      })
                    }
                  />
                </label>
                <label>
                  <span>Due soon</span>
                  <input
                    type="number"
                    value={setup.custom_strategy_weights.due_soon}
                    onChange={(event) =>
                      onSetupChange({
                        ...setup,
                        custom_strategy_weights: {
                          ...setup.custom_strategy_weights,
                          due_soon: Number(event.target.value),
                        },
                      })
                    }
                  />
                </label>
                <label>
                  <span>Autopay penalty</span>
                  <input
                    type="number"
                    value={
                      setup.custom_strategy_weights.statement_balance_autopay_penalty
                    }
                    onChange={(event) =>
                      onSetupChange({
                        ...setup,
                        custom_strategy_weights: {
                          ...setup.custom_strategy_weights,
                          statement_balance_autopay_penalty: Number(
                            event.target.value,
                          ),
                        },
                      })
                    }
                  />
                </label>
              </div>
              {setupErrors.custom_strategy_weights ? (
                <p className="form-warning">{setupErrors.custom_strategy_weights}</p>
              ) : (
                <p className="form-intro">
                  Higher values make that factor matter more inside custom mode.
                </p>
              )}
            </div>
          ) : null}
          {hasSetupErrors ? (
            <p className="form-warning">Fix setup errors before saving.</p>
          ) : null}
          {!hasSetupErrors ? (
            <p className="form-status-note">
              Valid settings autosave. Use Record Update above for history.
            </p>
          ) : null}
        </section>
      </div>

      <section className="signal-panel">
        <div className="signal-header">
          <p className="eyebrow">Since Last Checkpoint</p>
          <h3>What changed since the latest recorded update</h3>
        </div>
        {deltaFromPrevious ? (
          <div className="delta-grid">
            <div>
              <span>Credit balance</span>
              <strong>{formatDelta(deltaFromPrevious.creditBalanceChange)}</strong>
            </div>
            <div>
              <span>Cash above minimums</span>
              <strong>{formatDelta(deltaFromPrevious.cashAboveMinimumChange)}</strong>
            </div>
            <div>
              <span>Extra payment budget</span>
              <strong>{formatDelta(deltaFromPrevious.extraPaymentBudgetChange)}</strong>
            </div>
          </div>
        ) : (
          <p className="empty-copy">
            Record at least one update to start showing change summaries.
          </p>
        )}
      </section>

      <div className="chart-grid">
        <section className="chart-panel">
          <div className="chart-header">
            <p className="eyebrow">Debt by Card</p>
            <h3>Balances by target size</h3>
          </div>
          <div className="chart-shell">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={debtChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d7d1c4" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => currencyFormatter.format(value)} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {debtChartData.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="chart-panel">
          <div className="chart-header">
            <p className="eyebrow">Utilization</p>
            <h3>Pressure by card</h3>
          </div>
          <div className="chart-shell">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={utilizationChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d7d1c4" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Bar dataKey="utilization" fill="#1f6b5d" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <TrendPanels snapshots={activitySnapshots} />

        <section className="chart-panel">
          <div className="chart-header">
            <p className="eyebrow">Cash Buffer</p>
            <h3>Available above minimums</h3>
          </div>
          <div className="chart-shell">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={cashChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d7d1c4" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => currencyFormatter.format(value)} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {cashChartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.value < 0 ? "#b3452f" : "#1f6b5d"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </section>
  );
}
