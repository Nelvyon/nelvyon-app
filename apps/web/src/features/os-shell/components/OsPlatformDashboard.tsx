"use client";

import Link from "next/link";
import {
  AlertCircle,
  CircleDollarSign,
  FolderKanban,
  Hammer,
  Loader2,
  Users,
  Workflow,
} from "lucide-react";

import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";
import { OsMetricCard } from "@/features/os-shell/components/OsMetricCard";
import { useOsPlatformDashboard } from "@/features/os-shell/hooks/useOsPlatformDashboard";

export function OsPlatformDashboard() {
  const { data, loading, reload, canBilling } = useOsPlatformDashboard();

  return (
    <OsShellLayout onRefresh={() => void reload()} refreshing={loading}>
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard operativo</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/55">
            Datos de operación interna NELVYON (
            <code className="text-[#0084FF]">nelvyon_*</code>
            ). No usa contactos SaaS del cliente (
            <code className="text-white/40">saas_contacts</code>
            ).
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Loader2 className="h-5 w-5 animate-spin text-[#0084FF]" />
            Cargando métricas del workspace…
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <OsMetricCard
            label="Clientes internos"
            value={data.clientsTotal}
            sub={
              data.clientsActive !== null
                ? `${data.clientsActive} activos (muestra)`
                : null
            }
            icon={Users}
          />
          <OsMetricCard
            label="Proyectos activos"
            value={data.projectsActive}
            sub={
              data.projectsTotal !== null ? `${data.projectsTotal} totales` : null
            }
            icon={FolderKanban}
          />
          <OsMetricCard
            label="Entregas pendientes"
            value={data.outputsPending}
            sub={
              data.outputsTotal !== null ? `${data.outputsTotal} outputs en workspace` : null
            }
            icon={Hammer}
          />
          <OsMetricCard
            label="Automatizaciones"
            value={data.automationTotal}
            sub={
              data.automationPending !== null
                ? `${data.automationPending} pendientes · ${data.automationFailed ?? 0} fallidas`
                : null
            }
            icon={Workflow}
          />
          <OsMetricCard
            label="QA pass rate"
            value={data.qaPassRate !== null ? `${data.qaPassRate}%` : null}
            icon={AlertCircle}
          />
          <OsMetricCard
            label={canBilling ? "Pagado YTD" : "Finanzas"}
            value={
              canBilling && data.billingPaidYtd !== null
                ? `${data.billingPaidYtd.toLocaleString()} ${data.billingCurrency ?? "EUR"}`
                : canBilling
                  ? null
                  : "Sin permiso billing"
            }
            sub={
              canBilling && data.invoiceCount !== null
                ? `${data.invoiceCount} facturas listadas`
                : !canBilling
                  ? "Rol sin acceso a facturación"
                  : null
            }
            icon={CircleDollarSign}
            emptyLabel={canBilling ? "Sin datos todavía" : "Sin permiso billing"}
          />
        </div>

        {data.errors.length > 0 ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
            <p className="font-medium">Algunas fuentes no respondieron</p>
            <ul className="mt-2 list-inside list-disc text-xs opacity-90">
              {data.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-white/10 bg-[#0b1428] p-5">
            <h2 className="text-sm font-semibold text-white">Actividad — jobs</h2>
            {data.recentJobs.length === 0 ? (
              <p className="mt-4 text-sm text-white/40">Sin datos todavía</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {data.recentJobs.map((j) => (
                  <li
                    key={j.id}
                    className="flex justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm"
                  >
                    <span className="text-white/80">{j.job_type}</span>
                    <span className="text-white/45">{j.status}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/os"
              className="mt-4 inline-block text-xs text-[#0084FF] hover:underline"
            >
              Hub operaciones (automatización) →
            </Link>
          </section>
          <section className="rounded-xl border border-white/10 bg-[#0b1428] p-5">
            <h2 className="text-sm font-semibold text-white">Actividad — entregas</h2>
            {data.recentOutputs.length === 0 ? (
              <p className="mt-4 text-sm text-white/40">Sin datos todavía</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {data.recentOutputs.map((o) => (
                  <li
                    key={o.id}
                    className="flex justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm"
                  >
                    <span className="truncate text-white/80">{o.title}</span>
                    <span className="shrink-0 text-white/45">{o.qa_status ?? "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/os/clientes"
            className="rounded-lg border border-white/10 px-4 py-2 text-white/80 hover:border-[#0084FF]/40"
          >
            Clientes internos
          </Link>
          <Link
            href="/os/proyectos"
            className="rounded-lg border border-white/10 px-4 py-2 text-white/80 hover:border-[#0084FF]/40"
          >
            Proyectos
          </Link>
          <Link
            href="/os/agents"
            className="rounded-lg border border-white/10 px-4 py-2 text-white/80 hover:border-[#0084FF]/40"
          >
            Agentes IA
          </Link>
        </div>
      </div>
    </OsShellLayout>
  );
}
