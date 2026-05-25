"use client";

import { useCallback, useEffect, useState } from "react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { intentDataApi } from "@/features/intent-data/api";

type HotLead = {
  lead_id: string;
  lead_name?: string;
  company?: string;
  score: number;
  tier?: string;
  signals?: string[];
};

export default function IntentDataPage() {
  const [hot, setHot] = useState<HotLead[]>([]);
  const [dist, setDist] = useState<Record<string, number>>({ cold: 0, warm: 0, hot: 0 });
  const [alerts, setAlerts] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [h, d, a] = await Promise.all([
      intentDataApi.hotLeads(70),
      intentDataApi.distribution(),
      intentDataApi.getAlerts(),
    ]);
    setHot((h.leads ?? []) as HotLead[]);
    setDist(d.distribution ?? { cold: 0, warm: 0, hot: 0 });
    setAlerts(!!a.alerts_enabled);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const seedHot = async () => {
    setBusy(true);
    await intentDataApi.track({
      lead_id: "lead-hot-1",
      event_type: "pageview",
      page: "/pricing",
      lead_name: "Ana Intent",
      company: "Growth SL",
    });
    await intentDataApi.track({ lead_id: "lead-hot-1", event_type: "email_open" });
    await intentDataApi.track({ lead_id: "lead-hot-1", event_type: "click" });
    await load();
    setBusy(false);
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold text-slate-900">Intent Data</h1>
      <p className="mb-4 text-sm text-slate-500">Hot leads y señales de compra</p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input checked={alerts} onChange={(e) => void intentDataApi.setAlerts(e.target.checked).then(load)} type="checkbox" />
          Alertas email hot leads
        </label>
        <button className="rounded-lg border px-3 py-1 text-sm" disabled={busy} onClick={() => void seedHot()} type="button">
          Simular hot lead
        </button>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        {(["cold", "warm", "hot"] as const).map((t) => (
          <div className="rounded-xl border bg-white p-4 shadow-sm" key={t}>
            <p className="text-xs uppercase text-slate-500">{t}</p>
            <p className="text-2xl font-semibold">{dist[t] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-800">Hot leads (score ≥ 70)</h2>
        <ul className="mt-3 divide-y">
          {hot.map((l) => (
            <li className="flex flex-wrap items-center justify-between gap-2 py-3" key={l.lead_id}>
              <div>
                <p className="font-medium">{l.lead_name || l.lead_id}</p>
                <p className="text-xs text-slate-500">{l.company} · score {l.score}</p>
                <p className="text-xs text-slate-400">{(l.signals || []).join(" · ")}</p>
              </div>
              <button
                className="rounded-lg bg-[#0066FF] px-3 py-1 text-xs text-white"
                onClick={() => void intentDataApi.triggerSequence(l.lead_id).then(load)}
                type="button"
              >
                Disparar secuencia
              </button>
            </li>
          ))}
        </ul>
      </div>
    </DashboardLayout>
  );
}
