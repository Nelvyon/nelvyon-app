"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { NelvyonDsBadge, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type SettingsSummary = {
  tenant: {
    companyName: string;
    industry: string;
    plan: "starter" | "pro" | "enterprise";
    website: string | null;
    phone: string | null;
    employees: string | null;
  };
  role: string;
  permissions: string[];
};

export default function SaasSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SettingsSummary | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/saas/settings", { credentials: "same-origin" });
        if (res.status === 401) {
          router.replace("/auth/login?next=/saas/settings");
          return;
        }
        if (!res.ok) throw new Error("No se pudo cargar la configuración");
        setData((await res.json()) as SettingsSummary);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <SaasSidebar activeId="settings" tenantCompany={data?.tenant.companyName} tenantPlan={data?.tenant.plan} />
        <main className="space-y-6">
          <NelvyonDsSectionHeader title="Configuración" subtitle="Perfil del tenant, rol y permisos efectivos." />
          {loading ? <NelvyonDsCard>Cargando…</NelvyonDsCard> : null}
          {error ? <NelvyonDsCard className="text-sm text-destructive">{error}</NelvyonDsCard> : null}
          {data ? (
            <>
              <NelvyonDsCard title="Tenant">
                <dl className="grid gap-2 text-sm">
                  <div><dt className="text-muted-foreground">Empresa</dt><dd className="font-medium">{data.tenant.companyName}</dd></div>
                  <div><dt className="text-muted-foreground">Industria</dt><dd>{data.tenant.industry}</dd></div>
                  <div><dt className="text-muted-foreground">Plan</dt><dd><NelvyonDsBadge tone="primary">{data.tenant.plan}</NelvyonDsBadge></dd></div>
                  <div><dt className="text-muted-foreground">Web</dt><dd>{data.tenant.website ?? "—"}</dd></div>
                  <div><dt className="text-muted-foreground">Teléfono</dt><dd>{data.tenant.phone ?? "—"}</dd></div>
                </dl>
              </NelvyonDsCard>
              <NelvyonDsCard title="Acceso">
                <p className="text-sm">Rol: <strong>{data.role}</strong></p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Permisos: {data.permissions.join(", ")}
                </p>
              </NelvyonDsCard>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
