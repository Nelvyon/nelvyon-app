"use client";

import { ArrowRight, Building2, Package, Plus, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import {
  DashboardListShell,
  DashboardPageTransition,
  DashboardTabs,
  MetricGrid,
  SkeletonTable,
} from "@/features/dashboard/components/DashboardTabs";
import { partnersApi, type PartnerHqResponse } from "@/features/partners/api";

export default function PartnerHqPage() {
  const [data, setData] = useState<PartnerHqResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("clients");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await partnersApi.hq();
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = data
    ? [
        { label: "Clientes", value: String(data.metrics.total_clients) },
        { label: "Packs activos", value: String(data.metrics.active_packs) },
        { label: "MRR estimado", value: `€${data.metrics.estimated_mrr_eur.toFixed(0)}` },
        { label: "Margen packs (mes)", value: `€${data.metrics.pack_margin_mtd_eur.toFixed(0)}` },
      ]
    : [];

  return (
    <ProtectedLayout module="os">
      <DashboardPageTransition>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Building2 className="h-7 w-7 text-primary" />
              Partner HQ
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestiona 5–50 clientes, packs Growth y márgenes wholesale desde un solo panel.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/white-label/clients">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo cliente
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/os/packs">
                <Package className="mr-2 h-4 w-4" />
                Lanzar pack
              </Link>
            </Button>
          </div>
        </div>

        <MetricGrid items={metrics} loading={loading} />

        {data && data.metrics.affiliate_earnings_eur > 0 ? (
          <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
            <span className="font-medium">Afiliados:</span> €{data.metrics.affiliate_earnings_eur.toFixed(2)} acumulados
            {data.metrics.affiliate_pending_eur > 0
              ? ` · €${data.metrics.affiliate_pending_eur.toFixed(2)} pendiente`
              : null}
            {" · "}
            <Link className="text-primary underline-offset-2 hover:underline" href="/dashboard/afiliados">
              Ver programa
            </Link>
          </div>
        ) : null}

        <DashboardTabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "clients", label: "Clientes" },
            { id: "packs", label: "Packs activos" },
            { id: "commissions", label: "Comisiones" },
            { id: "wholesale", label: "Precios wholesale" },
          ]}
        />

        {tab === "clients" ? (
          <DashboardListShell
            empty={!loading && (data?.clients.length ?? 0) === 0}
            emptyDescription="Crea sub-workspaces para tus clientes. Heredan tu marca y tú defines el precio final."
            emptyTitle="Sin clientes partner"
            loading={loading}
            skeleton={<SkeletonTable />}
          >
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left">
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Admin</th>
                    <th className="p-3">Workspace</th>
                    <th className="p-3">Pack activo</th>
                    <th className="p-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.clients ?? []).map((c) => (
                    <tr className="border-b transition-colors hover:bg-muted/40" key={c.client_workspace_id}>
                      <td className="p-3 font-medium">{c.client_name}</td>
                      <td className="p-3 text-muted-foreground">{c.admin_email ?? "—"}</td>
                      <td className="p-3">{c.client_workspace_id}</td>
                      <td className="p-3">
                        {c.active_pack_id ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                            {c.active_pack_id}
                            {c.active_pack_status ? ` · ${c.active_pack_status}` : ""}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3">{c.status ?? "active"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DashboardListShell>
        ) : null}

        {tab === "packs" ? (
          <DashboardListShell
            empty={!loading && (data?.packs.length ?? 0) === 0}
            emptyDescription="Ejecuta un Growth Pack desde /os/packs para ver el progreso aquí."
            emptyTitle="Sin packs activos"
            loading={loading}
            skeleton={<SkeletonTable />}
          >
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left">
                    <th className="p-3">Pack</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Margen est.</th>
                    <th className="p-3">Inicio</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.packs ?? []).map((p) => (
                    <tr className="border-b" key={p.id}>
                      <td className="p-3 font-medium">{p.pack_label}</td>
                      <td className="p-3">{p.client_name ?? `WS ${p.workspace_id}`}</td>
                      <td className="p-3">{p.status}</td>
                      <td className="p-3 text-emerald-600">€{p.margin_eur}</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("es-ES")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DashboardListShell>
        ) : null}

        {tab === "commissions" ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {(data?.commissions ?? []).map((c) => (
                <div className="rounded-xl border bg-card p-4" key={c.source}>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.period}</p>
                  <p className="mt-1 font-semibold">{c.label}</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-600">€{c.amount_eur.toFixed(2)}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              P1: márgenes calculados sobre precios wholesale sugeridos. Rebilling Stripe Connect en fase P2.
            </p>
          </div>
        ) : null}

        {tab === "wholesale" && data ? (
          <div className="space-y-6">
            <div className="rounded-xl border p-4">
              <h2 className="flex items-center gap-2 font-semibold">
                <TrendingUp className="h-4 w-4" />
                Suscripción Agency Partner
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Pagas €{data.wholesale.subscription.wholesaleEur}/mes a Nelvyon · incluye{" "}
                {data.wholesale.subscription.includedClientSlots} clientes · +€
                {data.wholesale.subscription.extraClientSlotWholesaleEur}/cliente extra
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border p-4">
                <h3 className="mb-3 font-medium">Planes cliente (wholesale)</h3>
                <ul className="space-y-2 text-sm">
                  {data.wholesale.client_plans.map((p) => (
                    <li className="flex justify-between" key={p.id}>
                      <span>{p.label}</span>
                      <span>
                        €{p.wholesaleEur} → retail €{p.retailEur}{" "}
                        <span className="text-emerald-600">(+€{p.margin_eur})</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border p-4">
                <h3 className="mb-3 font-medium">Growth Packs</h3>
                <ul className="space-y-2 text-sm">
                  {data.wholesale.growth_packs.map((p) => (
                    <li className="flex justify-between gap-2" key={p.id}>
                      <span>{p.label}</span>
                      <span className="text-right">
                        COGS €{p.wholesaleEur} · venta sugerida €{p.suggestedRetailEur}
                        <br />
                        <span className="text-emerald-600">Margen €{p.margin_eur}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link href="/billing">
                Ver facturación
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 rounded-xl border border-dashed p-4 text-sm">
          <Users className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-medium">Flujo recomendado (3 clics)</p>
            <p className="text-muted-foreground">
              1) Crear cliente · 2) Kickoff pack en /os/packs · 3) Invite portal — el cliente ve progreso sin
              pantallas vacías.
            </p>
          </div>
        </div>
      </DashboardPageTransition>
    </ProtectedLayout>
  );
}
