"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { Button } from "@/core/ui/button";
import { UpgradeStatusPanel, UpgradeUiStatus } from "@/features/billing/components/UpgradeStatusPanel";
import {
  useActiveSubscription,
  useBillingPlans,
  useCreatePaymentSession,
  useVerifyPayment,
} from "@/features/billing/hooks";

function cycleLabel(cycle: string) {
  return cycle.replace("_", " ");
}

export function BillingUpgradePageClient() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const canUpgrade = user ? canPerformAction(user.role, "billing", "create") : false;
  const plansQuery = useBillingPlans();
  const activeSubQuery = useActiveSubscription();
  const verifyPayment = useVerifyPayment();
  const createPaymentSession = useCreatePaymentSession();
  const [planId, setPlanId] = useState<string>("");
  const [cycle, setCycle] = useState<string>("monthly");
  const [uiState, setUiState] = useState<{ status: UpgradeUiStatus; message?: string }>({ status: "idle" });

  const sessionId = searchParams?.get("session_id") ?? null;
  const checkoutStatus = searchParams?.get("checkout") ?? null;

  React.useEffect(() => {
    if (!sessionId || verifyPayment.isPending) return;
    let mounted = true;
    setUiState({ status: "loading", message: "Verifying checkout status with workspace scope." });
    void verifyPayment
      .mutateAsync(sessionId)
      .then((result) => {
        if (!mounted) return;
        if (result.status === "paid") {
          setUiState({ status: "paid", message: "Payment status is paid and subscription was refreshed." });
          return;
        }
        if (result.status === "cancelled") {
          setUiState({ status: "cancelled", message: "Checkout cancelado o expirado. No se aplicó ningún cambio de plan." });
          return;
        }
        setUiState({ status: "pending", message: "Checkout is still pending. Re-open this page after payment completes." });
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        if (error instanceof ApiError && error.status === 403) {
          setUiState({
            status: "forbidden",
            message:
              "Cause: this session_id is not valid for your current workspace or role. Next: start checkout again from Billing → Upgrade with the same workspace selected.",
          });
          return;
        }
        setUiState({
          status: "error",
          message:
            "Cause: payment verification failed (Stripe or API). Next: use Retry below, or return to Billing overview and open Upgrade again with a fresh checkout.",
        });
      });
    return () => {
      mounted = false;
    };
  }, [sessionId, verifyPayment]);

  React.useEffect(() => {
    if (checkoutStatus === "cancelled" && !sessionId) {
      setUiState({ status: "cancelled", message: "Checkout was cancelled before confirmation." });
    }
    if (checkoutStatus === "success" && !sessionId) {
      setUiState({
        status: "error",
        message:
          "Cause: return from checkout did not include session_id, so payment cannot be verified yet. Next: open Upgrade again and complete checkout from this page.",
      });
    }
  }, [checkoutStatus, sessionId]);

  const plans = useMemo(() => plansQuery.data?.plans ?? [], [plansQuery.data]);
  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.plan_id === planId) ?? plans[0] ?? null,
    [planId, plans],
  );
  const selectedCycle = useMemo(
    () => selectedPlan?.cycles.find((item) => item.cycle === cycle) ?? selectedPlan?.cycles[0] ?? null,
    [cycle, selectedPlan],
  );

  React.useEffect(() => {
    if (!plans.length) return;
    if (!planId) setPlanId(plans[0].plan_id);
  }, [planId, plans]);

  React.useEffect(() => {
    if (!selectedPlan) return;
    if (!selectedPlan.cycles.some((item) => item.cycle === cycle)) {
      setCycle(selectedPlan.cycles[0]?.cycle ?? "monthly");
    }
  }, [cycle, selectedPlan]);

  const startCheckout = async () => {
    if (!canUpgrade) {
      setUiState({ status: "forbidden" });
      return;
    }
    if (!selectedPlan || !selectedCycle) return;
    try {
      setUiState({ status: "redirecting", message: "Redirigiendo a Stripe Checkout…" });
      const result = await createPaymentSession.mutateAsync({
        plan_id: selectedPlan.plan_id,
        billing_cycle: selectedCycle.cycle,
        success_url: "/billing/upgrade?checkout=success&session_id={CHECKOUT_SESSION_ID}",
        cancel_url: "/billing/upgrade?checkout=cancelled",
      });
      if (result.url) {
        window.location.assign(result.url);
        return;
      }
      setUiState({
        status: "error",
        message: "Stripe no devolvió URL de checkout. Revisa la configuración de precios en el backend.",
      });
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 403) {
        setUiState({
          status: "forbidden",
          message:
            "Cause: only billing admins can start checkout. Next: ask a workspace admin to upgrade, or switch to an admin-capable account.",
        });
        return;
      }
      setUiState({
        status: "error",
        message:
          "Cause: checkout session creation failed (network or billing API). Next: retry; if it persists, refresh Billing and confirm plans load before trying again.",
      });
    }
  };

  return (
    <ProtectedLayout module="billing">
      <div className="mx-auto max-w-3xl space-y-6">
        <p className="text-sm text-muted-foreground">
          Elige plan y ciclo de facturación. El pago se procesa con Stripe Checkout; al volver, verificamos la suscripción
          del workspace.
        </p>

        <UpgradeStatusPanel message={uiState.message} status={uiState.status} />

        <section className="rounded-lg border border-border bg-card p-4 shadow-card">
          <h2 className="text-base font-medium text-foreground">Current workspace subscription</h2>
          {activeSubQuery.isLoading ? <p className="mt-2 text-xs text-muted-foreground">Loading active subscription row…</p> : null}
          {activeSubQuery.isFetching && activeSubQuery.data ? (
            <p className="mt-2 text-xs text-muted-foreground">Refreshing active subscription after checkout updates…</p>
          ) : null}
          {activeSubQuery.data?.has_subscription ? (
            <p className="mt-2 text-sm text-foreground">
              Active: {activeSubQuery.data.plan_id} ({activeSubQuery.data.billing_cycle}) · status {activeSubQuery.data.status}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No active subscription row for this workspace yet.</p>
          )}
        </section>

        <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
          <h2 className="text-base font-medium text-foreground">Choose plan and cycle</h2>
          {plansQuery.isLoading ? <p className="text-xs text-muted-foreground">Loading billable plans for this workspace…</p> : null}
          {plansQuery.isFetching && plans.length > 0 ? (
            <p className="text-xs text-muted-foreground">Refreshing plans and cycle pricing…</p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Plan</span>
              <select
                aria-label="Plan"
                className="w-full rounded-md border border-input bg-background px-2 py-2"
                onChange={(e) => setPlanId(e.target.value)}
                value={selectedPlan?.plan_id ?? ""}
              >
                {plans.map((plan) => (
                  <option key={plan.plan_id} value={plan.plan_id}>
                    {plan.name} ({plan.plan_id})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Billing cycle</span>
              <select
                aria-label="Billing cycle"
                className="w-full rounded-md border border-input bg-background px-2 py-2"
                onChange={(e) => setCycle(e.target.value)}
                value={selectedCycle?.cycle ?? ""}
              >
                {(selectedPlan?.cycles ?? []).map((item) => (
                  <option key={item.cycle} value={item.cycle}>
                    {cycleLabel(item.cycle)} ({item.total_price.toFixed(2)} {selectedPlan?.currency.toUpperCase()})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedCycle ? (
            <p className="text-sm text-muted-foreground">
              Estimated total for selected cycle: <strong>{selectedCycle.total_price.toFixed(2)}</strong>{" "}
              {selectedPlan?.currency.toUpperCase()} · discount {selectedCycle.discount_percent}%.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={
                !canUpgrade ||
                !selectedPlan ||
                !selectedCycle ||
                uiState.status === "redirecting" ||
                plansQuery.isLoading ||
                createPaymentSession.isPending
              }
              onClick={() => void startCheckout()}
            >
              Start secure checkout (Stripe)
            </Button>
            <Button asChild variant="outline">
              <Link href="/billing">Back to billing overview</Link>
            </Button>
          </div>

          {!canUpgrade ? (
            <p className="text-sm text-warning-foreground">
              Only workspace admins can start checkout. Operators can review billing state but cannot change plans.
            </p>
          ) : null}
          {!plansQuery.isLoading && !plans.length ? (
            <p className="text-sm text-warning-foreground">
              No billable plans are currently available. Next: verify billing catalog access, then retry from this page.
            </p>
          ) : null}
          {plansQuery.error ? (
            <div className="space-y-1 text-sm text-destructive">
              <p>Could not load billable plans.</p>
              <p className="text-muted-foreground">
                Cause: GET /billing/plans failed or returned an error. Next: refresh the page; if it persists, confirm billing
                module access and try again in a few minutes.
              </p>
            </div>
          ) : null}
          {activeSubQuery.error ? (
            <div className="space-y-1 text-sm text-destructive">
              <p>Could not load the current subscription row.</p>
              <p className="text-muted-foreground">
                Cause: active subscription fetch failed (403 or server error). Next: go to Billing overview, then return here;
                operators need billing view to see live plan state.
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </ProtectedLayout>
  );
}
