"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { NelvyonDsBadge } from "@/design-system/components";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { SaasShellLayout, DarkCard } from "@/features/saas-shell/components/SaasShellLayout";
import { saasRoleLabel } from "@/features/saas-shell/saasPermissions";
import { useSaasPermissions } from "@/features/saas-shell/useSaasPermissions";

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
  const { role: hookRole } = useSaasPermissions();
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

  const displayRole = data?.role ?? hookRole;

  return (
    <SaasShellLayout
      sidebar={<SaasSidebar activeId="settings" tenantCompany={data?.tenant.companyName} tenantPlan={data?.tenant.plan} />}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#0084ff]/70">Cuenta</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Configuración</h1>
        <p className="mt-0.5 text-sm text-white/40">Perfil del tenant, rol y permisos efectivos.</p>
      </div>

      {loading ? <DarkCard><p className="text-sm text-white/40">Cargando…</p></DarkCard> : null}
      {error ? <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">{error}</div> : null}

      {data ? (
        <>
          <DarkCard glow>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">Tenant</p>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                { label: "Empresa", value: data.tenant.companyName },
                { label: "Industria", value: data.tenant.industry },
                { label: "Web", value: data.tenant.website ?? "—" },
                { label: "Teléfono", value: data.tenant.phone ?? "—" },
              ].map((row) => (
                <div key={row.label}>
                  <dt className="text-[10px] uppercase tracking-wider text-white/30">{row.label}</dt>
                  <dd className="mt-0.5 font-medium text-white/80">{row.value}</dd>
                </div>
              ))}
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-white/30">Plan</dt>
                <dd className="mt-0.5">
                  <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                    data.tenant.plan === "enterprise" ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25" :
                    data.tenant.plan === "pro" ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25" :
                    "bg-[#0084ff]/15 text-[#0084ff] ring-1 ring-[#0084ff]/25"
                  }`}>{data.tenant.plan}</span>
                </dd>
              </div>
            </dl>
          </DarkCard>

          <DarkCard>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">Tu rol en este tenant</p>
            {displayRole ? (
              <div className="space-y-3">
                <span className="inline-flex rounded-md bg-[#0084ff]/10 px-2.5 py-1 text-sm font-semibold text-[#0084ff] ring-1 ring-[#0084ff]/20">
                  {saasRoleLabel(displayRole)}
                </span>
                <p className="text-sm text-white/40">
                  {displayRole === "viewer"
                    ? "Solo lectura: puedes consultar datos, pero no crear, editar ni eliminar recursos."
                    : displayRole === "member"
                      ? "Miembro: puedes crear y editar contactos y deals. No puedes eliminar recursos críticos ni ver facturación."
                      : "Administración completa del tenant, incluida facturación y eliminación de recursos."}
                </p>
              </div>
            ) : null}
            <div className="mt-4 rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
              <p className="text-[10px] uppercase tracking-wider text-white/25 mb-1">Permisos efectivos</p>
              <p className="text-xs text-white/40 leading-relaxed">{data.permissions.join(", ")}</p>
            </div>
          </DarkCard>
        </>
      ) : null}
    </SaasShellLayout>
  );
}
