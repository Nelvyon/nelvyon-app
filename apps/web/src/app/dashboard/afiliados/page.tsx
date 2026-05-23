"use client";

import { Copy, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { dashboardAffiliatesApi } from "@/features/dashboard/api";
import { DashboardTabs, MetricGrid, DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable } from "@/features/dashboard/components/DashboardTabs";

export default function AfiliadosDashboardPage() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [payouts, setPayouts] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [registering, setRegistering] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, payoutsRes] = await Promise.all([
        dashboardAffiliatesApi.stats(),
        dashboardAffiliatesApi.payouts(),
      ]);
      setStats(statsRes);
      setPayouts((payoutsRes.payouts as Record<string, unknown>[]) ?? []);
    } catch {
      setStats(null);
      setPayouts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function register() {
    setRegistering(true);
    try {
      await dashboardAffiliatesApi.register();
      await load();
    } finally {
      setRegistering(false);
    }
  }

  async function copyLink() {
    const link = String(stats?.affiliate_link ?? "");
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const metrics = stats
    ? [
        { label: "Clicks", value: String(stats.clicks ?? 0) },
        { label: "Conversiones", value: String(stats.conversions ?? 0) },
        { label: "Ganancias totales", value: `${String(stats.total_earnings ?? 0)} €` },
        { label: "Pendiente de pago", value: `${String(stats.pending_payout ?? 0)} €` },
      ]
    : [];

  if (!stats && !loading) {
    return (
      <ProtectedLayout module="os">
      <DashboardPageTransition>
          <div>
            <h1 className="text-2xl font-bold">Afiliados</h1>
            <p className="text-sm text-muted-foreground">Programa de referidos — gana comisiones por cada cliente</p>
          </div>
          <div className="rounded-xl border border-dashed p-8 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-40" />
            <p className="mb-4 text-muted-foreground">Aún no estás registrado en el programa de afiliados.</p>
            <Button disabled={registering} onClick={register}>
              {registering ? "Registrando…" : "Registrarme como afiliado"}
            </Button>
          </div>
        </DashboardPageTransition>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout module="os">
      <DashboardPageTransition>
        <div>
          <h1 className="text-2xl font-bold">Afiliados</h1>
          <p className="text-sm text-muted-foreground">Comparte tu enlace y gana comisiones</p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium">Tu enlace de referido</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <code className="flex-1 break-all rounded bg-muted px-3 py-2 text-sm">
              {String(stats?.affiliate_link ?? "—")}
            </code>
            <Button onClick={copyLink} size="sm" variant="outline">
              <Copy className="mr-2 h-4 w-4" /> {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Código: {String(stats?.code ?? "—")} · Estado: {String(stats?.status ?? "—")}
          </p>
        </div>

        <MetricGrid items={metrics} loading={loading} />

        <DashboardListShell
          empty={!loading && payouts.length === 0}
          emptyDescription="Los pagos por referidos aparecerán cuando generes comisiones."
          emptyTitle="Sin pagos registrados"
          loading={loading}
          skeleton={<SkeletonTable />}
        >
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left">
                  <th className="p-3">ID</th>
                  <th className="p-3">Importe</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p, i) => (
                  <tr className="border-b transition-colors hover:bg-muted/50" key={String(p.id ?? i)}>
                    <td className="p-3">{String(p.id ?? "—")}</td>
                    <td className="p-3">{String(p.amount ?? p.total ?? "—")} €</td>
                    <td className="p-3">{String(p.status ?? "—")}</td>
                    <td className="p-3">
                      {p.created_at ? new Date(String(p.created_at)).toLocaleDateString("es-ES") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardListShell>
      </DashboardPageTransition>
    </ProtectedLayout>
  );
}
