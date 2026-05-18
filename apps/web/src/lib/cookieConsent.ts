export const COOKIE_CONSENT_STORAGE_KEY = "nelvyon_cookie_consent";

export const CONSENT_UPDATED_EVENT = "nelvyon:consent-updated";

export interface ConsentPreferences {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
}

function isConsentPreferences(value: unknown): value is ConsentPreferences {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  return o.necessary === true && typeof o.analytics === "boolean" && typeof o.marketing === "boolean";
}

function dispatchConsentUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CONSENT_UPDATED_EVENT));
}

export function getConsent(): ConsentPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isConsentPreferences(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function setConsent(prefs: ConsentPreferences): void {
  if (typeof window === "undefined") return;
  const normalized: ConsentPreferences = {
    necessary: true,
    analytics: prefs.analytics,
    marketing: prefs.marketing,
  };
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(normalized));
  dispatchConsentUpdated();
}

export function hasConsented(): boolean {
  return getConsent() !== null;
}

export function revokeConsent(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
  dispatchConsentUpdated();
}
