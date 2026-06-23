"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
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

const PLANS = [
  { id: "starter", name: "Starter", price: 97, features: ["100 llamadas IA/mes", "3 sectores", "CRM + Email + Workflows"] },
  { id: "pro", name: "Pro", price: 297, features: ["500 llamadas IA/mes", "10 sectores", "Todo Starter + Deals + Campañas"] },
  { id: "agency", name: "Agency", price: 797, features: ["2.000 llamadas IA/mes", "Sectores ilimitados", "Todo Pro + White-label + OS"] },
] as const;

function usagePct(used: number, limit: number | null): number | null {
  if (limit === null || limit <= 0) return null;
  return Math.min(100, Math.round((used / limit) * 100));
}

const USAGE_LABELS: Record<string, string> = {
  contacts: "Contactos",
  deals: "Oportunidades",
  campanias: "Campañas",
  workflows: "Workflows",
  users: "Usuarios",
};

export default function SaasBillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BillingSummary | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [portaling, setPortaling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/saas/billing", { credentials: "same-origin" });
        if (res.status === 401) { router.replace("/auth/login?next=/saas/billing"); return; }
        if (res.status === 403) {
          setError("Tu rol no tiene acceso a facturación. Solo propietarios y administradores.");
          return;
        }
        if (!res.ok) throw new Error("No se pudo cargar la facturación");
        setData((await res.json()) as BillingSummary);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function handleUpgrade(planId: string) {
    setUpgrading(planId);
    setActionError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ planId }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "No se pudo iniciar el checkout");
      window.location.href = json.url;
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Error al iniciar el checkout");
    } finally {
      setUpgrading(null);
    }
  }

  async function handlePortal() {
    setPortaling(true);
    setActionError(null);
    try {
      const res = await fetch("/api/saas/billing/portal", {
        method: "POST",
        credentials: "same-origin",
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "No se pudo abrir el portal de facturación");
      window.location.href = json.url;
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Error al abrir el portal");
    } finally {
      setPortaling(false);
    }
  }

  const activeId: SaasNavId = "billing";
  const currentPlan = data?.tenant.plan ?? null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <SaasSidebar
          activeId={activeId}
          tenantCompany={data?.tenant.companyName}
          tenantPlan={currentPlan as "starter" | "pro" | "enterprise" | undefined}
        />
        <main className="space-y-6">
          <NelvyonDsSectionHeader
            title="Facturación y plan"
            subtitle="Gestiona tu suscripción y consulta el uso en tiempo real."
          />

          {loading && <NelvyonDsCard>Cargando…</NelvyonDsCard>}
          {error && <SaasPermissionDenied message={error} />}
          {actionError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center justify-between gap-3">
              <span>{actionError}</span>
              <button onClick={() => setActionError(null)} className="shrink-0 font-medium hover:underline">Cerrar</button>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Plan actual */}
              <NelvyonDsCard title="Plan actual">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <NelvyonDsBadge tone="primary" className="capitalize">{data.tenant.plan}</NelvyonDsBadge>
                    <span className="text-sm text-muted-foreground">{data.tenant.companyName}</span>
                    <NelvyonDsBadge tone="neutral">{saasRoleLabel(data.role)}</NelvyonDsBadge>
                  </div>
                  <NelvyonDsButton
                    variant="secondary"
                    size="sm"
                    onClick={() => void handlePortal()}
                    disabled={portaling}
                  >
                    {portaling ? "Abriendo portal…" : "Gestionar facturación"}
                  </NelvyonDsButton>
                </div>
              </NelvyonDsCard>

              {/* Uso */}
              <NelvyonDsCard title="Uso del plan">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {(["contacts", "deals", "campanias", "workflows", "users"] as const).map((key) => {
                    const used = data.usage[key] ?? 0;
                    const limit = data.limits[key] ?? null;
                    const pct = usagePct(used, limit);
                    const isHigh = pct !== null && pct >= 80;
                    return (
                      <div key={key} className="rounded-xl border border-border bg-muted/20 p-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {USAGE_LABELS[key] ?? key}
                        </p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums">
                          {used}
                          <span className="text-base font-normal text-muted-foreground">
                            {limit !== null ? ` / ${limit}` : " / ∞"}
                          </span>
                        </p>
                        {pct !== null ? (
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full transition-all ${isHigh ? "bg-destructive" : "bg-primary"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground">Sin límite</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </NelvyonDsCard>

              {/* Planes disponibles */}
              <NelvyonDsCard title="Cambiar de plan">
                <div className="grid gap-4 sm:grid-cols-3">
                  {PLANS.map((plan) => {
                    const isCurrent = currentPlan === plan.id;
                    return (
                      <div
                        key={plan.id}
                        className={`rounded-xl border p-5 flex flex-col gap-3 ${
                          isCurrent
                            ? "border-primary bg-primary/5"
                            : "border-border bg-muted/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{plan.name}</span>
                          {isCurrent && <NelvyonDsBadge tone="primary">Activo</NelvyonDsBadge>}
                        </div>
                        <p className="text-2xl font-bold">
                          {plan.price}€
                          <span className="text-sm font-normal text-muted-foreground">/mes</span>
                        </p>
                        <ul className="space-y-1.5">
                          {plan.features.map((f) => (
                            <li key={f} className="flex items-start gap-1.5 text-sm text-muted-foreground">
                              <span className="mt-0.5 text-primary">✓</span> {f}
                            </li>
                          ))}
                        </ul>
                        <NelvyonDsButton
                          variant={isCurrent ? "secondary" : "primary"}
                          size="sm"
                          disabled={isCurrent || upgrading !== null}
                          onClick={() => void handleUpgrade(plan.id)}
                          className="mt-auto w-full"
                        >
                          {upgrading === plan.id
                            ? "Redirigiendo…"
                            : isCurrent
                              ? "Plan actual"
                              : "Cambiar a este plan"}
                        </NelvyonDsButton>
                      </div>
                    );
                  })}
                </div>
              </NelvyonDsCard>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
