"use client";

import Link from "next/link";
import { ArrowLeftRight, FileText, HandCoins, Loader2, Receipt, ScrollText, Wallet } from "lucide-react";

import { useAuth } from "@/core/auth/AuthContext";
import { can } from "@/core/routing/roleMatrix";
import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";
import { OsMetricCard } from "@/features/os-shell/components/OsMetricCard";
import {
  OsEmptyState,
  OsErrorBanner,
  OsPageHeader,
  OsStatusBadge,
  OsTable,
} from "@/features/os-shell/components/ui/OsUi";

import { parseAmount } from "./compute";
import { OsExpensesSection } from "./OsExpensesSection";
import { useOsFinanzas } from "./useOsFinanzas";

function fmtMoney(n: number | null, currency: string) {
  if (n === null) return null;
  return `${n.toLocaleString("es-ES", { maximumFractionDigits: 2 })} ${currency}`;
}

function invoiceStatusTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  switch ((status ?? "").toLowerCase()) {
    case "paid":
      return "success";
    case "sent":
      return "warning";
    case "cancelled":
      return "danger";
    case "draft":
      return "neutral";
    default:
      return "info";
  }
}

export function OsFinanzasView() {
  const { user } = useAuth();
  const canBilling = user ? can(user.role, "billing", "view") : false;
  const { data, loading, reload } = useOsFinanzas(canBilling);

  const hasAnyData =
    data.invoices.length > 0 ||
    data.contracts.length > 0 ||
    data.expenses.length > 0 ||
    data.cashflowLedger.length > 0 ||
    (data.dealsWonCount ?? 0) > 0 ||
    data.invoiceStats !== null ||
    data.billingSummary !== null;

  return (
    <OsShellLayout onRefresh={() => void reload()} refreshing={loading}>
      <OsPageHeader
        title="Finanzas operativas"
        description="Ingresos de facturas españolas (invoices), contratos y pipeline OS. Pagos de suscripción plataforma (billing) separados del CRM SaaS cliente."
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Loader2 className="h-5 w-5 animate-spin text-[#0084FF]" />
          Cargando finanzas…
        </div>
      ) : null}

      {data.errors.length > 0 ? (
        <OsErrorBanner
          message={`Algunas fuentes no respondieron: ${data.errors.slice(0, 3).join("; ")}`}
        />
      ) : null}

      {!loading && !hasAnyData ? (
        <OsEmptyState
          title="Sin datos todavía"
          description="Crea facturas en el módulo de facturación, contratos en entities/contracts u oportunidades ganadas en el pipeline OS."
        />
      ) : null}

      {!loading && hasAnyData ? (
        <>
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/45">
              Resumen financiero
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <OsMetricCard
                label="Ingresos del mes"
                value={fmtMoney(data.incomeMonth, data.currency)}
                sub="Facturas cobradas (paid)"
                icon={HandCoins}
                emptyLabel="Sin datos todavía"
              />
              <OsMetricCard
                label="Ingresos del año"
                value={fmtMoney(data.incomeYear, data.currency)}
                sub="Facturas paid en año natural"
                icon={Receipt}
                emptyLabel="Sin datos todavía"
              />
              <OsMetricCard
                label="Facturas pendientes"
                value={data.invoicesPendingCount}
                sub={
                  data.invoicesPendingAmount !== null
                    ? fmtMoney(data.invoicesPendingAmount, data.currency) ?? undefined
                    : undefined
                }
                icon={FileText}
                emptyLabel="Sin datos todavía"
              />
              <OsMetricCard
                label="Contratos activos"
                value={data.contractsActiveCount}
                sub={
                  data.contracts.length > 0
                    ? `${data.contracts.length} totales`
                    : undefined
                }
                icon={ScrollText}
                emptyLabel="Sin datos todavía"
              />
              <OsMetricCard
                label="Gastos del mes"
                value={fmtMoney(data.expensesMonth, data.currency)}
                sub={
                  data.expensesPendingCount !== null
                    ? `${data.expensesPendingCount} pendientes`
                    : undefined
                }
                icon={Wallet}
                emptyLabel="Sin datos todavía"
              />
              <OsMetricCard
                label="Flujo de caja (mes)"
                value={fmtMoney(data.cashflowMonth, data.currency)}
                sub="Ingresos cobrados − gastos pagados"
                icon={ArrowLeftRight}
                emptyLabel="Sin datos todavía"
              />
            </div>
          </section>

          <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <OsMetricCard
              label="Pipeline ganado"
              value={
                data.dealsWonValue !== null
                  ? fmtMoney(data.dealsWonValue, data.currency)
                  : null
              }
              sub={
                data.dealsWonCount !== null ? `${data.dealsWonCount} oportunidades` : undefined
              }
              icon={HandCoins}
              emptyLabel="Sin datos todavía"
            />
            <OsMetricCard
              label="Clientes activos"
              value={data.clientsActive}
              icon={FileText}
              emptyLabel="Sin datos todavía"
            />
            <OsMetricCard
              label="Proyectos activos"
              value={data.projectsActive}
              icon={ScrollText}
              emptyLabel="Sin datos todavía"
            />
          </section>

          {data.invoiceStats ? (
            <section className="mb-8 rounded-xl border border-white/10 bg-[#0b1428] p-5">
              <h2 className="text-sm font-semibold text-white">Estado de cobros (invoices)</h2>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-white/45">Total facturado</dt>
                  <dd className="text-white">
                    {fmtMoney(data.invoiceStats.total_facturado ?? null, data.currency) ??
                      "Sin datos todavía"}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/45">Pendiente cobro (sent)</dt>
                  <dd className="text-amber-200">
                    {fmtMoney(data.invoiceStats.pendiente ?? null, data.currency) ??
                      "Sin datos todavía"}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/45">Cobrado (paid)</dt>
                  <dd className="text-emerald-300">
                    {fmtMoney(data.invoiceStats.pagado ?? null, data.currency) ??
                      "Sin datos todavía"}
                  </dd>
                </div>
              </dl>
            </section>
          ) : null}

          <OsExpensesSection expenses={data.expenses} onReload={() => void reload()} />

          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-white">Flujo de caja (ledger)</h2>
            {data.cashflowLedger.length === 0 ? (
              <p className="text-sm text-white/40">Sin datos todavía</p>
            ) : (
              <OsTable>
                <thead>
                  <tr className="border-b border-white/10 text-xs text-white/45">
                    <th className="px-4 py-2">Dirección</th>
                    <th className="px-4 py-2">Importe</th>
                    <th className="px-4 py-2">Origen</th>
                    <th className="px-4 py-2">Fecha</th>
                    <th className="px-4 py-2">Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cashflowLedger.slice(0, 40).map((cf) => (
                    <tr key={cf.id} className="border-b border-white/5">
                      <td className="px-4 py-2 text-white">
                        {cf.direction === "in" ? "Entrada" : "Salida"}
                      </td>
                      <td className="px-4 py-2 text-white/80">
                        {fmtMoney(cf.amount, cf.currency ?? data.currency)}
                      </td>
                      <td className="px-4 py-2 text-white/50">{cf.source_type}</td>
                      <td className="px-4 py-2 text-white/50">{cf.flow_date ?? "—"}</td>
                      <td className="px-4 py-2 text-white/60">{cf.description ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </OsTable>
            )}
          </section>

          {canBilling && data.billingSummary ? (
            <section className="mb-8 rounded-xl border border-[#0084FF]/20 bg-[#07122a] p-5">
              <h2 className="text-sm font-semibold text-white">Pagos plataforma (billing)</h2>
              <p className="mt-1 text-xs text-white/45">
                Suscripción NELVYON del workspace — derivado de tabla subscriptions, no de invoices
                españolas.
              </p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-white/45">Plan</dt>
                  <dd className="text-white">
                    {data.billingSummary.plan_label} ({data.billingSummary.plan_id})
                  </dd>
                </div>
                <div>
                  <dt className="text-white/45">Coste mensual</dt>
                  <dd className="text-white">
                    {fmtMoney(data.billingSummary.monthly_cost, data.billingSummary.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/45">Pagado YTD (suscripción)</dt>
                  <dd className="text-white">
                    {fmtMoney(data.billingSummary.total_paid_ytd, data.billingSummary.currency)}
                  </dd>
                </div>
              </dl>
            </section>
          ) : !canBilling ? (
            <p className="mb-8 text-sm text-white/40">
              Sin permiso billing: oculto pagos de suscripción plataforma.
            </p>
          ) : null}

          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-white">Facturas (tabla invoices)</h2>
            {data.invoices.length === 0 ? (
              <p className="text-sm text-white/40">Sin datos todavía</p>
            ) : (
              <OsTable>
                <thead>
                  <tr className="border-b border-white/10 text-xs text-white/45">
                    <th className="px-4 py-2">Número</th>
                    <th className="px-4 py-2">Cliente</th>
                    <th className="px-4 py-2">Total</th>
                    <th className="px-4 py-2">Estado</th>
                    <th className="px-4 py-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.slice(0, 50).map((inv) => (
                    <tr key={inv.id} className="border-b border-white/5">
                      <td className="px-4 py-2 text-white">{inv.invoice_number ?? `#${inv.id}`}</td>
                      <td className="px-4 py-2 text-white/70">{inv.client_name ?? "—"}</td>
                      <td className="px-4 py-2 text-white/80">
                        {fmtMoney(inv.total ?? null, inv.currency ?? data.currency) ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        <OsStatusBadge
                          label={inv.status ?? "—"}
                          tone={invoiceStatusTone(inv.status ?? "")}
                        />
                      </td>
                      <td className="px-4 py-2 text-white/50">
                        {inv.created_at?.slice(0, 10) ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </OsTable>
            )}
            <Link href="/billing" className="mt-2 inline-block text-xs text-[#0084FF] hover:underline">
              Gestión completa en Billing →
            </Link>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-white">Contratos</h2>
            {data.contracts.length === 0 ? (
              <p className="text-sm text-white/40">Sin datos todavía</p>
            ) : (
              <OsTable>
                <thead>
                  <tr className="border-b border-white/10 text-xs text-white/45">
                    <th className="px-4 py-2">Título</th>
                    <th className="px-4 py-2">Cliente</th>
                    <th className="px-4 py-2">Importe</th>
                    <th className="px-4 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.contracts.slice(0, 40).map((c) => (
                    <tr key={c.id} className="border-b border-white/5">
                      <td className="px-4 py-2 text-white">{c.title}</td>
                      <td className="px-4 py-2 text-white/60">{c.client_name ?? "—"}</td>
                      <td className="px-4 py-2 text-white/70">
                        {parseAmount(c.price) !== null
                          ? fmtMoney(parseAmount(c.price), data.currency)
                          : c.price || "—"}
                      </td>
                      <td className="px-4 py-2">
                        <OsStatusBadge label={c.status || "—"} tone="neutral" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </OsTable>
            )}
          </section>
        </>
      ) : null}
    </OsShellLayout>
  );
}
