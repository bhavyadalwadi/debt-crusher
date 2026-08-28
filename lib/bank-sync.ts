import "server-only";

import {
  CountryCode,
  CreditAccountSubtype,
  DepositoryAccountSubtype,
  Products,
  type AccountBase,
  type CreditCardLiability,
} from "plaid";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { OwnerContext } from "@/lib/security";
import { SecurityError, opaqueHash } from "@/lib/security";
import { decryptFinancialToken, encryptFinancialToken, type TokenEnvelope } from "@/lib/token-envelope";
import {
  getPlaidClient,
  plaidClientUserId,
  PLAID_INITIAL_PRODUCTS,
  PLAID_REQUIRED_IF_SUPPORTED_PRODUCTS,
} from "@/lib/plaid-client";

type MatchedTarget = { type: "cash" | "card"; id: string };
type FinancialOwnerContext = Pick<OwnerContext, "ownerId" | "portfolioId">;
type ProposedField = {
  field: string;
  value: number;
  providerUpdatedAt?: Date | null;
};

const CASH_FIELDS = new Set(["currentBalance"]);
const CARD_FIELDS = new Set([
  "currentBalance",
  "statementBalance",
  "minimumPaymentDue",
  "creditLimit",
  "purchaseApr",
  "paymentDueDay",
]);

function tokenEnvelope(connection: {
  tokenCiphertext: string | null;
  tokenIv: string | null;
  tokenTag: string | null;
  wrappedKey: string | null;
  wrappedKeyIv: string | null;
  wrappedKeyTag: string | null;
  tokenKeyVersion: string | null;
}): TokenEnvelope {
  if (!connection.tokenCiphertext || !connection.tokenIv || !connection.tokenTag || !connection.wrappedKey ||
      !connection.wrappedKeyIv || !connection.wrappedKeyTag || !connection.tokenKeyVersion) {
    throw new SecurityError(409, "CONNECTION_INACTIVE", "This bank connection is not active.");
  }
  return {
    tokenCiphertext: connection.tokenCiphertext,
    tokenIv: connection.tokenIv,
    tokenTag: connection.tokenTag,
    wrappedKey: connection.wrappedKey,
    wrappedKeyIv: connection.wrappedKeyIv,
    wrappedKeyTag: connection.wrappedKeyTag,
    tokenKeyVersion: connection.tokenKeyVersion,
  };
}

export async function createPlaidLinkSession(context: OwnerContext) {
  const expiresAt = new Date(Date.now() + 30 * 60_000);
  const session = await prisma.financialLinkSession.create({
    data: { portfolioId: context.portfolioId, expiresAt },
  });
  try {
    const response = await getPlaidClient().linkTokenCreate({
      client_name: "Debt Crusher",
      language: "en",
      country_codes: [CountryCode.Us],
      user: { client_user_id: plaidClientUserId(context.ownerId) },
      products: [...PLAID_INITIAL_PRODUCTS],
      required_if_supported_products: [...PLAID_REQUIRED_IF_SUPPORTED_PRODUCTS],
      webhook: process.env.PLAID_WEBHOOK_URL,
      account_filters: {
        depository: { account_subtypes: [DepositoryAccountSubtype.Checking, DepositoryAccountSubtype.Savings, DepositoryAccountSubtype.MoneyMarket] },
        credit: { account_subtypes: [CreditAccountSubtype.CreditCard] },
      },
    });
    return { sessionId: session.id, linkToken: response.data.link_token, expiresAt: response.data.expiration };
  } catch (error) {
    await prisma.financialLinkSession.delete({ where: { id: session.id } }).catch(() => undefined);
    throw error;
  }
}

