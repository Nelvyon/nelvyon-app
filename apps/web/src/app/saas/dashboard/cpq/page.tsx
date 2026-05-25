"use client";

import { useCallback, useEffect, useState } from "react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { cpqApi } from "@/features/cpq/api";

export default function CpqPage() {
  const [sector, setSector] = useState("ecommerce");
  const [email, setEmail] = useState("lead@demo.com");
  const [services, setServices] = useState("SEO, Google Ads, Email automation");
  const [budget, setBudget] = useState("500-1500");
  const [size, setSize] = useState("11-50");
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [quotes, setQuotes] = useState<unknown[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await cpqApi.quotes("ws-client-1");
    setQuotes(res.quotes ?? []);
    setStats(res.stats ?? {});
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = async () => {
    setBusy(true);
    try {
      const q = await cpqApi.generate({
        client_id: "ws-client-1",
        lead_email: email,
        sector,
        services: services.split(",").map((s) => s.trim()).filter(Boolean),
        budget_hint: budget,
        company_size: size,
        send_email: true,
      });
      setPreview(q);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold text-slate-900">CPQ — Presupuestos IA</h1>
      <p className="mb-4 text-sm text-slate-500">Configure, Price, Quote automático</p>

      <div className="mb-6 grid gap-3 rounded-xl border bg-white p-4 shadow-sm md:grid-cols-2">
        <input className="rounded border px-2 py-1 text-sm" onChange={(e) => setSector(e.target.value)} placeholder="Sector" value={sector} />
        <input className="rounded border px-2 py-1 text-sm" onChange={(e) => setEmail(e.target.value)} placeholder="Email lead" value={email} />
        <input className="rounded border px-2 py-1 text-sm md:col-span-2" onChange={(e) => setServices(e.target.value)} placeholder="Servicios (coma)" value={services} />
        <input className="rounded border px-2 py-1 text-sm" onChange={(e) => setBudget(e.target.value)} placeholder="Presupuesto cliente" value={budget} />
        <input className="rounded border px-2 py-1 text-sm" onChange={(e) => setSize(e.target.value)} placeholder="Tamaño empresa" value={size} />
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50 md:col-span-2" disabled={busy} onClick={() => void generate()} type="button">
          Generar presupuesto con IA
        </button>
      </div>

      {preview ? (
        <pre className="mb-4 max-h-48 overflow-auto rounded border bg-slate-50 p-3 text-xs">
          {JSON.stringify(preview.price_breakdown ?? preview, null, 2)}
        </pre>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["Enviados", stats.sent_count ?? 0],
            ["Apertura %", stats.open_rate_percent ?? 0],
            ["Aceptación %", stats.acceptance_rate_percent ?? 0],
            ["Valor total €", stats.total_value_eur ?? 0],
          ] as [string, string | number][]
        ).map(([l, v]) => (
          <div className="rounded-lg border bg-white p-3" key={l}>
            <p className="text-xs text-slate-500">{l}</p>
            <p className="text-lg font-semibold">{String(v)}</p>
          </div>
        ))}
      </div>

      <ul className="space-y-2 rounded-xl border bg-white p-3 text-sm">
        {(quotes as Record<string, unknown>[]).map((q) => (
          <li className="flex flex-wrap items-center justify-between gap-2 border-b py-2" key={String(q.id)}>
            <span>
              {String(q.lead_email)} — {String(q.sector)} — {String(q.status)} — {String(q.total_eur)}€
            </span>
            <span className="flex gap-2">
              <button className="text-xs text-blue-600" onClick={() => void cpqApi.send(String(q.id)).then(load)} type="button">
                Reenviar
              </button>
              <button
                className="text-xs text-emerald-600"
                onClick={() => void cpqApi.updateStatus(String(q.id), "accepted").then(load)}
                type="button"
              >
                Aceptado
              </button>
            </span>
          </li>
        ))}
      </ul>
    </DashboardLayout>
  );
}
