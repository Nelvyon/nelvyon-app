import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DbClient } from "../../../../../backend/db/DbClient";

import type {
  PartnerLedgerEventType,
  PartnerLedgerRow,
  PartnerLedgerTotals,
  PartnerOnboardingStatus,
  PartnerStripeAccountRow,
} from "@/lib/partners/partnerConnectTypes";

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
