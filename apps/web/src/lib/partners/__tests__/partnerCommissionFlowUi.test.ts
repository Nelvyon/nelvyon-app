import { describe, expect, it } from "vitest";

import type { PartnerHqResponse } from "@/features/partners/api";
import {
  connectStepBadge,
  resolveMarginHero,
  stepStates,
} from "@/lib/partners/partnerCommissionFlowUi";
import type { PartnerConnectStatus } from "@/lib/partners/partnerConnectTypes";

const connectNotStarted: PartnerConnectStatus = {
  configured: true,
  onboarding_status: "not_started",
  charges_enabled: false,
  payouts_enabled: false,
  details_submitted: false,
  stripe_account_id: null,
  onboarding_complete: false,
  label: "Sin configurar",
};

function baseHq(overrides: Partial<PartnerHqResponse> = {}): PartnerHqResponse {
  return {
    partner_user_id: "u1",
    workspace_id: 2,
    metrics: {
      total_clients: 0,
      active_clients: 0,
      active_packs: 0,
      completed_packs: 0,
      estimated_mrr_eur: 197,
      pack_margin_mtd_eur: 348,
      affiliate_earnings_eur: 0,
      affiliate_pending_eur: 0,
      ledger_margin_mtd_eur: 0,
      ledger_margin_total_eur: 0,
    },
    connect: connectNotStarted,
    ledger_entries: [],
    clients: [],
    packs: [],
    commissions: [],
    wholesale: {
      subscription: {
        planId: "agency_partner",
        label: "Agency Partner",
        wholesaleEur: 197,
        includedClientSlots: 10,
        extraClientSlotWholesaleEur: 29,
      },
      client_plans: [],
      growth_packs: [],
    },
    ...overrides,
  };
}

describe("partnerCommissionFlowUi", () => {
  it("shows projection margin when ledger is empty", () => {
    const hero = resolveMarginHero(baseHq());
    expect(hero.real).toBe(false);
    expect(hero.mtd).toBe(348);
  });

  it("shows real margin when ledger has entries", () => {
    const hero = resolveMarginHero(
      baseHq({
        metrics: {
          ...baseHq().metrics,
          ledger_margin_mtd_eur: 120,
          ledger_margin_total_eur: 388,
        },
        ledger_entries: [
          {
            id: "1",
            partner_workspace_id: 2,
            client_workspace_id: null,
            event_type: "connect_test",
            stripe_event_id: null,
            gross_eur: 200,
            wholesale_eur: 80,
            partner_margin_eur: 120,
            currency: "eur",
            description: "test",
            created_at: "2026-06-01T00:00:00Z",
          },
        ],
      }),
    );
    expect(hero.real).toBe(true);
    expect(hero.mtd).toBe(120);
    expect(hero.total).toBe(388);
  });

  it("maps connect statuses to badges", () => {
    expect(connectStepBadge(connectNotStarted).label).toBe("Sin configurar");
    expect(connectStepBadge({ ...connectNotStarted, onboarding_status: "active" }).label).toBe("Completo");
  });

  it("advances checklist as steps complete", () => {
    expect(stepStates(baseHq(), connectNotStarted)).toEqual(["current", "upcoming", "upcoming"]);
    expect(
      stepStates(
        baseHq({ metrics: { ...baseHq().metrics, total_clients: 2 } }),
        { ...connectNotStarted, onboarding_complete: true, onboarding_status: "active" },
      ),
    ).toEqual(["done", "done", "current"]);
  });
});
