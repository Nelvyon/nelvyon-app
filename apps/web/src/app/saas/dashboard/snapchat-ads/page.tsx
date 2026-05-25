"use client";

import { useCallback, useEffect, useState } from "react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { snapchatAdsApi } from "@/features/snapchat-ads/api";

export default function SnapchatAdsPage() {
  const [mock, setMock] = useState(true);
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [campaigns, setCampaigns] = useState<unknown[]>([]);
  const [name, setName] = useState("Campaña Snapchat IA");
  const [objective, setObjective] = useState("conversions");
  const [suggest, setSuggest] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [st, m, c] = await Promise.all([
      snapchatAdsApi.status(),
      snapchatAdsApi.metrics(),
      snapchatAdsApi.campaigns(),
    ]);
    setMock(!!st.mock);
    setMetrics(m as Record<string, number>);
    setCampaigns(c.campaigns ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold text-slate-900">Snapchat Ads</h1>
      <p className="mb-4 text-sm text-slate-500">Campañas, swipe-ups y creatividades IA</p>
      {mock ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Modo demo — configura SNAPCHAT_CLIENT_ID para API real
        </p>
      ) : (
        <p className="mb-4 text-sm text-green-700">API Snapchat conectada</p>
      )}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {(
          [
            ["Impresiones", metrics.impressions ?? 0],
            ["Swipe-ups", metrics.swipe_ups ?? 0],
            ["CTR %", metrics.ctr ?? 0],
            ["Conversiones", metrics.conversions ?? 0],
            ["Gasto €", metrics.spend ?? 0],
            ["CPM", metrics.cpm ?? 0],
          ] as [string, string | number][]
        ).map(([l, v]) => (
          <div className="rounded-xl border bg-white p-3 shadow-sm" key={l}>
            <p className="text-xs text-slate-500">{l}</p>
            <p className="text-xl font-semibold">{String(v)}</p>
          </div>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input className="rounded border px-2 py-1 text-sm" onChange={(e) => setName(e.target.value)} value={name} />
        <select
          className="rounded border px-2 py-1 text-sm"
          onChange={(e) => setObjective(e.target.value)}
          value={objective}
        >
          <option value="awareness">Awareness</option>
          <option value="traffic">Traffic</option>
          <option value="conversions">Conversions</option>
          <option value="app_install">App install</option>
        </select>
        <button
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
          onClick={async () => {
            const s = await snapchatAdsApi.suggest({ product: "NELVYON", goal: "conversiones" });
            setSuggest(s);
            await snapchatAdsApi.create({
              name,
              objective,
              headline: s.headline,
              visual_description: s.visual_description,
            });
            await load();
          }}
          type="button"
        >
          Crear campaña IA
        </button>
      </div>
      {suggest.headline ? (
        <p className="mb-2 text-sm text-slate-600">
          {suggest.headline} — {suggest.visual_description}
        </p>
      ) : null}
      <ul className="rounded-xl border bg-white p-3 text-sm">
        {campaigns.map((c, i) => (
          <li className="border-b py-2" key={i}>
            {JSON.stringify(c).slice(0, 140)}…
          </li>
        ))}
      </ul>
    </DashboardLayout>
  );
}
