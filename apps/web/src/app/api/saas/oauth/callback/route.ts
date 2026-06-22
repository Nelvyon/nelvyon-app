import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * OAuth callback handler — forwards the code+state to the Python backend
 * which handles token exchange and DB storage.
 *
 * Flow: Provider → /api/saas/oauth/callback?code=X&state=Y → Python /api/v1/oauth/callback/[provider]
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com";

  if (error) {
    return NextResponse.redirect(new URL(`/saas/integraciones?oauth_error=${encodeURIComponent(error)}`, appUrl));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/saas/integraciones?oauth_error=missing_params", appUrl));
  }

  // State encodes: {provider}:{tenantId}:{nonce}
  const [provider] = state.split(":");

  if (!provider) {
    return NextResponse.redirect(new URL("/saas/integraciones?oauth_error=invalid_state", appUrl));
  }

  const backendUrl = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

  try {
    const backendRes = await fetch(`${backendUrl}/api/v1/oauth/callback/${provider}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`, {
      method: "GET",
      headers: { "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!backendRes.ok) {
      const errData = (await backendRes.json().catch(() => ({}))) as { detail?: string };
      const msg = errData.detail ?? `backend_${backendRes.status}`;
      return NextResponse.redirect(new URL(`/saas/integraciones?oauth_error=${encodeURIComponent(msg)}`, appUrl));
    }

    return NextResponse.redirect(new URL(`/saas/integraciones?oauth_success=${provider}`, appUrl));
  } catch {
    return NextResponse.redirect(new URL("/saas/integraciones?oauth_error=timeout", appUrl));
  }
}
