import { NextResponse } from "next/server";

export const SAAS_INTEGRATIONS_PATH = "/saas/integraciones";

export function appBaseUrl(fallbackOrigin: string): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? fallbackOrigin).replace(/\/$/, "");
}

export function redirectIntegrationsSuccess(origin: string, provider: string): NextResponse {
  const base = appBaseUrl(origin);
  return NextResponse.redirect(
    new URL(`${SAAS_INTEGRATIONS_PATH}?oauth_success=${encodeURIComponent(provider)}`, base),
  );
}

export function redirectIntegrationsError(origin: string, error: string): NextResponse {
  const base = appBaseUrl(origin);
  return NextResponse.redirect(
    new URL(`${SAAS_INTEGRATIONS_PATH}?oauth_error=${encodeURIComponent(error)}`, base),
  );
}
