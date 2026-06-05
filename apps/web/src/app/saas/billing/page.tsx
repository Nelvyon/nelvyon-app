"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
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

export default function SaasBillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BillingSummary | null>(null);

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
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const activeId: SaasNavId = "billing";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <SaasSidebar activeId={activeId} tenantCompany={data?.tenant.companyName} tenantPlan={data?.tenant.plan as "starter" | "pro" | "enterprise" | undefined} />
        <main className="space-y-6">
          <NelvyonDsSectionHeader title="Facturación y plan" subtitle="Uso real del tenant y límites del plan activo." />
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
              <SaasEmptyState
                title="Gestión de suscripción"
                description="Para cambiar de plan o métodos de pago, usa el portal de facturación del workspace."
                action={
                  <NelvyonDsButton asChild variant="secondary">
                    <a href="/dashboard/settings">Abrir portal de facturación</a>
                  </NelvyonDsButton>
                }
              />
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
