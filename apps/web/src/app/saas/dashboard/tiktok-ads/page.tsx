"use client";

import { useCallback, useEffect, useState } from "react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { tiktokAdsApi } from "@/features/tiktok-ads/api";

export default function TikTokAdsPage() {
  const [mock, setMock] = useState(true);
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [campaigns, setCampaigns] = useState<unknown[]>([]);
  const [name, setName] = useState("Campaña TikTok IA");
  const [suggest, setSuggest] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [st, m, c] = await Promise.all([
      tiktokAdsApi.status(),
      tiktokAdsApi.metrics(),
      tiktokAdsApi.campaigns(),
    ]);
    setMock(!!st.mock);
    setMetrics(m);
    setCampaigns(c.campaigns ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold text-slate-900">TikTok Ads</h1>
      <p className="mb-4 text-sm text-slate-500">Campañas y creatividades IA</p>
      <p className="mb-4 text-sm text-slate-500">{mock ? "Modo mock (sin TIKTOK_APP_ID)" : "API TikTok conectada"}</p>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["Impresiones", metrics.impressions ?? 0],
            ["Clicks", metrics.clicks ?? 0],
            ["CTR %", metrics.ctr ?? 0],
            ["ROAS", metrics.roas ?? 0],
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
        <button
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
          onClick={async () => {
            const s = await tiktokAdsApi.suggest({ product: "NELVYON", goal: "conversiones" });
            setSuggest(s);
            await tiktokAdsApi.create({
              name,
              hook: s.hook,
              primary_text: s.primary_text,
            });
            await load();
          }}
          type="button"
        >
          Crear campaña IA
        </button>
      </div>
      {suggest.hook ? (
        <p className="mb-2 text-sm text-slate-600">
          Hook: {suggest.hook} — {suggest.primary_text}
        </p>
      ) : null}
      <ul className="rounded-xl border bg-white p-3 text-sm">
        {campaigns.map((c, i) => (
          <li className="border-b py-2" key={i}>
            {JSON.stringify(c).slice(0, 120)}…
          </li>
        ))}
      </ul>
    </DashboardLayout>
  );
}
