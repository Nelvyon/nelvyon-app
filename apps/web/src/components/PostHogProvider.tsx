"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, type ReactNode } from "react";

import { trackPageView } from "@/lib/analytics";
import { CONSENT_UPDATED_EVENT, getConsent } from "@/lib/cookieConsent";
import { initPostHog } from "@/lib/posthog";

function applyConsentToPostHog(): void {
  const analytics = getConsent()?.analytics === true;
  if (analytics) {
    window.__posthog?.opt_in_capturing?.();
  } else {
    window.__posthog?.opt_out_capturing?.();
  }
}

function PostHogPageviews(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const base = pathname ?? "/";
    const query = searchParams?.toString();
    const path = query && query.length > 0 ? `${base}?${query}` : base;
    trackPageView(path);
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initPostHog();
    applyConsentToPostHog();

    const onConsentUpdated = () => applyConsentToPostHog();
    window.addEventListener(CONSENT_UPDATED_EVENT, onConsentUpdated);
    return () => window.removeEventListener(CONSENT_UPDATED_EVENT, onConsentUpdated);
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageviews />
      </Suspense>
      {children}
    </>
  );
}
