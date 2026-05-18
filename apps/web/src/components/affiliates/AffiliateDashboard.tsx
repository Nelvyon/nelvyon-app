"use client";

import { useCallback, useEffect, useState } from "react";

type ConversionStatus = "pending" | "approved" | "paid";

interface ConversionSummary {
  plan: string;
  amount: number;
  commission: number;
  status: ConversionStatus;
  createdAt: string;
}

interface AffiliateProfile {
  code: string;
  totalClicks: number;
  totalConversions: number;
  totalEarned: number;
  pendingPayout: number;
}

interface AffiliateStats {
  profile: AffiliateProfile;
  recentConversions: ConversionSummary[];
  affiliateLink: string;
}

function statusBadgeClass(status: ConversionStatus): string {
  if (status === "approved") return "bg-emerald-100 text-emerald-800";
  if (status === "paid") return "bg-blue-100 text-blue-800";
  return "bg-amber-100 text-amber-800";
}

function statusLabel(status: ConversionStatus): string {
  if (status === "approved") return "Aprobada";
  if (status === "paid") return "Pagada";
  return "Pendiente";
}

function formatEuro(n: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-24 rounded-lg bg-slate-200" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-slate-200" />
        ))}
      </div>
      <div className="h-48 rounded-lg bg-slate-200" />
    </div>
  );
}

export function AffiliateDashboard() {
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/affiliates/profile");
        if (!res.ok) {
          if (!cancelled) setError(res.status === 401 ? "Inicia sesión para ver tu panel." : "No se pudo cargar el panel.");
          return;
        }
        const data = (await res.json()) as { stats: AffiliateStats };
        if (!cancelled) setStats(data.stats);
      } catch {
        if (!cancelled) setError("Error de red al cargar el panel.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const copyLink = useCallback(async () => {
    if (!stats?.affiliateLink) return;
    try {
      await navigator.clipboard.writeText(stats.affiliateLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [stats?.affiliateLink]);

  if (loading) return <LoadingSkeleton />;
  if (error || !stats) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error ?? "No se pudo cargar el panel de afiliados."}
      </p>
    );
  }

  const { profile, recentConversions, affiliateLink } = stats;

  return (
    <div className="space-y-10">
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Tu link de afiliado</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            readOnly
            value={affiliateLink}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
            aria-label="Link de afiliado"
          />
          <button
            type="button"
            onClick={() => void copyLink()}
            className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {copied ? "¡Copiado!" : "Copiar"}
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Estadísticas</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Clics totales" value={String(profile.totalClicks)} />
          <StatCard label="Conversiones" value={String(profile.totalConversions)} />
          <StatCard label="Comisión total ganada" value={formatEuro(profile.totalEarned)} />
          <StatCard label="Pendiente de cobro" value={formatEuro(profile.pendingPayout)} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Últimas conversiones</h2>
        {recentConversions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
            Aún no tienes conversiones. ¡Comparte tu link!
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Plan</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Importe</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Comisión</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {recentConversions.map((c, idx) => (
                  <tr key={`${c.plan}-${c.createdAt}-${idx}`}>
                    <td className="px-4 py-3 text-slate-900">{c.plan}</td>
                    <td className="px-4 py-3 text-slate-700">{formatEuro(c.amount)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatEuro(c.commission)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(c.status)}`}
                      >
                        {statusLabel(c.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Cómo funciona</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          <li className="rounded-lg bg-white p-4 shadow-sm">
            <span className="text-2xl font-bold text-slate-900">1.</span>
            <p className="mt-2 font-medium text-slate-900">Comparte tu link único</p>
            <p className="mt-1 text-sm text-slate-600">Envíalo a clientes, redes o tu web.</p>
          </li>
          <li className="rounded-lg bg-white p-4 shadow-sm">
            <span className="text-2xl font-bold text-slate-900">2.</span>
            <p className="mt-2 font-medium text-slate-900">Tu referido se registra</p>
            <p className="mt-1 text-sm text-slate-600">La cookie guarda tu código durante 30 días.</p>
          </li>
          <li className="rounded-lg bg-white p-4 shadow-sm">
            <span className="text-2xl font-bold text-slate-900">3.</span>
            <p className="mt-2 font-medium text-slate-900">Cobras el 20% de su primer pago</p>
            <p className="mt-1 text-sm text-slate-600">Comisión calculada sobre el importe del plan.</p>
          </li>
        </ol>
        <p className="text-sm text-slate-600">
          Los pagos se procesan mensualmente una vez aprobadas las conversiones.
        </p>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}