export async function exchangePlaidPublicToken(args: {
  context: OwnerContext;
  sessionId: string;
  publicToken: string;
  institution?: { id?: string | null; name?: string | null };
}) {
  const tokenHash = createHash("sha256").update(args.publicToken).digest("hex");
  const consumed = await prisma.financialLinkSession.updateMany({
    where: {
      id: args.sessionId,
      portfolioId: args.context.portfolioId,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { consumedAt: new Date(), tokenHash },
  });
  if (consumed.count !== 1) {
    throw new SecurityError(409, "LINK_SESSION_INVALID", "This bank-link session is expired or already used.");
  }

  const client = getPlaidClient();
  const exchanged = await client.itemPublicTokenExchange({ public_token: args.publicToken });
  const accessToken = exchanged.data.access_token;
  let tokenPersisted = false;
  try {
    const item = await client.itemGet({ access_token: accessToken });
    const itemId = exchanged.data.item_id;
    const existing = await prisma.financialConnection.findUnique({ where: { providerItemId: itemId } });
    if (existing && existing.portfolioId !== args.context.portfolioId) {
      await client.itemRemove({ access_token: accessToken });
      throw new SecurityError(403, "CONNECTION_OWNERSHIP", "Connection ownership mismatch.");
    }
    const institutionId = item.data.item.institution_id;
    const institution = args.institution;
    const providedInstitutionName = institution?.name?.trim();
    const institutionName = institution?.id === institutionId && providedInstitutionName
      ? providedInstitutionName.slice(0, 120)
      : "Connected institution";
    const envelope = encryptFinancialToken(accessToken);
    const products = (item.data.item.products ?? []).filter((product) =>
      product === Products.Transactions || product === Products.Liabilities,
    );
    const connection = existing
      ? await prisma.financialConnection.update({
          where: { id: existing.id },
          data: {
            institutionId,
            institutionName,
            consentedProducts: JSON.stringify(products),
            status: "CONNECTING",
            disconnectedAt: null,
            errorCode: null,
            ...envelope,
          },
        })
      : await prisma.financialConnection.create({
          data: {
            portfolioId: args.context.portfolioId,
            providerItemId: itemId,
            institutionId,
            institutionName,
            consentedProducts: JSON.stringify(products),
            ...envelope,
          },
        });
    tokenPersisted = true;
    await runFinancialSync({ context: args.context, connectionId: connection.id, reason: "INITIAL" });
    return connection.id;
  } catch (error) {
    if (!tokenPersisted) await client.itemRemove({ access_token: accessToken }).catch(() => undefined);
    throw error;
  } finally {
    Buffer.from(accessToken).fill(0);
  }
}

function liabilityMap(liabilities: CreditCardLiability[]) {
  return new Map(liabilities.flatMap((liability) => liability.account_id ? [[liability.account_id, liability]] : []));
}

export function normalizePlaidProposals(account: AccountBase, liability?: CreditCardLiability): ProposedField[] {
  const proposals: ProposedField[] = [];
  if (account.balances.current != null) proposals.push({ field: "currentBalance", value: account.balances.current });
  if (account.type === "credit") {
    if (account.balances.limit != null) proposals.push({ field: "creditLimit", value: account.balances.limit });
    if (liability?.last_statement_balance != null) proposals.push({ field: "statementBalance", value: liability.last_statement_balance });
    if (liability?.minimum_payment_amount != null) proposals.push({ field: "minimumPaymentDue", value: liability.minimum_payment_amount });
    const purchaseApr = liability?.aprs.find((apr) => apr.apr_type === "purchase_apr") ?? liability?.aprs[0];
    if (purchaseApr?.apr_percentage != null) proposals.push({ field: "purchaseApr", value: purchaseApr.apr_percentage });
    if (liability?.next_payment_due_date) {
      const date = new Date(`${liability.next_payment_due_date}T00:00:00Z`);
      if (!Number.isNaN(date.getTime())) proposals.push({ field: "paymentDueDay", value: date.getUTCDate(), providerUpdatedAt: date });
    }
  }
  return proposals;
}

async function trustedValue(target: MatchedTarget, field: string, portfolioId: string) {
  if (target.type === "cash") {
    const row = await prisma.cashAccount.findFirst({ where: { id: target.id, portfolioId } });
    if (!row || !CASH_FIELDS.has(field)) throw new SecurityError(409, "MATCH_INVALID", "Matched cash account is unavailable.");
    return row.currentBalance;
  }
  const row = await prisma.creditCard.findFirst({ where: { id: target.id, portfolioId } });
  if (!row || !CARD_FIELDS.has(field)) throw new SecurityError(409, "MATCH_INVALID", "Matched card is unavailable.");
  const value = row[field as keyof typeof row];
  return value == null ? null : typeof value === "object" && "toNumber" in value ? value.toNumber() : value;
}

async function stageAccount(args: {
  context: FinancialOwnerContext;
  jobId: string;
  financialAccountId: string;
  target: MatchedTarget;
  proposals: ProposedField[];
  dataAsOf: Date;
}) {
  for (const proposal of args.proposals) {
    const trusted = await trustedValue(args.target, proposal.field, args.context.portfolioId);
    if (JSON.stringify(trusted) === JSON.stringify(proposal.value)) continue;
    await prisma.$transaction(async (tx) => {
      await tx.stagedChange.updateMany({
        where: {
          targetEntityType: args.target.type,
          targetEntityId: args.target.id,
          field: proposal.field,
          status: "PENDING",
          financialAccount: { connection: { portfolioId: args.context.portfolioId } },
        },
        data: { status: "SUPERSEDED", decidedAt: new Date() },
      });
      await tx.stagedChange.create({
        data: {
          syncJobId: args.jobId,
          financialAccountId: args.financialAccountId,
          targetEntityType: args.target.type,
          targetEntityId: args.target.id,
          field: proposal.field,
          trustedValueJson: JSON.stringify(trusted),
          proposedValueJson: JSON.stringify(proposal.value),
          providerUpdatedAt: proposal.providerUpdatedAt,
          dataAsOf: args.dataAsOf,
        },
      });
    });
  }
}

function plaidFailureCode(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { error_code?: unknown } } }).response;
    if (typeof response?.data?.error_code === "string") return response.data.error_code.slice(0, 80);
  }
  return "PLAID_SYNC_FAILED";
}

