"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { AdminSidebar } from "../_components/AdminSidebar";

type AdminTenant = {
  id: string;
  companyName: string;
  userEmail: string;
  plan: "starter" | "pro" | "enterprise";
  jobsCount: number;
  createdAt: string;
};

export default function AdminTenantsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState<"" | "starter" | "pro" | "enterprise">("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (plan) params.set("plan", plan);
    const res = await fetch(`/api/admin/tenants?${params.toString()}`, { credentials: "same-origin" });
    if (res.status === 401) {
      router.replace(`/auth/login?next=${encodeURIComponent("/admin/tenants")}`);
      return;
    }
    if (res.status === 403) {
      setTenants([]);
      setLoading(false);
      return;
    }
    const body = (await res.json()) as { tenants: AdminTenant[] };
    setTenants(body.tenants ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => tenants, [tenants]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <AdminSidebar />
        <main className="space-y-6">
          <NelvyonDsSectionHeader title="Tenants" subtitle="Gestion y monitoreo de clientes SaaS" />
          <div className="flex flex-wrap gap-2">
            <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Buscar empresa" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="rounded-md border bg-background px-3 py-2 text-sm" value={plan} onChange={(e) => setPlan(e.target.value as "" | "starter" | "pro" | "enterprise")}>
              <option value="">Todos los planes</option>
              <option value="starter">starter</option>
              <option value="pro">pro</option>
              <option value="enterprise">enterprise</option>
            </select>
            <NelvyonDsButton onClick={() => void load()}>Aplicar</NelvyonDsButton>
          </div>
          {loading ? (
            <NelvyonDsCard>Cargando tenants...</NelvyonDsCard>
          ) : rows.length === 0 ? (
            <NelvyonDsCard className="text-sm text-muted-foreground">Sin resultados para los filtros actuales.</NelvyonDsCard>
          ) : (
            <div className="space-y-2">
              {rows.map((t) => (
                <NelvyonDsCard key={t.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="font-semibold text-foreground">{t.companyName}</div>
                    <div className="text-sm text-muted-foreground">{t.userEmail}</div>
                    <div className="text-xs text-muted-foreground">Registro: {new Date(t.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <NelvyonDsBadge>{t.plan}</NelvyonDsBadge>
                    <NelvyonDsBadge>jobs: {t.jobsCount}</NelvyonDsBadge>
                    <Link href={`/admin/tenants/${t.id}`}>
                      <NelvyonDsButton>Ver detalle</NelvyonDsButton>
                    </Link>
                  </div>
                </NelvyonDsCard>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
