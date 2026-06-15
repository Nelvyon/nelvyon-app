import { getPackMeta } from "@/lib/packs/packRegistry";
import type { PackRunRecord } from "@/lib/packs/types";
import {
  AGENCY_PARTNER_SUBSCRIPTION,
  buildWholesaleCatalogPayload,
  packMarginEur,
} from "@/lib/partners/wholesaleCatalog";

export type PartnerClientRow = {
  client_workspace_id: number;
  client_name: string;
  admin_email?: string;
  status?: string;
  plan_id?: string;
  active_pack_id?: string | null;
  active_pack_status?: string | null;
};

export type PartnerPackRow = {
  id: string;
  pack_id: string;
  pack_label: string;
  workspace_id: number;
  client_name?: string;
  status: string;
  created_at: string;
  margin_eur: number;
};

export type PartnerCommissionRow = {
  source: "affiliate" | "pack_margin" | "client_slot";
  label: string;
  amount_eur: number;
  period: string;
};

export type PartnerHqSummary = {
  metrics: {
    total_clients: number;
    active_clients: number;
    active_packs: number;
    completed_packs: number;
    estimated_mrr_eur: number;
    pack_margin_mtd_eur: number;
    affiliate_earnings_eur: number;
    affiliate_pending_eur: number;
  };
  clients: PartnerClientRow[];
  packs: PartnerPackRow[];
  commissions: PartnerCommissionRow[];
  wholesale: ReturnType<typeof import("@/lib/partners/wholesaleCatalog").buildWholesaleCatalogPayload>;
};

function clientLabel(
  workspaceId: number,
  clients: PartnerClientRow[],
): string | undefined {
  return clients.find((c) => c.client_workspace_id === workspaceId)?.client_name;
}

function latestPackByWorkspace(
  runs: PackRunRecord[],
): Map<number, PackRunRecord> {
  const map = new Map<number, PackRunRecord>();
  for (const run of runs) {
    const existing = map.get(run.workspace_id);
    if (!existing || run.created_at > existing.created_at) {
      map.set(run.workspace_id, run);
    }
  }
  return map;
}

export function buildPartnerHqSummary(params: {
  clients: PartnerClientRow[];
  packRuns: PackRunRecord[];
  affiliateStats?: Record<string, unknown> | null;
}): PartnerHqSummary {
  const { clients, packRuns, affiliateStats } = params;
  const latestByWs = latestPackByWorkspace(packRuns);

  const enrichedClients = clients.map((c) => {
    const latest = latestByWs.get(c.client_workspace_id);
    return {
      ...c,
      active_pack_id: latest?.pack_id ?? null,
      active_pack_status: latest?.status ?? null,
    };
  });

  const activePacks = packRuns.filter(
    (r) => r.status === "running" || r.status === "needs_review",
  );
  const completedPacks = packRuns.filter((r) => r.status === "completed");

  const packMarginMtd = completedPacks.reduce((sum, r) => sum + packMarginEur(r.pack_id), 0);

  const extraClients = Math.max(
    0,
    clients.length - AGENCY_PARTNER_SUBSCRIPTION.includedClientSlots,
  );
  const slotRevenue =
    extraClients * AGENCY_PARTNER_SUBSCRIPTION.extraClientSlotWholesaleEur;

  const estimatedMrr =
    AGENCY_PARTNER_SUBSCRIPTION.wholesaleEur +
    slotRevenue +
    Number(affiliateStats?.total_earnings ?? 0);

  const packs: PartnerPackRow[] = activePacks.slice(0, 20).map((r) => ({
    id: r.id,
    pack_id: r.pack_id,
    pack_label: getPackMeta(r.pack_id)?.name ?? r.pack_id,
    workspace_id: r.workspace_id,
    client_name: clientLabel(r.workspace_id, enrichedClients),
    status: r.status,
    created_at: r.created_at,
    margin_eur: packMarginEur(r.pack_id),
  }));

  const commissions: PartnerCommissionRow[] = [
    {
      source: "pack_margin",
      label: "Margen packs completados (est.)",
      amount_eur: packMarginMtd,
      period: "mes actual",
    },
    {
      source: "client_slot",
      label: "Slots cliente extra (wholesale)",
      amount_eur: slotRevenue,
      period: "mes actual",
    },
  ];

  const affiliateEarnings = Number(affiliateStats?.total_earnings ?? 0);
  const affiliatePending = Number(affiliateStats?.pending_payout ?? 0);
  if (affiliateEarnings > 0 || affiliatePending > 0) {
    commissions.push({
      source: "affiliate",
      label: "Comisiones programa afiliados",
      amount_eur: affiliateEarnings,
      period: "acumulado",
    });
  }

  return {
    metrics: {
      total_clients: clients.length,
      active_clients: clients.filter((c) => c.status !== "inactive").length,
      active_packs: activePacks.length,
      completed_packs: completedPacks.length,
      estimated_mrr_eur: Math.round(estimatedMrr * 100) / 100,
      pack_margin_mtd_eur: Math.round(packMarginMtd * 100) / 100,
      affiliate_earnings_eur: affiliateEarnings,
      affiliate_pending_eur: affiliatePending,
    },
    clients: enrichedClients,
    packs,
    commissions,
    wholesale: buildWholesaleCatalogPayload(),
  };
}
