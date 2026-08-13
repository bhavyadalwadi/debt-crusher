"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { currencyFormatter } from "@/lib/format";
import type { ActivitySnapshot } from "@/lib/types";

type TrendRange = "30d" | "90d" | "1y" | "all";
type PortfolioMetric = "credit" | "cash" | "utilization";
type AccountMetric = "balance" | "utilization";

interface AccountOption {
  id: string;
  selectorKey: string;
  kind: "credit" | "cash";
  name: string;
  institution: string;
  historicalOnly: boolean;
}

const ranges: Array<{ value: TrendRange; label: string; days: number | null }> = [
  { value: "30d", label: "30d", days: 30 },
  { value: "90d", label: "90d", days: 90 },
  { value: "1y", label: "1y", days: 365 },
  { value: "all", label: "All", days: null },
];

const portfolioMetrics: Record<
  PortfolioMetric,
  { label: string; color: string; format: (value: number) => string }
> = {
  credit: {
    label: "Total credit balance",
    color: "#b3452f",
    format: (value) => currencyFormatter.format(value),
  },
  cash: {
    label: "Safe cash",
    color: "#1f6b5d",
    format: (value) => currencyFormatter.format(value),
  },
  utilization: {
    label: "Weighted utilization",
    color: "#476d96",
    format: (value) => `${value.toFixed(1)}%`,
  },
};

function chronologicalSnapshots(snapshots: ActivitySnapshot[]) {
  return [...snapshots].sort(
    (left, right) =>
      new Date(left.importedAt).getTime() - new Date(right.importedAt).getTime(),
  );
}

function filterByRange(snapshots: ActivitySnapshot[], range: TrendRange) {
  const rangeConfig = ranges.find((item) => item.value === range);
  if (!rangeConfig?.days || snapshots.length === 0) return snapshots;

  const latestTime = new Date(snapshots[snapshots.length - 1].importedAt).getTime();
  const cutoff = latestTime - rangeConfig.days * 24 * 60 * 60 * 1000;
  return snapshots.filter(
    (snapshot) => new Date(snapshot.importedAt).getTime() >= cutoff,
  );
}

function formatAxisDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatCheckpoint(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function RangeControls({
  value,
  onChange,
}: {
  value: TrendRange;
  onChange: (range: TrendRange) => void;
}) {
  return (
    <div
      className="trend-range-controls"
      aria-label="Trend date range"
      role="group"
    >
      {ranges.map((range) => (
        <button
          aria-pressed={value === range.value}
          className={value === range.value ? "active" : ""}
          key={range.value}
          onClick={() => onChange(range.value)}
          type="button"
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

function TrendEmptyState({ message }: { message: string }) {
  return <div className="trend-empty-state">{message}</div>;
}

function downsampleTrend(
  data: Array<{ timestamp: number; value: number | null }>,
  maxPoints = 180,
) {
  if (data.length <= maxPoints) return data;

  const step = Math.ceil(data.length / maxPoints);
  return data.filter((point, index) => {
    if (index === 0 || index === data.length - 1 || index % step === 0) {
      return true;
    }
    const previous = data[index - 1];
    const next = data[index + 1];
    return (point.value === null) !== (previous.value === null) ||
      (point.value === null) !== (next.value === null);
  });
}

function TrendChart({
  data,
  color,
  formatter,
}: {
  data: Array<{ timestamp: number; value: number | null }>;
  color: string;
  formatter: (value: number) => string;
}) {
  if (data.length === 0) {
    return <TrendEmptyState message="No checkpoints fall within this range." />;
  }

  const hasValue = data.some((point) => point.value !== null);
  if (!hasValue) {
    return <TrendEmptyState message="This account has no values in this range." />;
  }
  const chartData = downsampleTrend(data);

  return (
    <>
      {data.length === 1 ? (
        <p className="trend-note">One checkpoint recorded. Add another to reveal the trend.</p>
      ) : null}
      <div className="chart-shell trend-chart-shell">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 8, right: 10, left: 6, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d7d1c4" />
            <XAxis
              axisLine={false}
              dataKey="timestamp"
              minTickGap={28}
              tickFormatter={formatAxisDate}
              tickLine={false}
              type="number"
              domain={["dataMin", "dataMax"]}
            />
            <YAxis
              axisLine={false}
              tickFormatter={(value: number) => formatter(value)}
              tickLine={false}
              width={78}
            />
            <Tooltip
              formatter={(value: number) => [formatter(value), "Value"]}
              labelFormatter={(value) => formatCheckpoint(Number(value))}
            />
            <Line
              connectNulls={false}
              dataKey="value"
              dot={chartData.length <= 12 ? { r: 3 } : false}
              activeDot={{ r: 5 }}
              stroke={color}
              strokeWidth={2.5}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export function TrendPanels({ snapshots }: { snapshots: ActivitySnapshot[] }) {
  const [range, setRange] = useState<TrendRange>("all");
  const [portfolioMetric, setPortfolioMetric] =
    useState<PortfolioMetric>("credit");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [accountMetric, setAccountMetric] = useState<AccountMetric>("balance");

  const chronological = useMemo(() => chronologicalSnapshots(snapshots), [snapshots]);
  const filtered = useMemo(
    () => filterByRange(chronological, range),
    [chronological, range],
  );
  const accountOptions = useMemo(() => {
    const latest = chronological.at(-1);
    const currentIds = new Set([
      ...(latest?.creditAccounts.map((account) => `credit:${account.id}`) ?? []),
      ...(latest?.cashAccounts.map((account) => `cash:${account.id}`) ?? []),
    ]);
    const accounts = new Map<string, Omit<AccountOption, "historicalOnly">>();

    chronological.forEach((entry) => {
      entry.creditAccounts.forEach((account) => {
        accounts.set(`credit:${account.id}`, {
          id: account.id,
          selectorKey: `credit:${account.id}`,
          kind: "credit",
          name: account.nickname,
          institution: account.institution,
        });
      });
      entry.cashAccounts.forEach((account) => {
        accounts.set(`cash:${account.id}`, {
          id: account.id,
          selectorKey: `cash:${account.id}`,
          kind: "cash",
          name: account.account_name,
          institution: account.institution,
        });
      });
    });

    return [...accounts.values()]
      .map((account) => ({
        ...account,
        historicalOnly: !currentIds.has(account.selectorKey),
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [chronological]);

  const selectedAccount =
    accountOptions.find((account) => account.selectorKey === selectedAccountId) ??
    accountOptions[0] ??
    null;
  const effectiveAccountMetric =
    selectedAccount?.kind === "cash" ? "balance" : accountMetric;

  const portfolioData = filtered.map((entry) => ({
    timestamp: new Date(entry.importedAt).getTime(),
    value:
      portfolioMetric === "credit"
        ? entry.dashboardSummary.total_credit_balance
        : portfolioMetric === "cash"
          ? entry.dashboardSummary.total_cash_above_minimums
          : entry.dashboardSummary.weighted_utilization_percent,
  }));

  const accountData = filtered.map((entry) => {
    const creditAccount =
      selectedAccount?.kind === "credit"
        ? entry.creditAccounts.find((account) => account.id === selectedAccount.id)
        : undefined;
    const cashAccount =
      selectedAccount?.kind === "cash"
        ? entry.cashAccounts.find((account) => account.id === selectedAccount.id)
        : undefined;
    return {
      timestamp: new Date(entry.importedAt).getTime(),
      value: creditAccount
        ? effectiveAccountMetric === "utilization"
          ? creditAccount.utilization_percent
          : creditAccount.current_balance
        : cashAccount?.current_balance ?? null,
    };
  });

  const portfolioConfig = portfolioMetrics[portfolioMetric];
  const accountFormatter =
    effectiveAccountMetric === "utilization"
      ? (value: number) => `${value.toFixed(1)}%`
      : (value: number) => currencyFormatter.format(value);

  return (
    <>
      <section className="chart-panel trend-panel">
        <div className="chart-header trend-panel-header">
          <div>
            <p className="eyebrow">Portfolio Trend</p>
            <h3>{portfolioConfig.label} over time</h3>
          </div>
          <RangeControls value={range} onChange={setRange} />
        </div>
        <label className="trend-select-label">
          <span>Metric</span>
          <select
            value={portfolioMetric}
            onChange={(event) =>
              setPortfolioMetric(event.target.value as PortfolioMetric)
            }
          >
            {Object.entries(portfolioMetrics).map(([value, metric]) => (
              <option key={value} value={value}>
                {metric.label}
              </option>
            ))}
          </select>
        </label>
        <TrendChart
          color={portfolioConfig.color}
          data={portfolioData}
          formatter={portfolioConfig.format}
        />
      </section>

      <section className="chart-panel trend-panel">
        <div className="chart-header trend-panel-header">
          <div>
            <p className="eyebrow">Account Trend</p>
            <h3>{selectedAccount ? selectedAccount.name : "Account history"}</h3>
          </div>
          <RangeControls value={range} onChange={setRange} />
        </div>
        {selectedAccount ? (
          <div className="trend-select-grid">
            <label className="trend-select-label">
              <span>Account</span>
              <select
                value={selectedAccount.selectorKey}
                onChange={(event) => {
                  const nextAccount = accountOptions.find(
                    (account) => account.selectorKey === event.target.value,
                  );
                  setSelectedAccountId(event.target.value);
                  if (nextAccount?.kind === "cash") setAccountMetric("balance");
                }}
              >
                {accountOptions.map((account) => (
                  <option key={account.selectorKey} value={account.selectorKey}>
                    {account.name} · {account.institution}
                    {account.historicalOnly ? " (historical)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="trend-select-label">
              <span>Metric</span>
              <select
                disabled={selectedAccount.kind === "cash"}
                value={effectiveAccountMetric}
                onChange={(event) =>
                  setAccountMetric(event.target.value as AccountMetric)
                }
              >
                <option value="balance">Balance</option>
                {selectedAccount.kind === "credit" ? (
                  <option value="utilization">Utilization</option>
                ) : null}
              </select>
            </label>
          </div>
        ) : null}
        {selectedAccount ? (
          <TrendChart
            color={selectedAccount.kind === "credit" ? "#b3452f" : "#1f6b5d"}
            data={accountData}
            formatter={accountFormatter}
          />
        ) : (
          <TrendEmptyState message="Record an account checkpoint to begin tracking it." />
        )}
      </section>
    </>
  );
}
