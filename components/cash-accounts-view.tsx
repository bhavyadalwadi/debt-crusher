"use client";

import { useEffect, useMemo, useState } from "react";
import { validateCashAccounts } from "@/lib/form-validation";
import { InstitutionCombobox } from "@/components/institution-combobox";
import { StatusBadge } from "@/components/status-badge";
import { currencyFormatter } from "@/lib/format";
import { CASH_ACCOUNT_INSTITUTIONS } from "@/lib/institution-options";
import type { CashAccount, CashAccountInput } from "@/lib/types";

function numberValue(value: string) {
  return value === "" ? 0 : Number(value);
}

interface CashAccountsViewProps {
  accounts: CashAccount[];
  draftAccounts: CashAccountInput[];
  globalBufferOverride: number | null;
  dirty: boolean;
  onChange: (accounts: CashAccountInput[]) => void;
  onSave: () => Promise<void>;
  onAdd: () => void;
}

export function CashAccountsView({
  accounts,
  draftAccounts,
  globalBufferOverride,
  dirty,
  onChange,
  onSave,
  onAdd,
}: CashAccountsViewProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    accounts[0]?.id ?? null,
  );

  useEffect(() => {
    if (!selectedAccountId && accounts[0]) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const safeCapacity = accounts.reduce(
    (sum, account) => sum + Math.max(0, account.available_above_minimum),
    0,
  );
  const deficit = accounts.reduce(
    (sum, account) => sum + Math.min(0, account.available_above_minimum),
    0,
  );
  const validation = useMemo(
    () => validateCashAccounts(draftAccounts),
    [draftAccounts],
  );
  const selectedDraft =
    draftAccounts.find((account) => account.id === selectedAccountId) ??
    draftAccounts[0] ??
    null;
  const selectedErrors = selectedDraft
    ? validation.errorsById[selectedDraft.id] ?? {}
    : {};

  function updateSelected(
    updater: (account: CashAccountInput) => CashAccountInput,
  ) {
    if (!selectedDraft) {
      return;
    }

    onChange(
      draftAccounts.map((account) =>
        account.id === selectedDraft.id ? updater(account) : account,
      ),
    );
  }

  function handleEnterSave(event: React.KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (dirty && !validation.hasErrors) {
        void onSave();
      }
    }
  }

  function removeSelected() {
    if (!selectedDraft) {
      return;
    }
    if (!window.confirm(`Remove ${selectedDraft.account_name || "this account"}?`)) {
      return;
    }

    const next = draftAccounts.filter((account) => account.id !== selectedDraft.id);
    onChange(next);
    setSelectedAccountId(next[0]?.id ?? null);
  }

  return (
    <section className="view-shell">
      <div className="hero-band compact">
        <div className="hero-copy">
          <p className="eyebrow">Cash Accounts</p>
          <h2>Edit the liquidity that protects your plan.</h2>
          <p className="subtle-copy">
            Cash changes save into the local portfolio and feed the history chart
            on the dashboard.
          </p>
        </div>
        <div className="focus-strip">
          <span>Deployable cash</span>
          <strong>{currencyFormatter.format(safeCapacity)}</strong>
          <span>
            {globalBufferOverride === null
              ? "Per-account minimums active"
              : `Global minimum ${currencyFormatter.format(globalBufferOverride)}`}
          </span>
        </div>
      </div>

      <div className="metric-grid two-up">
        <article>
          <span>Total safe cash capacity</span>
          <strong>{currencyFormatter.format(safeCapacity)}</strong>
        </article>
        <article>
          <span>Accounts below buffer</span>
          <strong>{currencyFormatter.format(Math.abs(deficit))}</strong>
        </article>
      </div>

      <div className="table-layout">
        <div className="table-panel">
          <div className="toolbar-actions table-toolbar">
            <button className="secondary-button" onClick={onAdd} type="button">
              Add Account
            </button>
            <button
              className="primary-button save-button"
              disabled={!dirty || validation.hasErrors}
              onClick={onSave}
              type="button"
            >
              Save Accounts
            </button>
          </div>
          {validation.message ? (
            <p className="form-warning">{validation.message}</p>
          ) : (
            <p className="form-intro">
              Keep balances and minimums current so safe cash reflects reality.
            </p>
          )}
          <table className="data-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Type</th>
                <th>Status</th>
                <th>Balance</th>
                <th>Required minimum</th>
                <th>Available above minimum</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr
                  key={account.id}
                  className={account.id === selectedAccountId ? "selected" : ""}
                  onClick={() => setSelectedAccountId(account.id)}
                >
                  <td>
                    <strong>{account.account_name || "Unnamed account"}</strong>
                    <span className="cell-subtitle">{account.institution}</span>
                  </td>
                  <td>{account.type}</td>
                  <td>
                    <StatusBadge status={account.status_flag} />
                  </td>
                  <td>{currencyFormatter.format(account.current_balance)}</td>
                  <td>
                    {currencyFormatter.format(
                      globalBufferOverride ?? account.min_day_end_balance_required,
                    )}
                  </td>
                  <td
                    className={
                      account.available_above_minimum < 0 ? "negative-value" : ""
                    }
                  >
                    {currencyFormatter.format(account.available_above_minimum)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="detail-panel">
          {selectedDraft ? (
            <>
              <div className="detail-header">
                <p className="eyebrow">Cash Form</p>
                <h3>{selectedDraft.account_name || "New cash account"}</h3>
              </div>
              <div className="form-grid">
                <label>
                  <span>Institution</span>
                  <InstitutionCombobox
                    invalid={Boolean(selectedErrors.institution)}
                    options={CASH_ACCOUNT_INSTITUTIONS}
                    placeholder="BofA, Chase, Capital One..."
                    value={selectedDraft.institution}
                    onChange={(value) =>
                      updateSelected((account) => ({
                        ...account,
                        institution: value,
                      }))
                    }
                  />
                  {selectedErrors.institution ? (
                    <small className="field-error">{selectedErrors.institution}</small>
                  ) : (
                    <small className="field-hint">
                      Search common banks with alias support like BofA, SoFi, or Schwab.
                    </small>
                  )}
                </label>
                <label>
                  <span>Account name</span>
                  <input
                    className={selectedErrors.account_name ? "field-invalid" : ""}
                    placeholder="Main Checking, Emergency Savings..."
                    value={selectedDraft.account_name}
                    onChange={(event) =>
                      updateSelected((account) => ({
                        ...account,
                        account_name: event.target.value,
                      }))
                    }
                  />
                  {selectedErrors.account_name ? (
                    <small className="field-error">{selectedErrors.account_name}</small>
                  ) : null}
                </label>
                <label>
                  <span>Type</span>
                  <select
                    value={selectedDraft.type}
                    onChange={(event) =>
                      updateSelected((account) => ({
                        ...account,
                        type: event.target.value,
                      }))
                    }
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                  </select>
                </label>
                <label>
                  <span>Current balance</span>
                  <input
                    className={selectedErrors.current_balance ? "field-invalid" : ""}
                    type="number"
                    value={selectedDraft.current_balance}
                    onChange={(event) =>
                      updateSelected((account) => ({
                        ...account,
                        current_balance: numberValue(event.target.value),
                      }))
                    }
                  />
                  {selectedErrors.current_balance ? (
                    <small className="field-error">{selectedErrors.current_balance}</small>
                  ) : (
                    <small className="field-hint">
                      This balance feeds safe cash and account status immediately.
                    </small>
                  )}
                </label>
                <label>
                  <span>Minimum required balance</span>
                  <input
                    className={
                      selectedErrors.min_day_end_balance_required
                        ? "field-invalid"
                        : ""
                    }
                    type="number"
                    value={selectedDraft.min_day_end_balance_required}
                    onChange={(event) =>
                      updateSelected((account) => ({
                        ...account,
                        min_day_end_balance_required: numberValue(
                          event.target.value,
                        ),
                      }))
                    }
                    onKeyDown={handleEnterSave}
                  />
                  {selectedErrors.min_day_end_balance_required ? (
                    <small className="field-error">
                      {selectedErrors.min_day_end_balance_required}
                    </small>
                  ) : (
                    <small className="field-hint">
                      Use the real day-end floor you do not want to breach. Press Enter to save.
                    </small>
                  )}
                </label>
              </div>
              <div className="form-actions">
                <span className="form-status-note">
                  Changes stay in the draft until you click Save Accounts.
                </span>
                <button
                  className="primary-button save-button"
                  disabled={!dirty || validation.hasErrors}
                  onClick={onSave}
                  type="button"
                >
                  Save Accounts
                </button>
                <button className="secondary-button" onClick={removeSelected} type="button">
                  Remove Account
                </button>
              </div>
            </>
          ) : (
            <p className="empty-copy">Add a cash account to start tracking buffers.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
