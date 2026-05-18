import { ACTIVATION_ROWS } from "@/features/onboarding/components/ActivationChecklist";

describe("activation checklist rows", () => {
  it("keeps critical activation steps wired", () => {
    const ids = ACTIVATION_ROWS.map((r) => r.id);
    expect(ids).toEqual(["ws", "tenant", "client", "ticket", "campaign"]);
  });

  it("maps backend-synced keys explicitly", () => {
    const byId = Object.fromEntries(ACTIVATION_ROWS.map((r) => [r.id, r]));
    expect(byId.tenant?.backendStepKey).toBe("workspace");
    expect(byId.client?.backendStepKey).toBe("first_contact");
    expect(byId.campaign?.backendStepKey).toBe("first_campaign");
    expect(byId.ticket?.localStorageKey).toBeTruthy();
  });
});
