import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CONSENT_UPDATED_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  getConsent,
  hasConsented,
  revokeConsent,
  setConsent,
} from "@/lib/cookieConsent";

describe("cookieConsent", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(window, "dispatchEvent");
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("getConsent returns null when storage is empty", () => {
    expect(getConsent()).toBeNull();
    expect(hasConsented()).toBe(false);
  });

  it("setConsent stores preferences and dispatches event", () => {
    const prefs = { necessary: true as const, analytics: true, marketing: false };
    setConsent(prefs);
    expect(getConsent()).toEqual(prefs);
    expect(hasConsented()).toBe(true);
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: CONSENT_UPDATED_EVENT }),
    );
    expect(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe(JSON.stringify(prefs));
  });

  it("revokeConsent removes storage and dispatches event", () => {
    setConsent({ necessary: true, analytics: false, marketing: false });
    revokeConsent();
    expect(getConsent()).toBeNull();
    expect(hasConsented()).toBe(false);
    expect(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBeNull();
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: CONSENT_UPDATED_EVENT }),
    );
  });
});
