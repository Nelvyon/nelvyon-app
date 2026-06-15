import { describe, expect, it } from "vitest";

import { buildPartnerHqSummary } from "@/lib/partners/partnerHqSummary";
import type { PartnerConnectStatus } from "@/lib/partners/partnerConnectTypes";
import type { PackRunRecord } from "@/lib/packs/types";

const defaultConnect: PartnerConnectStatus = {
  configured: true,
  onboarding_status: "not_started",
  charges_enabled: false,
  payouts_enabled: false,
  details_submitted: false,
  stripe_account_id: null,
  onboarding_complete: false,
  label: "Sin configurar",
};

const baseRun = (overrides: Partial<PackRunRecord>): PackRunRecord => ({
  id: "run-1",
  workspace_id: 10,
  user_id: "u1",
  pack_id: "local-business-growth",
  status: "completed",
  intake: {
    business_name: "Test",
    sector: "restaurant",
    city: "Madrid",
    value_proposition: "x",
    primary_cta: "y",
  },
  saas_client_id: null,
  saas_campaign_id: null,
  os_client_id: null,
  os_project_id: null,
  steps: [],
  report: null,
  error_message: null,
  created_at: "2026-06-01T10:00:00Z",
  updated_at: "2026-06-01T11:00:00Z",
  completed_at: "2026-06-01T11:00:00Z",
  ...overrides,
});

describe("buildPartnerHqSummary", () => {
  it("aggregates clients, packs and affiliate earnings", () => {
    const summary = buildPartnerHqSummary({
      clients: [
        {
          client_workspace_id: 10,
          client_name: "Cliente A",
          status: "active",
        },
      ],
      packRuns: [
        baseRun({ status: "running", id: "r-active" }),
        baseRun({ status: "completed", id: "r-done" }),
      ],
      affiliateStats: { total_earnings: 120, pending_payout: 30 },
      connect: defaultConnect,
    });

    expect(summary.metrics.total_clients).toBe(1);
    expect(summary.metrics.active_packs).toBe(1);
    expect(summary.metrics.completed_packs).toBe(1);
    expect(summary.metrics.pack_margin_mtd_eur).toBeGreaterThan(0);
    expect(summary.metrics.affiliate_earnings_eur).toBe(120);
    expect(summary.clients[0].active_pack_id).toBe("local-business-growth");
    expect(summary.commissions.some((c) => c.source === "affiliate")).toBe(true);
    expect(summary.connect.label).toBe("Sin configurar");
  });

  it("charges extra client slots beyond included limit", () => {
    const clients = Array.from({ length: 12 }, (_, i) => ({
      client_workspace_id: 100 + i,
      client_name: `C${i}`,
      status: "active",
    }));
    const summary = buildPartnerHqSummary({
      clients,
      packRuns: [],
      connect: defaultConnect,
    });
    expect(summary.metrics.estimated_mrr_eur).toBeGreaterThan(197);
  });

  it("prefers real ledger commissions over estimates", () => {
    const summary = buildPartnerHqSummary({
      clients: [],
      packRuns: [],
      connect: { ...defaultConnect, onboarding_status: "active", label: "Completo" },
      ledger: [
        {
          id: "l1",
          partner_workspace_id: 2,
          client_workspace_id: null,
          event_type: "connect_test",
          stripe_event_id: "evt_1",
          gross_eur: 497,
          wholesale_eur: 149,
          partner_margin_eur: 348,
          currency: "eur",
          description: "Demo pack",
          created_at: "2026-06-10T10:00:00Z",
        },
      ],
      ledgerTotals: { total_margin_eur: 388, margin_mtd_eur: 348, entry_count: 2 },
    });

    expect(summary.metrics.ledger_margin_mtd_eur).toBe(348);
    expect(summary.commissions.some((c) => c.real && c.source === "ledger")).toBe(true);
    expect(summary.commissions.some((c) => c.source === "pack_margin")).toBe(false);
  });
});
