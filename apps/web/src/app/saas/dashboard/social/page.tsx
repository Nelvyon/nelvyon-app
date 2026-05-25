"use client";

import { useCallback, useEffect, useState } from "react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { socialPublishApi } from "@/features/social-publish/api";

const CLIENT_ID = "ws-client-1";

export default function SocialAutoPublishPage() {
  const [enabled, setEnabled] = useState(false);
  const [frequency, setFrequency] = useState("weekly");
  const [sector, setSector] = useState("servicios");
  const [preview, setPreview] = useState<{ caption: string; image_url: string; platform: string } | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, { reach: number; likes: number; comments: number }>>({});
  const [calendar, setCalendar] = useState<Array<Record<string, unknown>>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [settings, cal, stats] = await Promise.all([
        socialPublishApi.getSettings(CLIENT_ID),
        socialPublishApi.calendar(CLIENT_ID),
        socialPublishApi.analytics(CLIENT_ID),
      ]);
      setEnabled(settings.enabled);
      setFrequency(settings.frequency);
      setSector(settings.sector);
      setCalendar(cal.items ?? []);
      setAnalytics(stats.by_platform ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveSettings = async () => {
    setBusy(true);
    try {
      await socialPublishApi.updateSettings({
        client_id: CLIENT_ID,
        enabled,
        frequency,
        sector,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  };

  const runPreview = async () => {
    setBusy(true);
    try {
      const res = await socialPublishApi.preview({ client_id: CLIENT_ID, sector, platform: "instagram" });
      setPreview(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error en preview");
    } finally {
      setBusy(false);
    }
  };

  const publishNow = async () => {
    setBusy(true);
    try {
      await socialPublishApi.publishNow({
        client_id: CLIENT_ID,
        sector,
        platforms: ["instagram", "twitter", "linkedin"],
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al publicar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Social — Publicación automática</h1>
        <p className="text-sm text-slate-500">RRSS con copy e imagen generados por IA (F61)</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">Publicación automática</span>
            <button
              className={`relative h-7 w-12 rounded-full transition ${enabled ? "bg-[#0066FF]" : "bg-slate-300"}`}
              onClick={() => setEnabled((v) => !v)}
              type="button"
              aria-pressed={enabled}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${enabled ? "left-5" : "left-0.5"}`}
              />
            </button>
          </div>
          <label className="block text-sm text-slate-600">
            Frecuencia
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              <option value="daily">Diario</option>
              <option value="3x_week">3× semana</option>
              <option value="weekly">Semanal</option>
            </select>
          </label>
          <label className="block text-sm text-slate-600">
            Sector
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
            />
          </label>
          <button
            className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            disabled={busy}
            onClick={saveSettings}
            type="button"
          >
            Guardar ajustes
          </button>
          <button
            className="w-full rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50"
            disabled={busy}
            onClick={runPreview}
            type="button"
          >
            Preview del post
          </button>
          <button
            className="w-full rounded-lg bg-[#0066FF] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            disabled={busy}
            onClick={publishNow}
            type="button"
          >
            Publicar ahora
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="space-y-4">
          {preview ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-slate-500">{preview.platform}</p>
              {preview.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" className="mt-2 max-h-48 w-full rounded-lg object-cover" src={preview.image_url} />
              ) : null}
              <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">{preview.caption}</p>
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800">Analytics por red</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {Object.entries(analytics).length === 0 ? (
                <p className="text-sm text-slate-400 col-span-3">Sin métricas aún — publica un post</p>
              ) : (
                Object.entries(analytics).map(([plat, m]) => (
                  <div key={plat} className="rounded-lg border border-slate-100 p-3 text-sm">
                    <p className="font-medium capitalize text-slate-800">{plat}</p>
                    <p className="text-slate-500">Alcance: {m.reach}</p>
                    <p className="text-slate-500">Likes: {m.likes}</p>
                    <p className="text-slate-500">Comentarios: {m.comments}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800">Calendario</h3>
            <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-sm text-slate-600">
              {calendar.length === 0 ? (
                <li className="text-slate-400">Vacío</li>
              ) : (
                calendar.map((item) => (
                  <li key={String(item.id)} className="border-b border-slate-50 pb-2">
                    {String(item.platform)} — {String(item.status)}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
