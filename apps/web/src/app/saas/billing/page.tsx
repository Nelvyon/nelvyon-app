"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CHECKOUT_STRIPE_PLANS,
  PLAN_NAMES,
  PLAN_PRICES,
  comparePlans,
  type CheckoutStripePlan,
} from "@nelvyon/billing/planConfig";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { PlanCheckoutButton } from "@/features/billing/PlanCheckoutButton";
import type { BillablePlanId } from "@/features/billing/planCheckout";
import { SaasEmptyState } from "@/features/saas-shell/components/SaasEmptyState";
import { SaasPermissionDenied } from "@/features/saas-shell/components/SaasPermissionDenied";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { saasRoleLabel } from "@/features/saas-shell/saasPermissions";
import type { SaasNavId } from "@/features/saas-shell/saasNav";

type BillingSummary = {
  tenant: { companyName: string; plan: string };
  role: string;
  limits: Record<string, number | null>;
  usage: Record<string, number>;
};

function usagePct(used: number, limit: number | null): number | null {
  if (limit === null || limit <= 0) return null;
  return Math.min(100, Math.round((used / limit) * 100));
}

function saasPlanToCheckoutTier(plan: string): CheckoutStripePlan {
  const p = plan.toLowerCase().trim();
  if (p === "enterprise") return "agency";
  if (p === "starter" || p === "pro" || p === "agency") return p;
  return "starter";
}

export default function SaasBillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BillingSummary | null>(null);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/saas/billing", { credentials: "same-origin" });
        if (res.status === 401) {
          router.replace("/auth/login?next=/saas/billing");
          return;
        }
        if (res.status === 403) {
          setError("Tu rol no tiene acceso a facturación. Solo propietarios y administradores pueden ver esta sección.");
          return;
        }
        if (!res.ok) throw new Error("No se pudo cargar la facturación");
        setData((await res.json()) as BillingSummary);

        const portalRes = await fetch("/api/user/payment-method", { credentials: "same-origin" });
        if (portalRes.ok) {
          const portal = (await portalRes.json()) as { updateUrl?: string };
          if (portal.updateUrl) setPortalUrl(portal.updateUrl);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const currentCheckoutTier = useMemo(
    () => (data ? saasPlanToCheckoutTier(data.tenant.plan) : "starter"),
    [data],
  );

  const activeId: SaasNavId = "billing";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <SaasSidebar activeId={activeId} tenantCompany={data?.tenant.companyName} tenantPlan={data?.tenant.plan as "starter" | "pro" | "enterprise" | undefined} />
        <main className="space-y-6">
          <NelvyonDsSectionHeader title="Facturación y plan" subtitle="Uso del tenant, límites y checkout Stripe self-serve." />
          {loading ? <NelvyonDsCard>Cargando…</NelvyonDsCard> : null}
          {error ? <SaasPermissionDenied message={error} /> : null}
          {!loading && !error && data ? (
            <>
              <NelvyonDsCard title="Plan actual">
                <div className="flex flex-wrap items-center gap-2">
                  <NelvyonDsBadge tone="primary">{data.tenant.plan}</NelvyonDsBadge>
                  <span className="text-sm text-muted-foreground">{data.tenant.companyName}</span>
                  <NelvyonDsBadge tone="neutral">{saasRoleLabel(data.role)}</NelvyonDsBadge>
                </div>
                {portalUrl ? (
                  <div className="mt-4">
                    <NelvyonDsButton asChild variant="secondary" size="sm">
                      <a href={portalUrl} rel="noopener noreferrer" target="_blank">
                        Gestionar método de pago en Stripe
                      </a>
                    </NelvyonDsButton>
                  </div>
                ) : null}
              </NelvyonDsCard>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {(["contacts", "deals", "campanias", "workflows", "users"] as const).map((key) => {
                  const used = data.usage[key] ?? 0;
                  const limit = data.limits[key] ?? null;
                  const pct = usagePct(used, limit);
                  return (
                    <NelvyonDsCard key={key} title={key}>
                      <p className="text-2xl font-semibold tabular-nums">
                        {used}
                        {limit !== null ? ` / ${limit}` : " / ∞"}
                      </p>
                      {pct !== null ? (
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">Sin límite en este plan</p>
                      )}
                    </NelvyonDsCard>
                  );
                })}
              </section>
              <section className="space-y-4">
                <h2 className="text-lg font-semibold">Cambiar de plan</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  {CHECKOUT_STRIPE_PLANS.map((planId) => {
                    const isCurrent = planId === currentCheckoutTier;
                    const isUpgrade = comparePlans(planId, currentCheckoutTier as BillablePlanId) > 0;
                    const isDowngrade = comparePlans(planId, currentCheckoutTier as BillablePlanId) < 0;
                    return (
                      <NelvyonDsCard key={planId} title={PLAN_NAMES[planId]}>
                        <p className="text-3xl font-bold tabular-nums">
                          €{PLAN_PRICES[planId]}
                          <span className="text-sm font-normal text-muted-foreground">/mes</span>
                        </p>
                        <div className="mt-4">
                          {isCurrent ? (
                            <NelvyonDsBadge tone="primary">Plan actual</NelvyonDsBadge>
                          ) : (
                            <PlanCheckoutButton
                              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                              planId={planId}
                              returnPath="/saas/billing"
                            >
                              {isUpgrade ? "Mejorar plan" : isDowngrade ? "Cambiar plan" : "Seleccionar"}
                            </PlanCheckoutButton>
                          )}
                        </div>
                      </NelvyonDsCard>
                    );
                  })}
                </div>
              </section>
              <SaasEmptyState
                title="Facturación del workspace"
                description="El portal de Stripe gestiona métodos de pago e historial. Los cambios de plan se sincronizan automáticamente con tu tenant SaaS."
                action={
                  portalUrl ? (
                    <NelvyonDsButton asChild variant="secondary">
                      <a href={portalUrl} rel="noopener noreferrer" target="_blank">
                        Abrir portal Stripe
                      </a>
                    </NelvyonDsButton>
                  ) : (
                    <NelvyonDsButton asChild variant="secondary">
                      <a href="/dashboard/settings">Configuración del workspace</a>
                    </NelvyonDsButton>
                  )
                }
              />
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