export async function runFinancialSync(args: {
  context: FinancialOwnerContext;
  connectionId: string;
  reason: "INITIAL" | "MANUAL" | "WEBHOOK";
  idempotencyKey?: string;
  jobId?: string;
}) {
  const connection = await prisma.financialConnection.findFirst({
    where: { id: args.connectionId, portfolioId: args.context.portfolioId, disconnectedAt: null },
  });
  if (!connection) throw new SecurityError(409, "CONNECTION_NOT_FOUND", "Active connection not found.");
  const idempotencyKey = args.idempotencyKey ?? `${args.reason.toLowerCase()}:${connection.id}:${randomUUID()}`;
  const job = args.jobId
    ? await prisma.syncJob.findFirstOrThrow({ where: { id: args.jobId, connectionId: connection.id } })
    : await prisma.syncJob.upsert({
        where: { idempotencyKey },
        create: { connectionId: connection.id, reason: args.reason, idempotencyKey },
        update: {},
      });
  const startedAt = new Date();
  const claimedJob = await prisma.syncJob.updateMany({
    where: { id: job.id, connectionId: connection.id, status: "PENDING" },
    data: { status: "RUNNING", startedAt, errorCode: null },
  });
  if (claimedJob.count !== 1) return job;
  const claimedConnection = await prisma.financialConnection.updateMany({
    where: {
      id: connection.id,
      portfolioId: args.context.portfolioId,
      disconnectedAt: null,
      OR: [
        { status: { not: "SYNCING" } },
        { lastAttemptedSync: { lt: new Date(startedAt.getTime() - 10 * 60_000) } },
      ],
    },
    data: { status: "SYNCING", lastAttemptedSync: startedAt, errorCode: null },
  });
  if (claimedConnection.count !== 1) {
    await prisma.syncJob.update({ where: { id: job.id }, data: { status: "CANCELLED", completedAt: new Date() } });
    return job;
  }
  const accessToken = decryptFinancialToken(tokenEnvelope(connection));
  try {
    const client = getPlaidClient();
    const [balanceResult, itemResult] = await Promise.all([
      client.accountsBalanceGet({ access_token: accessToken }),
      client.itemGet({ access_token: accessToken }),
    ]);
    const products = itemResult.data.item.products ?? [];
    const liabilities = products.includes(Products.Liabilities)
      ? (await client.liabilitiesGet({ access_token: accessToken })).data.liabilities.credit ?? []
      : [];
    const byAccount = liabilityMap(liabilities);
    const dataAsOf = new Date();

    for (const account of balanceResult.data.accounts) {
      const financialAccount = await prisma.financialAccount.upsert({
        where: { connectionId_providerAccountId: { connectionId: connection.id, providerAccountId: account.account_id } },
        create: {
          connectionId: connection.id,
          providerAccountId: account.account_id,
          name: account.name.slice(0, 120),
          officialName: account.official_name?.slice(0, 160),
          mask: account.mask?.slice(-4),
          category: account.type,
          subcategory: account.subtype,
        },
        update: {
          name: account.name.slice(0, 120),
          officialName: account.official_name?.slice(0, 160),
          mask: account.mask?.slice(-4),
          category: account.type,
          subcategory: account.subtype,
        },
      });
      const target = financialAccount.cashAccountId
        ? { type: "cash" as const, id: financialAccount.cashAccountId }
        : financialAccount.creditCardId
          ? { type: "card" as const, id: financialAccount.creditCardId }
          : null;
      if (target) {
        await stageAccount({
          context: args.context,
          jobId: job.id,
          financialAccountId: financialAccount.id,
          target,
          proposals: normalizePlaidProposals(account, byAccount.get(account.account_id)),
          dataAsOf,
        });
      }
    }
    await prisma.$transaction([
      prisma.syncJob.update({ where: { id: job.id }, data: { status: "SUCCEEDED", completedAt: new Date() } }),
      prisma.financialConnection.update({
        where: { id: connection.id },
        data: { status: "CURRENT", lastSuccessfulSync: new Date(), dataAsOf, errorCode: null },
      }),
    ]);
    return job;
  } catch (error) {
    const code = plaidFailureCode(error);
    await prisma.$transaction([
      prisma.syncJob.update({ where: { id: job.id }, data: { status: "FAILED", completedAt: new Date(), errorCode: code } }),
      prisma.financialConnection.update({
        where: { id: connection.id },
        data: { status: code === "ITEM_LOGIN_REQUIRED" ? "REAUTH_REQUIRED" : "ERROR", errorCode: code },
      }),
    ]);
    throw new SecurityError(409, "SYNC_FAILED", "The bank sync failed safely.");
  } finally {
    Buffer.from(accessToken).fill(0);
  }
}

