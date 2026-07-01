import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DbClient } from "../../../../../backend/db/DbClient";

import type {
  PartnerLedgerEventType,
  PartnerLedgerRow,
  PartnerLedgerTotals,
  PartnerOnboardingStatus,
  PartnerStripeAccountRow,
  PartnerClientBillingRow,
} from "@/lib/partners/partnerConnectTypes";
import {
  createConnectPaymentIntent,
  createConnectSubscription,
  createPlatformCustomer,
  isStripeConnectConfigured,
} from "@/lib/partners/partnerStripeConnect";

let schemaReady = false;

function db() {
  return DbClient.getInstance();
}

function mapAccount(row: Record<string, unknown>): PartnerStripeAccountRow {
  return {
    partner_workspace_id: Number(row.partner_workspace_id),
    partner_user_id: String(row.partner_user_id),
    stripe_account_id: String(row.stripe_account_id),
    onboarding_status: String(row.onboarding_status) as PartnerOnboardingStatus,
    charges_enabled: Boolean(row.charges_enabled),
    payouts_enabled: Boolean(row.payouts_enabled),
    details_submitted: Boolean(row.details_submitted),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapLedger(row: Record<string, unknown>): PartnerLedgerRow {
  return {
    id: String(row.id),
    partner_workspace_id: Number(row.partner_workspace_id),
    client_workspace_id: row.client_workspace_id != null ? Number(row.client_workspace_id) : null,
    event_type: String(row.event_type) as PartnerLedgerEventType,
    stripe_event_id: row.stripe_event_id != null ? String(row.stripe_event_id) : null,
    gross_eur: Number(row.gross_eur),
    wholesale_eur: Number(row.wholesale_eur),
    partner_margin_eur: Number(row.partner_margin_eur),
    currency: String(row.currency ?? "eur"),
    description: row.description != null ? String(row.description) : null,
    created_at: String(row.created_at),
  };
}

export async function ensurePartnerRebillingSchema(): Promise<void> {
  if (schemaReady) return;
  const sqlPath = join(process.cwd(), "../../backend/migrations/partner_rebilling.sql");
  let raw: string;
  try {
    raw = readFileSync(sqlPath, "utf8");
  } catch {
    raw = `
      CREATE TABLE IF NOT EXISTS partner_stripe_accounts (
        partner_workspace_id INTEGER PRIMARY KEY,
        partner_user_id TEXT NOT NULL,
        stripe_account_id TEXT NOT NULL UNIQUE,
        onboarding_status TEXT NOT NULL DEFAULT 'pending',
        charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        details_submitted BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS partner_rebilling_ledger (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_workspace_id INTEGER NOT NULL,
        client_workspace_id INTEGER,
        event_type TEXT NOT NULL,
        stripe_event_id TEXT UNIQUE,
        gross_eur NUMERIC(12, 2) NOT NULL DEFAULT 0,
        wholesale_eur NUMERIC(12, 2) NOT NULL DEFAULT 0,
        partner_margin_eur NUMERIC(12, 2) NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'eur',
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS partner_client_billing (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_workspace_id INT NOT NULL,
        client_workspace_id INT NOT NULL,
        retail_plan_id TEXT,
        retail_pack_id TEXT,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        monthly_retail_eur NUMERIC(10, 2) NOT NULL DEFAULT 0,
        monthly_wholesale_eur NUMERIC(10, 2) NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (partner_workspace_id, client_workspace_id)
      );
    `;
  }
  for (const stmt of raw.split(";").map((s) => s.trim()).filter(Boolean)) {
    try {
      await db().query(stmt);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.toLowerCase().includes("already exists")) {
        /* ignore extension/index races */
      }
    }
  }
  schemaReady = true;
}

export async function getPartnerStripeAccount(
  workspaceId: number,
): Promise<PartnerStripeAccountRow | null> {
  await ensurePartnerRebillingSchema();
  const rows = await db().query<Record<string, unknown>>(
    `SELECT * FROM partner_stripe_accounts WHERE partner_workspace_id = $1 LIMIT 1`,
    [workspaceId],
  );
  return rows[0] ? mapAccount(rows[0]) : null;
}

export async function getPartnerStripeAccountByStripeId(
  stripeAccountId: string,
): Promise<PartnerStripeAccountRow | null> {
  await ensurePartnerRebillingSchema();
  const rows = await db().query<Record<string, unknown>>(
    `SELECT * FROM partner_stripe_accounts WHERE stripe_account_id = $1 LIMIT 1`,
    [stripeAccountId],
  );
  return rows[0] ? mapAccount(rows[0]) : null;
}

export async function upsertPartnerStripeAccount(params: {
  partnerWorkspaceId: number;
  partnerUserId: string;
  stripeAccountId: string;
  onboardingStatus: PartnerOnboardingStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}): Promise<PartnerStripeAccountRow> {
  await ensurePartnerRebillingSchema();
  const rows = await db().query<Record<string, unknown>>(
    `INSERT INTO partner_stripe_accounts (
       partner_workspace_id, partner_user_id, stripe_account_id,
       onboarding_status, charges_enabled, payouts_enabled, details_submitted, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (partner_workspace_id) DO UPDATE SET
       stripe_account_id = EXCLUDED.stripe_account_id,
       onboarding_status = EXCLUDED.onboarding_status,
       charges_enabled = EXCLUDED.charges_enabled,
       payouts_enabled = EXCLUDED.payouts_enabled,
       details_submitted = EXCLUDED.details_submitted,
       updated_at = NOW()
     RETURNING *`,
    [
      params.partnerWorkspaceId,
      params.partnerUserId,
      params.stripeAccountId,
      params.onboardingStatus,
      params.chargesEnabled,
      params.payoutsEnabled,
      params.detailsSubmitted,
    ],
  );
  return mapAccount(rows[0]);
}

export async function insertLedgerEntry(params: {
  partnerWorkspaceId: number;
  clientWorkspaceId?: number | null;
  eventType: PartnerLedgerEventType;
  stripeEventId?: string | null;
  grossEur: number;
  wholesaleEur: number;
  partnerMarginEur: number;
  currency?: string;
  description?: string | null;
}): Promise<PartnerLedgerRow | null> {
  await ensurePartnerRebillingSchema();
  try {
    const rows = await db().query<Record<string, unknown>>(
      `INSERT INTO partner_rebilling_ledger (
         partner_workspace_id, client_workspace_id, event_type, stripe_event_id,
         gross_eur, wholesale_eur, partner_margin_eur, currency, description
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (stripe_event_id) DO NOTHING
       RETURNING *`,
      [
        params.partnerWorkspaceId,
        params.clientWorkspaceId ?? null,
        params.eventType,
        params.stripeEventId ?? null,
        params.grossEur,
        params.wholesaleEur,
        params.partnerMarginEur,
        params.currency ?? "eur",
        params.description ?? null,
      ],
    );
    return rows[0] ? mapLedger(rows[0]) : null;
  } catch {
    return null;
  }
}

export async function listLedgerEntries(
  workspaceId: number,
  limit = 50,
): Promise<PartnerLedgerRow[]> {
  await ensurePartnerRebillingSchema();
  const rows = await db().query<Record<string, unknown>>(
    `SELECT * FROM partner_rebilling_ledger
     WHERE partner_workspace_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [workspaceId, limit],
  );
  return rows.map(mapLedger);
}

export async function getLedgerTotals(workspaceId: number): Promise<PartnerLedgerTotals> {
  await ensurePartnerRebillingSchema();
  const rows = await db().query<{
    total_margin: string;
    margin_mtd: string;
    entry_count: string;
  }>(
    `SELECT
       COALESCE(SUM(partner_margin_eur), 0) AS total_margin,
       COALESCE(SUM(partner_margin_eur) FILTER (
         WHERE created_at >= date_trunc('month', NOW())
       ), 0) AS margin_mtd,
       COUNT(*)::text AS entry_count
     FROM partner_rebilling_ledger
     WHERE partner_workspace_id = $1`,
    [workspaceId],
  );
  const r = rows[0];
  return {
    total_margin_eur: Number(r?.total_margin ?? 0),
    margin_mtd_eur: Number(r?.margin_mtd ?? 0),
    entry_count: Number(r?.entry_count ?? 0),
  };
}

export async function seedDemoLedgerEntries(workspaceId: number): Promise<number> {
  await ensurePartnerRebillingSchema();
  const existing = await getLedgerTotals(workspaceId);
  if (existing.entry_count > 0) return 0;

  const demos = [
    {
      eventType: "connect_test" as const,
      stripeEventId: `demo_connect_${workspaceId}_1`,
      gross: 497,
      wholesale: 149,
      margin: 348,
      description: "Demo — Local Growth Pack (prueba P2a)",
    },
    {
      eventType: "connect_test" as const,
      stripeEventId: `demo_connect_${workspaceId}_2`,
      gross: 79,
      wholesale: 39,
      margin: 40,
      description: "Demo — Starter cliente (prueba P2a)",
    },
  ];

  let inserted = 0;
  for (const d of demos) {
    const row = await insertLedgerEntry({
      partnerWorkspaceId: workspaceId,
      eventType: d.eventType,
      stripeEventId: d.stripeEventId,
      grossEur: d.gross,
      wholesaleEur: d.wholesale,
      partnerMarginEur: d.margin,
      description: d.description,
    });
    if (row) inserted += 1;
  }
  return inserted;
}

const PLAN_PRICING: Record<string, { wholesale: number; retail: number }> = {
  starter: { wholesale: 29, retail: 79 },
  pro: { wholesale: 129, retail: 249 },
  agency: { wholesale: 197, retail: 497 },
};

function mapClientBilling(row: Record<string, unknown>): PartnerClientBillingRow {
  return {
    id: String(row.id),
    partner_workspace_id: Number(row.partner_workspace_id),
    client_workspace_id: Number(row.client_workspace_id),
    retail_plan_id: row.retail_plan_id != null ? String(row.retail_plan_id) : null,
    retail_pack_id: row.retail_pack_id != null ? String(row.retail_pack_id) : null,
    stripe_customer_id: row.stripe_customer_id != null ? String(row.stripe_customer_id) : null,
    stripe_subscription_id: row.stripe_subscription_id != null ? String(row.stripe_subscription_id) : null,
    monthly_retail_eur: Number(row.monthly_retail_eur ?? 0),
    monthly_wholesale_eur: Number(row.monthly_wholesale_eur ?? 0),
    status: String(row.status ?? "active"),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function upsertPartnerClientBilling(params: {
  partnerWorkspaceId: number;
  clientWorkspaceId: number;
  retailPlanId: string;
  retailEur?: number;
  clientEmail?: string;
}): Promise<PartnerClientBillingRow> {
  await ensurePartnerRebillingSchema();
  if (!isStripeConnectConfigured()) {
    throw new Error("STRIPE_SECRET_KEY required for partner client billing");
  }
  const planKey = params.retailPlanId.replace(/^plan_/, "");
  const pricing = PLAN_PRICING[planKey] ?? PLAN_PRICING.starter!;
  const retail = params.retailEur ?? pricing.retail;
  const wholesale = pricing.wholesale;

  let stripeCustomerId: string | null = null;
  let stripeSubscriptionId: string | null = null;
  let stripeEventId: string | null = null;

  const partner = await getPartnerStripeAccount(params.partnerWorkspaceId);
  if (!partner?.stripe_account_id || partner.onboarding_status !== "active") {
    throw new Error("Partner Stripe Connect must be active before billing clients");
  }
  const email = params.clientEmail?.trim() || `client-${params.clientWorkspaceId}@partner.nelvyon.local`;
  const customer = await createPlatformCustomer({
    email,
    name: `Client WS ${params.clientWorkspaceId}`,
    metadata: {
      partner_workspace_id: String(params.partnerWorkspaceId),
      client_workspace_id: String(params.clientWorkspaceId),
      retail_plan_id: params.retailPlanId,
    },
  });
  stripeCustomerId = customer.id;
  const sub = await createConnectSubscription({
    customerId: customer.id,
    connectedAccountId: partner.stripe_account_id,
    retailAmountCents: Math.round(retail * 100),
    wholesaleAmountCents: Math.round(wholesale * 100),
    currency: "eur",
    metadata: {
      partner_workspace_id: String(params.partnerWorkspaceId),
      client_workspace_id: String(params.clientWorkspaceId),
    },
  });
  stripeSubscriptionId = sub.id;
  stripeEventId = sub.id;

  const rows = await db().query<Record<string, unknown>>(
    `INSERT INTO partner_client_billing (
       partner_workspace_id, client_workspace_id, retail_plan_id,
       stripe_customer_id, stripe_subscription_id,
       monthly_retail_eur, monthly_wholesale_eur, status, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW())
     ON CONFLICT (partner_workspace_id, client_workspace_id) DO UPDATE SET
       retail_plan_id = EXCLUDED.retail_plan_id,
       stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, partner_client_billing.stripe_customer_id),
       stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, partner_client_billing.stripe_subscription_id),
       monthly_retail_eur = EXCLUDED.monthly_retail_eur,
       monthly_wholesale_eur = EXCLUDED.monthly_wholesale_eur,
       status = 'active',
       updated_at = NOW()
     RETURNING *`,
    [
      params.partnerWorkspaceId,
      params.clientWorkspaceId,
      params.retailPlanId,
      stripeCustomerId,
      stripeSubscriptionId,
      retail,
      wholesale,
    ],
  );
  const billing = mapClientBilling(rows[0]!);

  await insertLedgerEntry({
    partnerWorkspaceId: params.partnerWorkspaceId,
    clientWorkspaceId: params.clientWorkspaceId,
    eventType: "subscription_invoice",
    stripeEventId: stripeEventId ?? `sub_${params.partnerWorkspaceId}_${params.clientWorkspaceId}_${Date.now()}`,
    grossEur: retail,
    wholesaleEur: wholesale,
    partnerMarginEur: Math.max(0, retail - wholesale),
    description: `Plan ${params.retailPlanId} — Stripe subscription ${stripeSubscriptionId ?? "pending"}`,
  });

  return billing;
}

export async function getPartnerClientBilling(
  partnerWorkspaceId: number,
  clientWorkspaceId: number,
): Promise<PartnerClientBillingRow | null> {
  await ensurePartnerRebillingSchema();
  const rows = await db().query<Record<string, unknown>>(
    `SELECT * FROM partner_client_billing
     WHERE partner_workspace_id=$1 AND client_workspace_id=$2 LIMIT 1`,
    [partnerWorkspaceId, clientWorkspaceId],
  );
  return rows[0] ? mapClientBilling(rows[0]) : null;
}

export async function chargePartnerClientPack(params: {
  partnerWorkspaceId: number;
  clientWorkspaceId: number;
  packSku: string;
  retailEur: number;
  wholesaleEur: number;
  clientEmail?: string;
}): Promise<{ ok: boolean; ledgerId: string | null; paymentIntentId?: string; clientSecret?: string | null }> {
  await ensurePartnerRebillingSchema();

  let stripeEventId: string | null = null;
  let paymentIntentId: string | undefined;
  let clientSecret: string | null | undefined;

  if (!isStripeConnectConfigured()) {
    throw new Error("STRIPE_SECRET_KEY required for partner pack charges");
  }
  const partner = await getPartnerStripeAccount(params.partnerWorkspaceId);
  if (!partner?.stripe_account_id || partner.onboarding_status !== "active") {
    throw new Error("Partner Stripe Connect must be active before charging packs");
  }
  const existing = await getPartnerClientBilling(params.partnerWorkspaceId, params.clientWorkspaceId);
  let customerId = existing?.stripe_customer_id ?? null;
  if (!customerId) {
    const email = params.clientEmail?.trim() || `client-${params.clientWorkspaceId}@partner.nelvyon.local`;
    const customer = await createPlatformCustomer({
      email,
      metadata: {
        partner_workspace_id: String(params.partnerWorkspaceId),
        client_workspace_id: String(params.clientWorkspaceId),
      },
    });
    customerId = customer.id;
  }
  const pi = await createConnectPaymentIntent({
    amountCents: Math.round(params.retailEur * 100),
    currency: "eur",
    connectedAccountId: partner.stripe_account_id,
    applicationFeeCents: Math.round(params.wholesaleEur * 100),
    customerId: customerId ?? undefined,
    metadata: {
      pack_sku: params.packSku,
      partner_workspace_id: String(params.partnerWorkspaceId),
      client_workspace_id: String(params.clientWorkspaceId),
    },
  });
  paymentIntentId = pi.id;
  clientSecret = pi.client_secret;
  stripeEventId = pi.id;

  const row = await insertLedgerEntry({
    partnerWorkspaceId: params.partnerWorkspaceId,
    clientWorkspaceId: params.clientWorkspaceId,
    eventType: "pack_payment",
    stripeEventId: stripeEventId ?? `pack_${params.packSku}_${params.clientWorkspaceId}_${Date.now()}`,
    grossEur: params.retailEur,
    wholesaleEur: params.wholesaleEur,
    partnerMarginEur: Math.max(0, params.retailEur - params.wholesaleEur),
    description: `Pack ${params.packSku} — PI ${paymentIntentId ?? "offline"}`,
  });
  if (row) {
    await db().query(
      `UPDATE partner_client_billing SET retail_pack_id=$3, updated_at=NOW()
       WHERE partner_workspace_id=$1 AND client_workspace_id=$2`,
      [params.partnerWorkspaceId, params.clientWorkspaceId, params.packSku],
    ).catch(() => null);
  }
  return { ok: Boolean(row), ledgerId: row?.id ?? null, paymentIntentId, clientSecret };
}
