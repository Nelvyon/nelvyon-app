"use client";

import { useCallback, useMemo, useState } from "react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { webBuilderApi, type WebBuilderBriefing } from "@/features/web-builder/api";

const SECTORS = ["servicios", "salud", "legal", "inmobiliaria", "ecommerce", "saas", "hosteleria"];
const SECTIONS = ["hero", "about", "servicios", "testimonios", "contacto", "footer"] as const;

const DEFAULT_BRIEF: WebBuilderBriefing = {
  business_name: "Mi Negocio",
  sector: "servicios",
  primary_color: "#0066FF",
  secondary_color: "#000000",
  description: "Solución profesional con IA para crecer online.",
  city: "Madrid",
  services: ["Consultoría", "Implementación", "Soporte"],
};

export default function WebBuilderDashboardPage() {
  const clientId = "ws-client-1";
  const [brief, setBrief] = useState<WebBuilderBriefing>(DEFAULT_BRIEF);
  const [websiteId, setWebsiteId] = useState<number | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const previewDoc = useMemo(() => {
    if (!previewHtml) return "";
    if (previewHtml.includes("<html")) return previewHtml;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>${previewHtml}</body></html>`;
  }, [previewHtml]);

  const loadHistory = useCallback(async () => {
    const res = await webBuilderApi.history(clientId);
    setHistory(res.items ?? []);
  }, [clientId]);

  const generate = useCallback(
    async (regenerateSection?: string) => {
      setBusy(true);
      setError(null);
      setMessage(null);
      try {
        const res = await webBuilderApi.generate({
          client_id: clientId,
          ...brief,
          regenerate_section: regenerateSection ?? null,
          website_id: websiteId,
        });
        setWebsiteId(res.website_id);
        setPreviewHtml(res.html);
        setSubdomain(res.subdomain);
        setMessage(regenerateSection ? `Sección «${regenerateSection}» regenerada` : "Web generada");
        await loadHistory();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al generar");
      } finally {
        setBusy(false);
      }
    },
    [brief, clientId, loadHistory, websiteId],
  );

  const publish = async () => {
    if (!websiteId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await webBuilderApi.publish(websiteId);
      setMessage(`Publicado en ${res.subdomain}`);
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al publicar");
    } finally {
      setBusy(false);
    }
  };

  const restore = async (id: number) => {
    setBusy(true);
    try {
      const res = await webBuilderApi.restore(clientId, id);
      setWebsiteId(res.website_id);
      setMessage(`Versión restaurada (v${res.version})`);
      await generate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al restaurar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Web Builder IA</h1>
        <p className="text-sm text-slate-500">Genera y publica webs a medida en subdominios nelvyon.com</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Briefing del cliente</h2>
          <label className="block text-sm text-slate-600">
            Nombre del negocio
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={brief.business_name}
              onChange={(e) => setBrief((b) => ({ ...b, business_name: e.target.value }))}
            />
          </label>
          <label className="block text-sm text-slate-600">
            Sector
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={brief.sector}
              onChange={(e) => setBrief((b) => ({ ...b, sector: e.target.value }))}
            >
              {SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-slate-600">
              Color primario
              <input
                type="color"
                className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-slate-200"
                value={brief.primary_color}
                onChange={(e) => setBrief((b) => ({ ...b, primary_color: e.target.value }))}
              />
            </label>
            <label className="block text-sm text-slate-600">
              Color secundario
              <input
                type="color"
                className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-slate-200"
                value={brief.secondary_color}
                onChange={(e) => setBrief((b) => ({ ...b, secondary_color: e.target.value }))}
              />
            </label>
          </div>
          <label className="block text-sm text-slate-600">
            Ciudad
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={brief.city}
              onChange={(e) => setBrief((b) => ({ ...b, city: e.target.value }))}
            />
          </label>
          <label className="block text-sm text-slate-600">
            Descripción
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              rows={3}
              value={brief.description}
              onChange={(e) => setBrief((b) => ({ ...b, description: e.target.value }))}
            />
          </label>
          <button
            className="w-full rounded-lg bg-[#0066FF] py-3 text-sm font-semibold text-white disabled:opacity-50"
            disabled={busy}
            onClick={() => generate()}
            type="button"
          >
            {busy ? "Generando…" : "Generar web con IA"}
          </button>
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map((sec) => (
              <button
                key={sec}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-[#0066FF] disabled:opacity-50"
                disabled={busy || !websiteId}
                onClick={() => generate(sec)}
                type="button"
              >
                Regenerar {sec}
              </button>
            ))}
          </div>
          <button
            className="w-full rounded-lg border border-slate-300 py-3 text-sm font-semibold text-slate-800 disabled:opacity-50"
            disabled={busy || !websiteId}
            onClick={publish}
            type="button"
          >
            Publicar en subdominio
          </button>
          {subdomain ? <p className="text-xs text-slate-500">Subdominio: {subdomain}</p> : null}
          {message ? <p className="text-sm text-green-700">{message}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <p className="border-b border-slate-100 px-4 py-2 text-sm font-medium text-slate-700">Preview</p>
            {previewDoc ? (
              <iframe className="h-[520px] w-full bg-white" sandbox="allow-same-origin" srcDoc={previewDoc} title="Preview web" />
            ) : (
              <p className="p-8 text-center text-sm text-slate-400">Genera una web para ver el preview</p>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Historial de versiones</h3>
              <button className="text-xs text-[#0066FF]" onClick={loadHistory} type="button">
                Actualizar
              </button>
            </div>
            <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm">
              {history.length === 0 ? (
                <li className="text-slate-400">Sin versiones aún</li>
              ) : (
                history.map((h) => (
                  <li className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2" key={String(h.id)}>
                    <span>
                      v{String(h.version)} · {String(h.slug)}
                    </span>
                    <button
                      className="text-xs font-medium text-[#0066FF]"
                      onClick={() => restore(Number(h.id))}
                      type="button"
                    >
                      Restaurar
                    </button>
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