export async function matchFinancialAccount(args: {
  context: OwnerContext;
  financialAccountId: string;
  target: MatchedTarget;
}) {
  const account = await prisma.financialAccount.findFirst({
    where: { id: args.financialAccountId, connection: { portfolioId: args.context.portfolioId, disconnectedAt: null } },
  });
  if (!account) throw new SecurityError(409, "ACCOUNT_NOT_FOUND", "Connected account not found.");
  if (args.target.type === "cash") {
    if (account.category !== "depository") throw new SecurityError(409, "TYPE_MISMATCH", "Account types do not match.");
    const target = await prisma.cashAccount.findFirst({ where: { id: args.target.id, portfolioId: args.context.portfolioId } });
    if (!target) throw new SecurityError(409, "TARGET_NOT_FOUND", "Cash account not found.");
  } else {
    if (account.category !== "credit") throw new SecurityError(409, "TYPE_MISMATCH", "Account types do not match.");
    const target = await prisma.creditCard.findFirst({ where: { id: args.target.id, portfolioId: args.context.portfolioId } });
    if (!target) throw new SecurityError(409, "TARGET_NOT_FOUND", "Credit card not found.");
  }
  return prisma.financialAccount.update({
    where: { id: account.id },
    data: {
      matchStatus: "MATCHED",
      cashAccountId: args.target.type === "cash" ? args.target.id : null,
      creditCardId: args.target.type === "card" ? args.target.id : null,
    },
  });
}

