"use client";

import type { StoreAnalytics } from "@/features/ecommerce/types";

export function EcommerceMockBadge({ mock }: { mock?: boolean }) {
  if (!mock) return null;
  return (
    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
      Datos demo
    </span>
  );
}

export function EcommerceMetricCard({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{loading ? "…" : value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function CartCheckoutChart({ analytics }: { analytics?: StoreAnalytics }) {
  const pending = analytics?.pending_orders ?? 0;
  const paid = analytics?.orders_by_status?.paid?.count ?? 0;
  const total = pending + paid;
  if (!total) {
    return <p className="text-sm text-muted-foreground">Sin datos de carrito y checkout aún.</p>;
  }
  const paidPct = Math.round((paid / total) * 100);
  const pendingPct = 100 - paidPct;
  return (
    <div className="space-y-3">
      <div className="flex h-8 overflow-hidden rounded-lg">
        <div className="bg-primary/80" style={{ width: `${paidPct}%` }} title={`Checkout completado: ${paid}`} />
        <div className="bg-muted" style={{ width: `${pendingPct}%` }} title={`Carrito pendiente: ${pending}`} />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Checkout completado</dt>
          <dd className="font-semibold tabular-nums">{paid}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Carritos pendientes</dt>
          <dd className="font-semibold tabular-nums">{pending}</dd>
        </div>
      </dl>
    </div>
  );
}

export function StoreFunnelSteps() {
  const steps = [
    { name: "Tráfico", desc: "Publicidad y campañas email" },
    { name: "Catálogo", desc: "Landing y productos" },
    { name: "Carrito", desc: "Añadir y revisar" },
    { name: "Checkout", desc: "Pago con Stripe" },
  ];
  return (
    <ol className="relative space-y-3 border-l-2 border-primary/30 pl-6">
      {steps.map((step, i) => (
        <li className="relative" key={step.name}>
          <span className="absolute -left-[1.6rem] flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {i + 1}
          </span>
          <p className="font-medium">{step.name}</p>
          <p className="text-xs text-muted-foreground">{step.desc}</p>
        </li>
      ))}
    </ol>
  );
}
