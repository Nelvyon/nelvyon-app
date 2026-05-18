// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: { getInstance: () => ({ query: queryMock }) },
}));

vi.mock("../../email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

import { completeStep, getOnboardingStatus, initOnboarding } from "../../onboarding";

describe("onboarding", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("initOnboarding hace INSERT y UPDATE cuando email ok", async () => {
    queryMock.mockResolvedValue([]);
    await initOnboarding("user-1", "user@example.com", "Test");
    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it("completeStep actualiza el paso correcto", async () => {
    queryMock
      .mockResolvedValueOnce([]) // INSERT
      .mockResolvedValueOnce([]) // UPDATE paso
      .mockResolvedValueOnce([
        {
          welcome_email_sent: true,
          profile_completed: false,
          first_agent_used: false,
          plan_activated: false,
        },
      ]);
    await completeStep("user-1", "welcome_email_sent");
    expect(queryMock).toHaveBeenCalledTimes(3);
  });

  it("getOnboardingStatus devuelve free cuando no hay fila", async () => {
    queryMock.mockResolvedValue([]);
    const status = await getOnboardingStatus("user-1");
    expect(status.isComplete).toBe(false);
    expect(status.welcomeEmailSent).toBe(false);
  });
});
