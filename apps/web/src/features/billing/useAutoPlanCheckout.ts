"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { useAuth } from "@/core/auth/AuthContext";

import { loginUrlForPlanCheckout, startPlanCheckout, type BillablePlanId } from "./planCheckout";

const VALID_PLANS = new Set<BillablePlanId>(["starter", "pro", "agency", "agency_partner"]);

function parsePlan(raw: string | null): BillablePlanId | null {
  if (!raw) return null;
  const plan = raw.toLowerCase().trim() as BillablePlanId;
  return VALID_PLANS.has(plan) ? plan : null;
}

/** After login with ?plan=starter on /precios, auto-starts Stripe checkout once. */
export function useAutoPlanCheckout(returnPath = "/precios") {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isBootstrapping, accessToken } = useAuth();
  const started = useRef(false);

  useEffect(() => {
    if (isBootstrapping || started.current || !searchParams) return;
    const plan = parsePlan(searchParams.get("plan"));
    if (!plan) return;

    if (!isAuthenticated) {
      router.replace(loginUrlForPlanCheckout(`${returnPath}?plan=${plan}`));
      return;
    }

    started.current = true;
    void (async () => {
      const result = await startPlanCheckout(plan, accessToken);
      if (result.ok) {
        window.location.href = result.url;
        return;
      }
      if (result.unauthorized) {
        router.replace(loginUrlForPlanCheckout(`${returnPath}?plan=${plan}`));
        return;
      }
      router.replace(returnPath);
    })();
  }, [accessToken, isAuthenticated, isBootstrapping, returnPath, router, searchParams]);
}
