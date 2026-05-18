import { getConsent } from "./cookieConsent";
import { getPostHog } from "./posthog";

function hasAnalyticsConsent(): boolean {
  return getConsent()?.analytics === true;
}

export function trackEvent(name: string, props?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;
  getPostHog()?.capture(name, props);
}

export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;
  getPostHog()?.identify(userId, traits);
}

export function trackPageView(path: string): void {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;
  const url =
    typeof window !== "undefined" && window.location.origin
      ? `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`
      : path;
  getPostHog()?.capture("$pageview", { $current_url: url });
}

export function resetUser(): void {
  if (typeof window === "undefined") return;
  getPostHog()?.reset();
}
