"use client";

import { revokeConsent } from "@/lib/cookieConsent";

export function CookiePreferencesButton() {
  return (
    <button
      type="button"
      onClick={() => {
        revokeConsent();
        window.location.reload();
      }}
      className="text-sm text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
    >
      Gestionar cookies
    </button>
  );
}
