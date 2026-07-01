import { beforeEach, describe, expect, it, vi } from "vitest";

import * as Onboarding from "../SaasOnboardingService";
import * as Ads from "../SaasAdsDashboardService";
import * as Social from "../SaasSocialService";
import { syncOAuthToProductModules } from "../integrationHubSync";

describe("syncOAuthToProductModules", () => {
  const mockConnectAds = vi.fn();
  const mockConnectSocial = vi.fn();
  const mockGetTenant = vi.fn();

  beforeEach(() => {
    mockConnectAds.mockReset();
    mockConnectSocial.mockReset();
    mockGetTenant.mockReset();
    mockGetTenant.mockResolvedValue({ id: "tenant-1" });

    vi.spyOn(Onboarding, "getSaasOnboardingService").mockReturnValue({
      getTenant: mockGetTenant,
    } as unknown as ReturnType<typeof Onboarding.getSaasOnboardingService>);

    vi.spyOn(Ads, "getSaasAdsDashboardService").mockReturnValue({
      connectAccount: mockConnectAds,
    } as unknown as ReturnType<typeof Ads.getSaasAdsDashboardService>);

    vi.spyOn(Social, "getSaasSocialService").mockReturnValue({
      connectAccount: mockConnectSocial,
    } as unknown as ReturnType<typeof Social.getSaasSocialService>);
  });

  it("wires Meta OAuth into ads and social", async () => {
    await syncOAuthToProductModules("user-1", "meta", {
      accessToken: "tok-meta",
      accountId: "act_1",
      accountName: "Meta Ads",
    });
    expect(mockConnectAds).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ platform: "meta", accessToken: "tok-meta" }),
    );
    expect(mockConnectSocial).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ platform: "meta", accessToken: "tok-meta" }),
    );
  });

  it("no-ops when tenant missing", async () => {
    mockGetTenant.mockResolvedValue(null);
    await syncOAuthToProductModules("user-1", "google", { accessToken: "x" });
    expect(mockConnectAds).not.toHaveBeenCalled();
    expect(mockConnectSocial).not.toHaveBeenCalled();
  });
});
