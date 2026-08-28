"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useReverification } from "@clerk/nextjs";
import { usePlaidLink, type PlaidLinkOnSuccessMetadata } from "react-plaid-link";

type Target = { id: string; label: string };
type MatchTarget = Target & { type: "cash" | "card" };
type ConnectedAccount = {
  id: string;
  name: string;
  officialName: string | null;
  mask: string | null;
  category: string;
  subcategory: string | null;
  matchStatus: "UNMATCHED" | "MATCHED";
  target: { type: "cash" | "card"; id: string } | null;
};
type Connection = {
  id: string;
  institutionName: string;
  status: string;
  lastAttemptedSync: string | null;
  lastSuccessfulSync: string | null;
  dataAsOf: string | null;
  errorCode: string | null;
  disconnectedAt: string | null;
  accounts: ConnectedAccount[];
};
type Change = {
  id: string;
  version: number;
  accountName: string;
  accountMask: string | null;
  institutionName: string;
  targetType: "cash" | "card";
  field: string;
  trustedValue: unknown;
  proposedValue: unknown;
  dataAsOf: string;
};

function formatValue(field: string, value: unknown) {
  if (value == null) return "Unknown";
  if (field === "paymentDueDay") return `Day ${value}`;
  if (field === "purchaseApr") return `${Number(value).toFixed(2)}%`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

function rankMatchTargets(account: ConnectedAccount, institutionName: string, candidates: MatchTarget[]) {
  const institution = institutionName.toLowerCase();
  return candidates
    .map((target) => {
      const label = target.label.toLowerCase();
      const score = (label.includes(institution) ? 2 : 0) + (account.mask && label.includes(account.mask) ? 3 : 0);
      return { target, score, suggested: score >= 2 };
    })
    .sort((left, right) => right.score - left.score || left.target.label.localeCompare(right.target.label));
}

async function checked(response: Response) {
  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload;
}

function checkedReverified<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error) throw new Error(error);
  }
  return payload as T;
}

