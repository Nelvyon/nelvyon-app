import { afterEach, describe, expect, it, vi } from "vitest";

import * as Auth from "@nelvyon/auth";
import * as Saas from "@nelvyon/saas";
import * as Onboarding from "../SaasOnboardingService";
import { DbClient } from "../../db/DbClient";
import { DELETE as DELETE_CONTACT } from "../../../apps/web/src/app/api/saas/crm/contacts/[contactId]/route";
import { GET as GET_BILLING } from "../../../apps/web/src/app/api/saas/billing/route";
import { POST as POST_WORKFLOW } from "../../../apps/web/src/app/api/saas/workflows/route";
import { POST as POST_CAMPANIA } from "../../../apps/web/src/app/api/saas/campanias/route";
import { SaasCrmService } from "../SaasCrmService";

function tenantRow() {
  return {
    id: "t1",
    user_id: "owner-u",
    workspace_id: 1,
    company_name: "Acme",
    industry: "tech",
    plan: "starter",
    website: null,
    phone: null,
    employees: null,
    goals: [],
    onboarding_completed: true,
    onboarding_step: 5,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

describe("saas RBAC API integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Saas.resetSaasCrmServiceForTests();
  });

  it("DELETE contact → 403 for workspace viewer", async () => {
    vi.spyOn(Auth, "authenticate").mockResolvedValue({
      userId: "viewer-u",
      email: "v@test.com",
    } as never);
    vi.spyOn(Onboarding, "getSaasOnboardingService").mockReturnValue({
      getTenant: vi.fn().mockResolvedValue(null),
    } as never);
    vi.spyOn(DbClient, "getInstance").mockReturnValue({
      query: vi.fn().mockResolvedValue([{ member_role: "viewer", ...tenantRow() }]),
    } as never);

    const res = await DELETE_CONTACT(new Request("https://app.test/api/saas/crm/contacts/c1"), {
      params: Promise.resolve({ contactId: "c1" }),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("FORBIDDEN");
  });

  it("POST workflow deal trigger → 403 for viewer", async () => {
    vi.spyOn(Auth, "authenticate").mockResolvedValue({
      userId: "viewer-u",
      email: "v@test.com",
    } as never);
    vi.spyOn(Onboarding, "getSaasOnboardingService").mockReturnValue({
      getTenant: vi.fn().mockResolvedValue(null),
    } as never);
    vi.spyOn(DbClient, "getInstance").mockReturnValue({
      query: vi.fn().mockResolvedValue([{ member_role: "viewer", ...tenantRow() }]),
    } as never);

    const res = await POST_WORKFLOW(
      new Request("https://app.test/api/saas/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Deal flow",
          triggerType: "deal_stage_changed",
          actions: [{ type: "notify", config: { message: "x" } }],
        }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("POST campania deal audience → 403 for viewer", async () => {
    vi.spyOn(Auth, "authenticate").mockResolvedValue({
      userId: "viewer-u",
      email: "v@test.com",
    } as never);
    vi.spyOn(Onboarding, "getSaasOnboardingService").mockReturnValue({
      getTenant: vi.fn().mockResolvedValue(null),
    } as never);
    vi.spyOn(DbClient, "getInstance").mockReturnValue({
      query: vi.fn().mockResolvedValue([{ member_role: "viewer", ...tenantRow() }]),
    } as never);

    const res = await POST_CAMPANIA(
      new Request("https://app.test/api/saas/campanias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Deal prop",
          body: "Hi",
          channel: "email",
          audienceFilter: { deal_stage: "proposal" },
        }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("GET billing → 403 for member", async () => {
    vi.spyOn(Auth, "authenticate").mockResolvedValue({
      userId: "member-u",
      email: "m@test.com",
    } as never);
    vi.spyOn(Onboarding, "getSaasOnboardingService").mockReturnValue({
      getTenant: vi.fn().mockResolvedValue(null),
    } as never);
    vi.spyOn(DbClient, "getInstance").mockReturnValue({
      query: vi.fn().mockResolvedValue([{ member_role: "member", ...tenantRow() }]),
    } as never);

    const res = await GET_BILLING(new Request("https://app.test/api/saas/billing"));
    expect(res.status).toBe(403);
  });

  it("DELETE contact → 200 for tenant owner", async () => {
    const db = {
      query: vi.fn().mockResolvedValue([]),
    };
    vi.spyOn(Auth, "authenticate").mockResolvedValue({
      userId: "owner-u",
      email: "o@test.com",
    } as never);
    vi.spyOn(Onboarding, "getSaasOnboardingService").mockReturnValue({
      getTenant: vi.fn().mockResolvedValue({
        id: "t1",
        userId: "owner-u",
        plan: "starter",
        companyName: "Acme",
        onboardingCompleted: true,
        createdAt: "",
        updatedAt: "",
      }),
    } as never);
    vi.spyOn(Saas, "getSaasCrmService").mockReturnValue(new SaasCrmService(db as never));

    const res = await DELETE_CONTACT(new Request("https://app.test/api/saas/crm/contacts/c1"), {
      params: Promise.resolve({ contactId: "c1" }),
    });
    expect(res.status).toBe(200);
  });
});
