export type BillablePlanId = "starter" | "pro" | "agency" | "agency_partner";

export type PlanCheckoutResult =
  | { ok: true; url: string; sessionId?: string }
  | { ok: false; status: number; message: string; unauthorized?: boolean };

export async function startPlanCheckout(
  planId: BillablePlanId,
  accessToken?: string | null,
): Promise<PlanCheckoutResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers,
    credentials: "same-origin",
    body: JSON.stringify({ planId }),
  });

  const data: unknown = await res.json().catch(() => ({}));
  if (res.ok) {
    const url =
      typeof data === "object" && data !== null && typeof (data as { url?: unknown }).url === "string"
        ? (data as { url: string }).url
        : null;
    if (!url) {
      return { ok: false, status: 502, message: "Stripe no devolvió URL de checkout" };
    }
    const sessionId =
      typeof data === "object" && data !== null && typeof (data as { sessionId?: unknown }).sessionId === "string"
        ? (data as { sessionId: string }).sessionId
        : undefined;
    return { ok: true, url, sessionId };
  }

  const message =
    typeof data === "object" && data !== null && typeof (data as { error?: unknown }).error === "string"
      ? (data as { error: string }).error
      : "No se pudo iniciar el checkout";

  return {
    ok: false,
    status: res.status,
    message,
    unauthorized: res.status === 401,
  };
}

export function loginUrlForPlanCheckout(returnPath: string): string {
  return `/login?next=${encodeURIComponent(returnPath)}`;
}