export function BankSyncPanel() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [targets, setTargets] = useState<{ cash: Target[]; cards: Target[] }>({ cash: [], cards: [] });
  const [changes, setChanges] = useState<Change[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linkSessionId, setLinkSessionId] = useState<string | null>(null);
  const [openWhenReady, setOpenWhenReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [connectionsResponse, changesResponse] = await Promise.all([
      fetch("/api/bank-connections", { cache: "no-store" }),
      fetch("/api/bank-sync/changes", { cache: "no-store" }),
    ]);
    const connectionPayload = await checked(connectionsResponse) as unknown as { connections: Connection[]; targets: { cash: Target[]; cards: Target[] } };
    const changePayload = await checked(changesResponse) as unknown as { changes: Change[] };
    setConnections(connectionPayload.connections);
    setTargets(connectionPayload.targets);
    setChanges(changePayload.changes);
  }, []);

  useEffect(() => { void load().catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load bank sync")); }, [load]);

  const exchangeRequest = useReverification((publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
    if (!linkSessionId) throw new Error("Bank-link session is missing.");
    return fetch("/api/plaid/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: linkSessionId,
        publicToken,
        institution: { id: metadata.institution?.institution_id ?? null, name: metadata.institution?.name ?? null },
      }),
    });
  });

  async function exchange(publicToken: string, metadata: PlaidLinkOnSuccessMetadata) {
    if (!linkSessionId) throw new Error("Bank-link session is missing.");
    setBusy("exchange");
    try {
      checkedReverified(await exchangeRequest(publicToken, metadata));
      setMessage("Institution connected. Match each account before reviewing values.");
      setLinkToken(null);
      setLinkSessionId(null);
      await load();
    } finally {
      setBusy(null);
    }
  }

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    token: linkToken || "",
    onSuccess: (token, metadata) => {
      if (!token) {
        setMessage("Plaid did not return a connection token.");
        return;
      }
      void exchange(token, metadata).catch((error) => setMessage(error instanceof Error ? error.message : "Connection failed"));
    },
    onExit: (error) => { if (error) setMessage("Plaid Link closed before the connection completed."); },
  });

  useEffect(() => {
    if (openWhenReady && plaidReady) {
      setOpenWhenReady(false);
      openPlaid();
    }
  }, [openPlaid, openWhenReady, plaidReady]);

  const linkTokenRequest = useReverification(() => fetch("/api/plaid/link-token", { method: "POST" }));

  async function connect() {
    setBusy("connect");
    try {
      const payload = checkedReverified<{ linkToken: string; sessionId: string }>(await linkTokenRequest());
      setLinkToken(payload.linkToken);
      setLinkSessionId(payload.sessionId);
      setOpenWhenReady(true);
    } finally {
      setBusy(null);
    }
  }

  const disconnectRequest = useReverification((connectionId: string) =>
    fetch(`/api/bank-connections/${connectionId}/disconnect`, { method: "POST" }),
  );

  async function disconnect(connectionId: string) {
    if (!window.confirm("Disconnect this institution? Unaccepted synced values will be deleted.")) return;
    setBusy(connectionId);
    try {
      checkedReverified(await disconnectRequest(connectionId));
      await load();
    } finally { setBusy(null); }
  }

  const deleteDataRequest = useReverification((connectionId: string) =>
    fetch(`/api/bank-connections/${connectionId}/data`, { method: "DELETE" }),
  );

  async function deleteData(connectionId: string) {
    if (!window.confirm("Permanently delete this disconnected bank connection and its remaining provider metadata? Accepted account history will remain.")) return;
    setBusy(connectionId);
    try {
      checkedReverified(await deleteDataRequest(connectionId));
      await load();
    } finally { setBusy(null); }
  }

  async function sync(connectionId: string) {
    setBusy(connectionId);
    try {
      await checked(await fetch(`/api/bank-connections/${connectionId}/sync`, { method: "POST" }));
      await load();
    } finally { setBusy(null); }
  }

  async function match(account: ConnectedAccount) {
    const selected = selections[account.id];
    if (!selected) return;
    const [type, id] = selected.split(":", 2) as ["cash" | "card", string];
    setBusy(account.id);
    try {
      await checked(await fetch(`/api/bank-accounts/${account.id}/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      }));
      await load();
    } finally { setBusy(null); }
  }

  async function decide(change: Change, decision: "accept" | "ignore") {
    setBusy(change.id);
    try {
      await checked(await fetch(`/api/bank-sync/changes/${change.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: change.version, decision }),
      }));
      await load();
    } finally { setBusy(null); }
  }

  const accountTargets = useMemo(() => ({
    cash: targets.cash.map((target) => ({ ...target, type: "cash" as const })),
    credit: targets.cards.map((target) => ({ ...target, type: "card" as const })),
  }), [targets]);

  return <section className="bank-sync-panel">
    <div className="control-strip">
      <div><p className="eyebrow">Read-only bank connection</p><h2>Bank Sync</h2><p className="subtle-copy">Manual values remain authoritative. Plaid can propose values, but only you can accept them.</p></div>
      <button className="primary-button" disabled={busy !== null} onClick={() => void connect().catch((error) => setMessage(error instanceof Error ? error.message : "Unable to connect"))} type="button">{busy === "connect" ? "Preparing…" : "Connect institution"}</button>
    </div>
    {message ? <p className="form-warning" role="status" aria-live="polite">{message}</p> : null}

    <div className="bank-sync-grid">
      {connections.length === 0 ? <div className="empty-state"><h3>No institutions connected</h3><p>Connections are sandbox-only and cannot move money.</p></div> : connections.map((connection) => <article className="bank-connection-card" key={connection.id}>
        <div className="bank-card-heading"><div><h3>{connection.institutionName}</h3><p className="subtle-copy">{connection.status.replaceAll("_", " ")} · Synced {connection.lastSuccessfulSync ? new Date(connection.lastSuccessfulSync).toLocaleString() : "never"}{connection.dataAsOf ? ` · Data as of ${new Date(connection.dataAsOf).toLocaleString()}` : ""}</p></div><div className="toolbar-actions">{connection.disconnectedAt ? <button type="button" className="ghost-button" disabled={busy !== null} onClick={() => void deleteData(connection.id).catch((error) => setMessage(error instanceof Error ? error.message : "Delete failed"))}>Delete bank data</button> : <><button type="button" className="secondary-button" disabled={busy !== null} onClick={() => void sync(connection.id).catch((error) => setMessage(error instanceof Error ? error.message : "Sync failed"))}>Sync</button><button type="button" className="ghost-button" disabled={busy !== null} onClick={() => void disconnect(connection.id).catch((error) => setMessage(error instanceof Error ? error.message : "Disconnect failed"))}>Disconnect</button></>}</div></div>
        {connection.accounts.map((account) => <div className="bank-account-match" key={account.id}><div><strong>{account.name}{account.mask ? ` •${account.mask}` : ""}</strong><span className="cell-subtitle">{account.subcategory || account.category}</span></div>{account.target ? <span className="status-badge ok">Matched</span> : <div className="match-controls"><select aria-label={`Match ${account.name}`} disabled={Boolean(connection.disconnectedAt)} value={selections[account.id] || ""} onChange={(event) => setSelections((current) => ({ ...current, [account.id]: event.target.value }))}><option value="">Choose existing account…</option>{rankMatchTargets(account, connection.institutionName, accountTargets[account.category === "credit" ? "credit" : "cash"]).map(({ target, suggested }) => <option key={target.id} value={`${target.type}:${target.id}`}>{suggested ? "Suggested · " : ""}{target.label}</option>)}</select><button type="button" className="secondary-button" disabled={Boolean(connection.disconnectedAt) || !selections[account.id] || busy !== null} onClick={() => void match(account).catch((error) => setMessage(error instanceof Error ? error.message : "Match failed"))}>Match</button></div>}</div>)}
      </article>)}
    </div>

    <section className="sync-changes"><p className="eyebrow">Review before accepting</p><h3>Proposed changes</h3>{changes.length === 0 ? <p className="subtle-copy">No pending changes. Match an account and sync to compare bank data with trusted values.</p> : changes.map((change) => <article className="sync-change-card" key={change.id}><div><strong>{change.accountName}{change.accountMask ? ` •${change.accountMask}` : ""}</strong><span className="cell-subtitle">{change.field} · data as of {new Date(change.dataAsOf).toLocaleString()}</span></div><div className="sync-value-comparison"><span>Current: {formatValue(change.field, change.trustedValue)}</span><span>Proposed: {formatValue(change.field, change.proposedValue)}</span></div><div className="toolbar-actions"><button type="button" className="primary-button" disabled={busy !== null} onClick={() => void decide(change, "accept").catch((error) => setMessage(error instanceof Error ? error.message : "Decision failed"))}>Accept</button><button type="button" className="secondary-button" disabled={busy !== null} onClick={() => void decide(change, "ignore").catch((error) => setMessage(error instanceof Error ? error.message : "Decision failed"))}>Ignore</button></div></article>)}</section>
  </section>;
}
