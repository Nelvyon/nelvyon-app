import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captureMock = vi.fn();
const identifyMock = vi.fn();
const resetMock = vi.fn();

vi.mock("@/lib/posthog", () => ({
  getPostHog: () => ({
    capture: captureMock,
    identify: identifyMock,
    reset: resetMock,
  }),
}));

const getConsentMock = vi.fn();

vi.mock("@/lib/cookieConsent", () => ({
  getConsent: () => getConsentMock(),
}));

import { identifyUser, resetUser, trackEvent } from "@/lib/analytics";

describe("analytics", () => {
  beforeEach(() => {
    captureMock.mockClear();
    identifyMock.mockClear();
    resetMock.mockClear();
    getConsentMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("trackEvent no ejecuta si analytics consent es false", () => {
    getConsentMock.mockReturnValue({ necessary: true, analytics: false, marketing: false });
    trackEvent("user_logged_in");
    expect(captureMock).not.toHaveBeenCalled();
  });

  it("trackEvent ejecuta capture si analytics consent es true", () => {
    getConsentMock.mockReturnValue({ necessary: true, analytics: true, marketing: false });
    trackEvent("user_logged_in", { source: "login" });
    expect(captureMock).toHaveBeenCalledWith("user_logged_in", { source: "login" });
  });

  it("identifyUser llama posthog.identify correctamente", () => {
    getConsentMock.mockReturnValue({ necessary: true, analytics: true, marketing: false });
    identifyUser("user-123", { plan: "pro" });
    expect(identifyMock).toHaveBeenCalledWith("user-123", { plan: "pro" });
  });

  it("resetUser llama posthog.reset", () => {
    resetUser();
    expect(resetMock).toHaveBeenCalledTimes(1);
  });
});