export async function decideStagedChange(args: {
  context: OwnerContext;
  changeId: string;
  version: number;
  decision: "accept" | "ignore";
}) {
  const change = await prisma.stagedChange.findFirst({
    where: {
      id: args.changeId,
      version: args.version,
      status: "PENDING",
      financialAccount: { connection: { portfolioId: args.context.portfolioId, disconnectedAt: null } },
    },
  });
  if (!change) throw new SecurityError(409, "CHANGE_STALE", "This proposed change is no longer current.");
  if (args.decision === "ignore") {
    await prisma.stagedChange.update({ where: { id: change.id }, data: { status: "IGNORED", decidedAt: new Date() } });
    return;
  }
  const type = change.targetEntityType as "cash" | "card";
  const trusted = await trustedValue({ type, id: change.targetEntityId }, change.field, args.context.portfolioId);
  if (JSON.stringify(trusted) !== change.trustedValueJson) {
    throw new SecurityError(409, "TRUSTED_VALUE_CHANGED", "The manual value changed; sync again before accepting.");
  }
  const proposed = change.proposedValueJson == null ? null : JSON.parse(change.proposedValueJson);
  await prisma.$transaction(async (tx) => {
    if (type === "cash") {
      const updated = await tx.cashAccount.updateMany({
        where: { id: change.targetEntityId, portfolioId: args.context.portfolioId },
        data: { currentBalance: Number(proposed), balanceAsOf: change.dataAsOf, balanceSource: "plaid_accepted" },
      });
      if (updated.count !== 1) throw new SecurityError(409, "TARGET_NOT_FOUND", "Cash account not found.");
    } else {
      if (!CARD_FIELDS.has(change.field)) throw new SecurityError(409, "FIELD_NOT_ALLOWED", "Field cannot be synchronized.");
      const data: Record<string, number | Date | string> = {
        [change.field]: Number(proposed),
        balanceAsOf: change.dataAsOf,
        balanceSource: "plaid_accepted",
      };
      const updated = await tx.creditCard.updateMany({
        where: { id: change.targetEntityId, portfolioId: args.context.portfolioId },
        data,
      });
      if (updated.count !== 1) throw new SecurityError(409, "TARGET_NOT_FOUND", "Credit card not found.");
      const legacy: Record<string, number> = {};
      if (change.field === "currentBalance") legacy.currentBalance = Number(proposed);
      if (change.field === "creditLimit") legacy.creditLimit = Number(proposed);
      if (change.field === "minimumPaymentDue") legacy.minPayment = Number(proposed);
      if (change.field === "purchaseApr") legacy.aprPercent = Number(proposed);
      if (Object.keys(legacy).length) {
        await tx.creditAccount.updateMany({
          where: { id: change.targetEntityId, portfolioId: args.context.portfolioId },
          data: legacy,
        });
      }
      if (change.field === "paymentDueDay") {
        const dueDate = change.providerUpdatedAt ?? new Date(Date.UTC(
          change.dataAsOf.getUTCFullYear(),
          change.dataAsOf.getUTCMonth(),
          Number(proposed),
        ));
        await tx.creditAccount.updateMany({
          where: { id: change.targetEntityId, portfolioId: args.context.portfolioId },
          data: { paymentDue: dueDate },
        });
      }
    }
    await tx.stagedChange.update({ where: { id: change.id }, data: { status: "ACCEPTED", decidedAt: new Date() } });
    await tx.auditLog.create({
      data: {
        portfolioId: args.context.portfolioId,
        entityType: type === "cash" ? "cash_account" : "credit_card",
        entityId: change.targetEntityId,
        action: "PLAID_FIELD_ACCEPTED",
        beforeJson: JSON.stringify({ field: change.field, value: trusted }),
        afterJson: JSON.stringify({
          field: change.field,
          value: proposed,
          dataAsOf: change.dataAsOf.toISOString(),
          providerUpdatedAt: change.providerUpdatedAt?.toISOString() ?? null,
        }),
        source: "plaid_accepted",
      },
    });
  });
}

export async function disconnectFinancialConnection(context: OwnerContext, connectionId: string) {
  const connection = await prisma.financialConnection.findFirst({
    where: { id: connectionId, portfolioId: context.portfolioId, disconnectedAt: null },
  });
  if (!connection) throw new SecurityError(409, "CONNECTION_NOT_FOUND", "Active connection not found.");
  const accessToken = decryptFinancialToken(tokenEnvelope(connection));
  try {
    await getPlaidClient().itemRemove({ access_token: accessToken });
  } finally {
    Buffer.from(accessToken).fill(0);
  }
  await prisma.$transaction(async (tx) => {
    await tx.stagedChange.deleteMany({
      where: { status: { in: ["PENDING", "IGNORED", "SUPERSEDED"] }, financialAccount: { connectionId } },
    });
    await tx.syncJob.updateMany({ where: { connectionId, status: { in: ["PENDING", "RUNNING"] } }, data: { status: "CANCELLED", completedAt: new Date() } });
    await tx.financialConnection.update({
      where: { id: connectionId },
      data: {
        status: "DISCONNECTED",
        disconnectedAt: new Date(),
        tokenCiphertext: null,
        tokenIv: null,
        tokenTag: null,
        wrappedKey: null,
        wrappedKeyIv: null,
        wrappedKeyTag: null,
        tokenKeyVersion: null,
      },
    });
  });
}

