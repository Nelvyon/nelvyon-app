"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { can } from "@/core/routing/roleMatrix";
import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";
import { OsMetricCard } from "@/features/os-shell/components/OsMetricCard";
import { osPlatformApi } from "@/features/os-shell/api";
import { CircleDollarSign, FileText, Loader2 } from "lucide-react";

export default function OsFinanzasPage() {
  const { user } = useAuth();
  const canBilling = user ? can(user.role, "billing", "view") : false;
  const [loading, setLoading] = useState(true);
  const [paidYtd, setPaidYtd] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [invoiceCount, setInvoiceCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canBilling) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [sum, inv] = await Promise.all([
          osPlatformApi.billingSummary(),
          osPlatformApi.billingInvoices(),
        ]);
        if (!cancelled) {
          setPaidYtd(sum.total_paid_ytd);
          setCurrency(sum.currency);
          setInvoiceCount(inv.invoices?.length ?? 0);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "Error cargando facturación");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canBilling]);

  return (
    <OsShellLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Finanzas</h1>
          <p className="mt-2 text-sm text-white/55">
            Solo datos reales del módulo billing del workspace. Facturación SaaS del cliente final
            es un dominio distinto.
          </p>
        </div>
        {!canBilling ? (
          <p className="text-sm text-white/45">Sin permiso de billing para este rol.</p>
        ) : null}
        {canBilling && loading ? (
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Loader2 className="h-5 w-5 animate-spin text-[#0084FF]" />
            Cargando…
          </div>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        {canBilling && !loading && !error ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <OsMetricCard
              label="Pagado YTD"
              value={
                paidYtd !== null
                  ? `${paidYtd.toLocaleString()} ${currency ?? ""}`
                  : null
              }
              icon={CircleDollarSign}
            />
            <OsMetricCard
              label="Facturas"
              value={invoiceCount}
              icon={FileText}
            />
          </div>
        ) : null}
        {canBilling && !loading && !error && paidYtd === null && invoiceCount === null ? (
          <p className="text-sm text-white/40">Sin datos todavía</p>
        ) : null}
      </div>
    </OsShellLayout>
  );
}
