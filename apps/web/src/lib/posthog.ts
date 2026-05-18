import posthog from "posthog-js";

import { getConsent } from "./cookieConsent";

let initialized = false;

export function initPostHog(): void {
  if (typeof window === "undefined") return;
  if (initialized) return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey || apiKey.trim().length === 0) return;

  initialized = true;

  posthog.init(apiKey, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
    person_profiles: "identified_only",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    loaded: (ph) => {
      if (getConsent()?.analytics !== true) {
        ph.opt_out_capturing();
      }
      window.__posthog = ph as typeof posthog;
    },
  });

  window.__posthog = posthog;
}

export function getPostHog(): typeof posthog | null {
  if (typeof window === "undefined") return null;
  return window.__posthog ?? null;
}