export async function deleteDisconnectedConnectionData(context: OwnerContext, connectionId: string) {
  const deleted = await prisma.financialConnection.deleteMany({
    where: { id: connectionId, portfolioId: context.portfolioId, disconnectedAt: { not: null } },
  });
  if (deleted.count !== 1) throw new SecurityError(409, "DISCONNECT_REQUIRED", "Disconnect before deleting provider data.");
}

export function providerItemHash(itemId: string) {
  return opaqueHash(`plaid-item:${itemId}`);
}

export async function loadBankConnectionDto(context: OwnerContext) {
  const cutoff = new Date(Date.now() - 48 * 60 * 60_000);
  const [connections, cashAccounts, creditCards] = await Promise.all([
    prisma.financialConnection.findMany({
      where: { portfolioId: context.portfolioId },
      orderBy: { createdAt: "desc" },
      include: {
        accounts: {
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            officialName: true,
            mask: true,
            category: true,
            subcategory: true,
            matchStatus: true,
            cashAccountId: true,
            creditCardId: true,
          },
        },
      },
    }),
    prisma.cashAccount.findMany({
      where: { portfolioId: context.portfolioId, active: true },
      orderBy: { position: "asc" },
      select: { id: true, institution: true, accountName: true, nickname: true, lastFour: true },
    }),
    prisma.creditCard.findMany({
      where: { portfolioId: context.portfolioId, status: { not: "CLOSED" } },
      orderBy: { position: "asc" },
      select: { id: true, issuerName: true, nickname: true, lastFour: true },
    }),
  ]);
  return {
    connections: connections.map((connection) => ({
      id: connection.id,
      institutionName: connection.institutionName,
      status: connection.status === "CURRENT" && (!connection.lastSuccessfulSync || connection.lastSuccessfulSync < cutoff)
        ? "STALE"
        : connection.status,
      lastAttemptedSync: connection.lastAttemptedSync?.toISOString() ?? null,
      lastSuccessfulSync: connection.lastSuccessfulSync?.toISOString() ?? null,
      dataAsOf: connection.dataAsOf?.toISOString() ?? null,
      errorCode: connection.errorCode,
      disconnectedAt: connection.disconnectedAt?.toISOString() ?? null,
      accounts: connection.accounts.map((account) => ({
        ...account,
        target: account.cashAccountId
          ? { type: "cash" as const, id: account.cashAccountId }
          : account.creditCardId
            ? { type: "card" as const, id: account.creditCardId }
            : null,
        cashAccountId: undefined,
        creditCardId: undefined,
      })),
    })),
    targets: {
      cash: cashAccounts.map((account) => ({
        id: account.id,
        label: `${account.institution} · ${account.nickname || account.accountName}${account.lastFour ? ` •${account.lastFour}` : ""}`,
      })),
      cards: creditCards.map((card) => ({
        id: card.id,
        label: `${card.issuerName} · ${card.nickname}${card.lastFour ? ` •${card.lastFour}` : ""}`,
      })),
    },
  };
}

export async function loadStagedChangeDto(context: OwnerContext) {
  await prisma.stagedChange.deleteMany({
    where: {
      status: { in: ["IGNORED", "SUPERSEDED"] },
      decidedAt: { lt: new Date(Date.now() - 30 * 86_400_000) },
      financialAccount: { connection: { portfolioId: context.portfolioId } },
    },
  });
  const changes = await prisma.stagedChange.findMany({
    where: { status: "PENDING", financialAccount: { connection: { portfolioId: context.portfolioId, disconnectedAt: null } } },
    orderBy: { createdAt: "desc" },
    include: {
      financialAccount: { select: { name: true, mask: true, connection: { select: { institutionName: true } } } },
    },
  });
  return {
    changes: changes.map((change) => ({
      id: change.id,
      version: change.version,
      accountName: change.financialAccount.name,
      accountMask: change.financialAccount.mask,
      institutionName: change.financialAccount.connection.institutionName,
      targetType: change.targetEntityType,
      field: change.field,
      trustedValue: change.trustedValueJson == null ? null : JSON.parse(change.trustedValueJson),
      proposedValue: change.proposedValueJson == null ? null : JSON.parse(change.proposedValueJson),
      dataAsOf: change.dataAsOf.toISOString(),
    })),
  };
}
