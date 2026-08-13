"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { validateCreditAccounts } from "@/lib/form-validation";
import { InstitutionCombobox } from "@/components/institution-combobox";
import { StatusBadge } from "@/components/status-badge";
import { currencyFormatter, formatPercentFromValue, formatShortDate } from "@/lib/format";
import { CREDIT_CARD_INSTITUTIONS } from "@/lib/institution-options";
import type { CreditCardAccount, CreditCardInput } from "@/lib/types";

const columnHelper = createColumnHelper<CreditCardAccount>();

function numberValue(value: string) {
  return value === "" ? 0 : Number(value);
}

function nullableNumberValue(value: string) {
  return value === "" ? null : Number(value);
}

function formatAutoPayment(value: CreditCardInput["auto_payment"]): string {
  if (value === null || value === "") {
    return "N/A";
  }

  return typeof value === "number" ? currencyFormatter.format(value) : value;
}

interface CreditCardsViewProps {
  accounts: CreditCardAccount[];
  draftAccounts: CreditCardInput[];
  onChange: (accounts: CreditCardInput[]) => void;
  onAdd: () => void;
}

export function CreditCardsView({
  accounts,
  draftAccounts,
  onChange,
  onAdd,
}: CreditCardsViewProps) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [institutionFilter, setInstitutionFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "priority_rank", desc: false },
  ]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(
    accounts[0]?.id ?? null,
  );
  const [reviewMetadata, setReviewMetadata] = useState<Record<string, { lastReviewedAt: string | null } | null>>({});

  useEffect(() => {
    if (!selectedCardId && accounts[0]) {
      setSelectedCardId(accounts[0].id);
    }
  }, [accounts, selectedCardId]);

  useEffect(() => {
    fetch("/api/operations/config").then((response) => response.json()).then((payload: { cards?: Array<{ id: string; review: { lastReviewedAt: string | null } | null }> }) => setReviewMetadata(Object.fromEntries((payload.cards ?? []).map((card) => [card.id, card.review])))).catch(() => undefined);
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      if (statusFilter !== "all" && account.status_flag !== statusFilter) {
        return false;
      }

      if (
        institutionFilter &&
        !`${account.institution} ${account.nickname}`
          .toLowerCase()
          .includes(institutionFilter.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [accounts, institutionFilter, statusFilter]);
  const validation = useMemo(
    () => validateCreditAccounts(draftAccounts),
    [draftAccounts],
  );

  const columns = [
    columnHelper.accessor("priority_rank", {
      header: "Rank",
      cell: (info) => `#${info.getValue()}`,
    }),
    columnHelper.accessor("nickname", {
      header: "Card",
      cell: (info) => (
        <div>
          <strong>{info.getValue()}</strong>
          <span className="cell-subtitle">{info.row.original.institution}</span>
        </div>
      ),
    }),
    columnHelper.accessor("status_flag", {
      header: "Status",
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor("current_balance", {
      header: "Balance",
      cell: (info) => currencyFormatter.format(info.getValue()),
    }),
    columnHelper.accessor("apr_percent", {
      header: "APR",
      cell: (info) => formatPercentFromValue(info.getValue()),
    }),
    columnHelper.accessor("payment_due", {
      header: "Due",
      cell: (info) => formatShortDate(info.getValue()),
    }),
    columnHelper.display({
      id: "review",
      header: "Review",
      cell: (info) => {
        const reviewed = reviewMetadata[info.row.original.id]?.lastReviewedAt;
        const thisMonth = reviewed?.slice(0, 7) === new Date().toISOString().slice(0, 7);
        return <span className={`review-chip ${thisMonth ? "complete" : "due"}`}>{thisMonth ? "Reviewed this month" : reviewed ? `Last ${new Date(reviewed).toLocaleDateString()}` : "Needs review"}</span>;
      },
    }),
  ];

  const table = useReactTable({
    data: filteredAccounts,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedDraft =
    draftAccounts.find((account) => account.id === selectedCardId) ??
    draftAccounts[0] ??
    null;
  const selectedComputed =
    accounts.find((account) => account.id === selectedCardId) ?? null;
  const selectedErrors = selectedDraft
    ? validation.errorsById[selectedDraft.id] ?? {}
    : {};

  function updateSelected(
    updater: (account: CreditCardInput) => CreditCardInput,
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

  function removeSelected() {
    if (!selectedDraft) {
      return;
    }
    if (!window.confirm(`Remove ${selectedDraft.nickname || "this card"}?`)) {
      return;
    }

    const nextAccounts = draftAccounts.filter(
      (account) => account.id !== selectedDraft.id,
    );
    onChange(nextAccounts);
    setSelectedCardId(nextAccounts[0]?.id ?? null);
  }

  return (
    <section className="view-shell">
      <div className="filter-band">
        <div className="filter-copy">
          <p className="eyebrow">Credit Cards</p>
          <h2>Edit the cards that drive payoff priority.</h2>
        </div>
        <div className="toolbar-row">
          <div className="filter-grid compact">
            <input
              value={institutionFilter}
              onChange={(event) => setInstitutionFilter(event.target.value)}
              placeholder="Institution or nickname"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="danger">Danger</option>
              <option value="warning">Warning</option>
              <option value="watch">Watch</option>
              <option value="ok">OK</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div className="toolbar-actions">
            <button className="secondary-button" onClick={onAdd} type="button">
              Add Card
            </button>
            <span className="form-status-note">
              Valid changes autosave. Use Record Update above for history.
            </span>
          </div>
        </div>
        {validation.message ? (
          <p className="form-warning">{validation.message}</p>
        ) : (
          <p className="form-intro">
            Use exact balances and payment behavior so prioritization stays trustworthy.
          </p>
        )}
      </div>

      <div className="table-layout">
        <div className="table-panel">
          <table className="data-table">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} onClick={header.column.getToggleSortingHandler()}>
                      <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={row.original.id === selectedCardId ? "selected" : ""}
                  onClick={() => setSelectedCardId(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="detail-panel">
          {selectedDraft ? (
            <>
              <div className="detail-header">
                <p className="eyebrow">Card Form</p>
                <h3>{selectedDraft.nickname || "New credit card"}</h3>
                {selectedComputed ? (
                  <StatusBadge status={selectedComputed.status_flag} />
                ) : null}
              </div>
              <div className="form-grid">
                <label>
                  <span>Institution</span>
                  <InstitutionCombobox
                    invalid={Boolean(selectedErrors.institution)}
                    options={CREDIT_CARD_INSTITUTIONS}
                    placeholder="Chase, Citi, Amex..."
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
                      Search common issuers with alias support like BofA or Amex, or enter your own.
                    </small>
                  )}
                </label>
                <label>
                  <span>Nickname</span>
                  <input
                    className={selectedErrors.nickname ? "field-invalid" : ""}
                    placeholder="Freedom, Costco, Discover 1..."
                    value={selectedDraft.nickname}
                    onChange={(event) =>
                      updateSelected((account) => ({
                        ...account,
                        nickname: event.target.value,
                      }))
                    }
                  />
                  {selectedErrors.nickname ? (
                    <small className="field-error">{selectedErrors.nickname}</small>
                  ) : null}
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
                      Enter the current balance you want the dashboard to act on.
                    </small>
                  )}
                </label>
                <label>
                  <span>Credit limit</span>
                  <input
                    className={selectedErrors.credit_limit ? "field-invalid" : ""}
                    type="number"
                    value={selectedDraft.credit_limit ?? ""}
                    onChange={(event) =>
                      updateSelected((account) => ({
                        ...account,
                        credit_limit: nullableNumberValue(event.target.value),
                      }))
                    }
                  />
                  {selectedErrors.credit_limit ? (
                    <small className="field-error">{selectedErrors.credit_limit}</small>
                  ) : null}
                </label>
                <label>
                  <span>APR %</span>
                  <input
                    className={selectedErrors.apr_percent ? "field-invalid" : ""}
                    type="number"
                    value={selectedDraft.apr_percent}
                    onChange={(event) =>
                      updateSelected((account) => ({
                        ...account,
                        apr_percent: numberValue(event.target.value),
                      }))
                    }
                  />
                  {selectedErrors.apr_percent ? (
                    <small className="field-error">{selectedErrors.apr_percent}</small>
                  ) : (
                    <small className="field-hint">
                      Use the current purchase APR or effective interest rate.
                    </small>
                  )}
                </label>
                <label>
                  <span>Minimum payment</span>
                  <input
                    className={selectedErrors.min_payment ? "field-invalid" : ""}
                    type="number"
                    value={selectedDraft.min_payment}
                    onChange={(event) =>
                      updateSelected((account) => ({
                        ...account,
                        min_payment: numberValue(event.target.value),
                      }))
                    }
                  />
                  {selectedErrors.min_payment ? (
                    <small className="field-error">{selectedErrors.min_payment}</small>
                  ) : null}
                </label>
                <label>
                  <span>Interest/fees this month</span>
                  <input
                    className={
                      selectedErrors.interest_fees_this_month ? "field-invalid" : ""
                    }
                    type="number"
                    value={selectedDraft.interest_fees_this_month}
                    onChange={(event) =>
                      updateSelected((account) => ({
                        ...account,
                        interest_fees_this_month: numberValue(event.target.value),
                      }))
                    }
                  />
                  {selectedErrors.interest_fees_this_month ? (
                    <small className="field-error">
                      {selectedErrors.interest_fees_this_month}
                    </small>
                  ) : (
                    <small className="field-hint">
                      If this is above zero, the card is treated as actively charging interest.
                    </small>
                  )}
                </label>
                <label>
                  <span>Auto payment</span>
                  <input
                    className={selectedErrors.auto_payment ? "field-invalid" : ""}
                    value={selectedDraft.auto_payment ?? ""}
                    placeholder='Examples: "Statement Balance" or "Minimum Payment due"'
                    onChange={(event) =>
                      updateSelected((account) => ({
                        ...account,
                        auto_payment: event.target.value || null,
                      }))
                    }
                  />
                  {selectedErrors.auto_payment ? (
                    <small className="field-error">{selectedErrors.auto_payment}</small>
                  ) : null}
                  {selectedComputed ? (
                    <small className="field-hint">
                      Interpreted as {formatAutoPayment(selectedComputed.auto_payment)}
                    </small>
                  ) : null}
                </label>
                <label>
                  <span>Payment due</span>
                  <input
                    type="date"
                    value={selectedDraft.payment_due ?? ""}
                    onChange={(event) =>
                      updateSelected((account) => ({
                        ...account,
                        payment_due: event.target.value || null,
                      }))
                    }
                  />
                  <small className="field-hint">
                    Due dates help surface near-term attention without changing payoff math by themselves.
                  </small>
                </label>
                <label>
                  <span>Promo active</span>
                  <select
                    value={selectedDraft.promo_flag ? "yes" : "no"}
                    onChange={(event) =>
                      updateSelected((account) => ({
                        ...account,
                        promo_flag: event.target.value === "yes",
                      }))
                    }
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </label>
                <label>
                  <span>Promo end date</span>
                  <input
                    className={selectedErrors.promo_end_date ? "field-invalid" : ""}
                    type="date"
                    value={selectedDraft.promo_end_date ?? ""}
                    onChange={(event) =>
                      updateSelected((account) => ({
                        ...account,
                        promo_end_date: event.target.value || null,
                      }))
                    }
                  />
                  {selectedErrors.promo_end_date ? (
                    <small className="field-error">{selectedErrors.promo_end_date}</small>
                  ) : (
                    <small className="field-hint">
                      Required if promo is active so the app can time the urgency correctly.
                    </small>
                  )}
                </label>
                <label>
                  <span>Rewards available</span>
                  <input
                    value={selectedDraft.rewards_available ?? ""}
                    onChange={(event) =>
                      updateSelected((account) => ({
                        ...account,
                        rewards_available: event.target.value || null,
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Points available</span>
                  <input
                    type="number"
                    value={selectedDraft.points_available ?? ""}
                    onChange={(event) =>
                      updateSelected((account) => ({
                        ...account,
                        points_available: nullableNumberValue(event.target.value),
                      }))
                    }
                  />
                </label>
              </div>
              <label className="textarea-label">
                <span>Care plan</span>
                <textarea
                  value={selectedDraft.how_are_we_taking_care_of_it}
                  onChange={(event) =>
                    updateSelected((account) => ({
                      ...account,
                      how_are_we_taking_care_of_it: event.target.value,
                    }))
                  }
                />
                <small className="field-hint">Add any context that will help later.</small>
              </label>
              <div className="form-actions">
                <span className="form-status-note">
                  Valid changes autosave. Record an update when you want a history point.
                </span>
                <button className="secondary-button" onClick={removeSelected} type="button">
                  Remove Card
                </button>
              </div>
            </>
          ) : (
            <p className="empty-copy">Add a card to start building your portfolio.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
