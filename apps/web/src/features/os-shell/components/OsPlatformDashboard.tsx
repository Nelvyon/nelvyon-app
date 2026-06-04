"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowLeftRight,
  CircleDollarSign,
  ClipboardList,
  FileText,
  FolderKanban,
  GitBranch,
  Hammer,
  Loader2,
  Sparkles,
  Trophy,
  Users,
  Wallet,
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
          <h1 className="text-2xl font-semibold text-white">Dashboard ejecutivo</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/55">
            Vista unificada de operación interna NELVYON (
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
            label="Oportunidades abiertas"
            value={data.dealsOpen}
            sub={data.dealsWon !== null ? `${data.dealsWon} ganadas` : null}
            icon={GitBranch}
            emptyLabel="Sin datos todavía"
          />
          <OsMetricCard
            label="Tareas pendientes"
            value={data.tasksPending}
            sub={
              data.tasksOverdue !== null && data.tasksOverdue > 0
                ? `${data.tasksOverdue} vencidas`
                : data.tasksOverdue === 0
                  ? "Ninguna vencida"
                  : null
            }
            icon={ClipboardList}
            emptyLabel="Sin datos todavía"
          />
          <OsMetricCard
            label="Oportunidades ganadas"
            value={data.dealsWon}
            icon={Trophy}
            emptyLabel="Sin datos todavía"
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
            label="Ingresos del mes"
            value={
              data.incomeMonth !== null
                ? `${data.incomeMonth.toLocaleString("es-ES")} EUR`
                : null
            }
            sub="Facturas cobradas (invoices)"
            icon={CircleDollarSign}
            emptyLabel="Sin datos todavía"
          />
          <OsMetricCard
            label="Facturas pendientes"
            value={data.invoicesPendingCount}
            sub={
              data.contractsActiveCount !== null
                ? `${data.contractsActiveCount} contratos activos`
                : null
            }
            icon={FileText}
            emptyLabel="Sin datos todavía"
          />
          <OsMetricCard
            label="Gastos del mes"
            value={
              data.expensesMonth !== null
                ? `${data.expensesMonth.toLocaleString("es-ES")} EUR`
                : null
            }
            sub={
              data.expensesPendingCount !== null
                ? `${data.expensesPendingCount} pendientes`
                : null
            }
            icon={Wallet}
            emptyLabel="Sin datos todavía"
          />
          <OsMetricCard
            label="Flujo de caja (mes)"
            value={
              data.cashflowMonth !== null
                ? `${data.cashflowMonth.toLocaleString("es-ES")} EUR`
                : null
            }
            sub="Ingresos cobrados − gastos pagados"
            icon={ArrowLeftRight}
            emptyLabel="Sin datos todavía"
          />
          <OsMetricCard
            label={canBilling ? "Suscripción YTD" : "Plataforma"}
            value={
              canBilling && data.billingPaidYtd !== null
                ? `${data.billingPaidYtd.toLocaleString()} ${data.billingCurrency ?? "EUR"}`
                : canBilling
                  ? null
                  : "Sin permiso"
            }
            sub={canBilling ? "Pagos billing (no ingresos cliente)" : "Ver /os/finanzas"}
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

        <section className="rounded-xl border border-white/10 bg-[#0b1428] p-5">
          <h2 className="text-sm font-semibold text-white">Actividad reciente</h2>
          {data.recentActivity.length === 0 ? (
            <p className="mt-4 text-sm text-white/40">Sin datos todavía</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.recentActivity.map((a, i) => (
                <li
                  key={`${a.kind}-${a.label}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm"
                >
                  <span className="text-white/80">
                    <span className="text-white/40">{a.kind} · </span>
                    {a.href ? (
                      <Link href={a.href} className="hover:text-[#0084FF]">
                        {a.label}
                      </Link>
                    ) : (
                      a.label
                    )}
                  </span>
                  <span className="text-white/45">{a.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

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
            href="/os/pipeline"
            className="rounded-lg border border-white/10 px-4 py-2 text-white/80 hover:border-[#0084FF]/40"
          >
            Pipeline
          </Link>
          <Link
            href="/os/tareas"
            className="rounded-lg border border-white/10 px-4 py-2 text-white/80 hover:border-[#0084FF]/40"
          >
            Tareas
          </Link>
          <Link
            href="/os/finanzas"
            className="rounded-lg border border-white/10 px-4 py-2 text-white/80 hover:border-[#0084FF]/40"
          >
            Finanzas
          </Link>
          <Link
            href="/os/ia"
            className="rounded-lg border border-white/10 px-4 py-2 text-white/80 hover:border-[#0084FF]/40"
          >
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              IA operativa
            </span>
          </Link>
          <Link
            href="/os/agents"
            className="rounded-lg border border-white/10 px-4 py-2 text-white/80 hover:border-[#0084FF]/40"
          >
            Catálogo agentes
          </Link>
        </div>
      </div>
    </OsShellLayout>
  );
}
