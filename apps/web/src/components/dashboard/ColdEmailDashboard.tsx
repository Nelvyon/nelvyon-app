"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  CampaignStats,
  ColdEmailCampaign,
  ColdEmailProspect,
  GenerateSequenceInput,
  GeneratedSequence,
} from "../../../../../backend/saas/ColdEmailService";

type CampaignWithStats = ColdEmailCampaign & { stats: CampaignStats | null };

function badgeClass(status: ColdEmailCampaign["status"]): string {
  if (status === "draft") return "bg-slate-600/40 text-slate-300 border-slate-500/40";
  if (status === "active") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  if (status === "paused") return "bg-amber-500/20 text-amber-200 border-amber-500/40";
  return "bg-indigo-500/20 text-indigo-200 border-indigo-500/40";
}

function prospectBadge(status: ColdEmailProspect["status"]): string {
  if (status === "replied") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  if (status === "sent") return "bg-sky-500/20 text-sky-200 border-sky-500/40";
  return "bg-slate-600/40 text-slate-300 border-slate-500/40";
}

export default function ColdEmailDashboard() {
  const [tab, setTab] = useState<"campaigns" | "new" | "prospects">("campaigns");
  const [statusMsg, setStatusMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [campaigns, setCampaigns] = useState<CampaignWithStats[]>([]);

  const [form, setForm] = useState<GenerateSequenceInput>({
    targetCompany: "",
    targetName: "",
    targetRole: "",
    targetIndustry: "",
    ourService: "",
    valueProposition: "",
    senderName: "",
  });
  const [preview, setPreview] = useState<GeneratedSequence | null>(null);
  const [createdCampaign, setCreatedCampaign] = useState<ColdEmailCampaign | null>(null);

  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [prospectRows, setProspectRows] = useState<ColdEmailProspect[]>([]);

  const loadCampaigns = useCallback(async () => {
    const res = await fetch("/api/saas/cold-email");
    if (!res.ok) throw new Error("fail");
    const data = (await res.json()) as { campaigns: CampaignWithStats[] };
    const list = data.campaigns ?? [];
    setCampaigns(list);
    setSelectedCampaignId((prev) => prev || (list[0]?.id ?? ""));
  }, []);

  useEffect(() => {
    loadCampaigns().catch(() => setStatusMsg("No se pudieron cargar campañas"));
  }, [loadCampaigns]);

  useEffect(() => {
    if (tab !== "prospects" || !selectedCampaignId) return;
    void (async () => {
      const res = await fetch(`/api/saas/cold-email/${selectedCampaignId}`);
      if (!res.ok) return;
      const data = (await res.json()) as { prospects: ColdEmailProspect[] };
      setProspectRows(data.prospects ?? []);
    })();
  }, [tab, selectedCampaignId]);

  async function submitNewCampaign(): Promise<void> {
    if (
      !form.targetCompany.trim() ||
      !form.targetName.trim() ||
      !form.ourService.trim() ||
      !form.senderName.trim()
    ) {
      setStatusMsg("Completa al menos empresa, contacto, servicio y remitente");
      return;
    }
    setLoading(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/saas/cold-email/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("fail");
      const data = (await res.json()) as { campaign: ColdEmailCampaign };
      setCreatedCampaign(data.campaign);
      setPreview(data.campaign.sequence);
      setStatusMsg("Campaña creada (borrador)");
      await loadCampaigns();
    } catch {
      setStatusMsg("Error al generar campaña");
    } finally {
      setLoading(false);
    }
  }

  async function launchCampaign(id: string): Promise<void> {
    setStatusMsg("");
    try {
      const res = await fetch("/api/saas/cold-email/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: id }),
      });
      if (!res.ok) throw new Error("fail");
      setStatusMsg("Campaña lanzada");
      await loadCampaigns();
    } catch {
      setStatusMsg("No se pudo lanzar (¿ya estaba activa?)");
    }
  }

  async function markReplied(prospectId: string): Promise<void> {
    try {
      const res = await fetch("/api/saas/cold-email/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId }),
      });
      if (!res.ok) throw new Error("fail");
      setStatusMsg("Marcado como respondido");
      const r = await fetch(`/api/saas/cold-email/${selectedCampaignId}`);
      if (r.ok) {
        const data = (await r.json()) as { prospects: ColdEmailProspect[] };
        setProspectRows(data.prospects ?? []);
      }
      await loadCampaigns();
    } catch {
      setStatusMsg("Error al actualizar prospecto");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-white">Cold Email Outreach</h1>
          <p className="mt-2 text-sm text-slate-400">
            Secuencias IA, lanzamiento y seguimiento — sin Lemlist en medio.
          </p>
        </header>

        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          {(
            [
              ["campaigns", "Campañas"],
              ["new", "Nueva Campaña"],
              ["prospects", "Prospectos"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                tab === id ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 hover:bg-slate-800"
              }`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {statusMsg && <p className="mb-4 text-center text-sm text-slate-400">{statusMsg}</p>}

        {tab === "campaigns" && (
          <section className="space-y-4">
            {campaigns.length === 0 ? (
              <p className="text-sm text-slate-500">No hay campañas. Crea una en “Nueva Campaña”.</p>
            ) : (
              <ul className="space-y-3">
                {campaigns.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-lg"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{c.targetCompany}</p>
                        <p className="text-xs text-slate-500">{new Date(c.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs uppercase ${badgeClass(c.status)}`}>
                        {c.status}
                      </span>
                    </div>
                    {c.stats && (
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400 sm:grid-cols-4">
                        <span>Prospectos: {c.stats.totalProspects}</span>
                        <span>Emails enviados: {c.stats.emailsSent}</span>
                        <span>Respondidos: {c.stats.replied}</span>
                        <span>Tasa: {(c.stats.responseRate * 100).toFixed(1)}%</span>
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={c.status !== "draft"}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() => void launchCampaign(c.id)}
                      >
                        Lanzar campaña
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === "new" && (
          <section className="grid gap-10 lg:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              {(
                [
                  ["targetCompany", "Empresa objetivo"],
                  ["targetName", "Nombre contacto"],
                  ["targetRole", "Rol"],
                  ["targetIndustry", "Industria"],
                  ["ourService", "Nuestro servicio"],
                  ["valueProposition", "Propuesta de valor"],
                  ["senderName", "Nombre remitente"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-sm">
                  <span className="text-slate-400">{label}</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </label>
              ))}
              <button
                type="button"
                disabled={loading}
                className="mt-4 w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                onClick={() => void submitNewCampaign()}
              >
                {loading ? "Generando…" : "Crear campaña con IA"}
              </button>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">Vista previa secuencia</h2>
              {!preview?.emails?.length ? (
                <p className="text-sm text-slate-500">La secuencia aparecerá aquí tras crear la campaña.</p>
              ) : (
                <ul className="max-h-[560px] space-y-4 overflow-y-auto pr-1">
                  {preview.emails.map((em) => (
                    <li key={em.step} className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-sm">
                      <p className="text-xs font-medium text-indigo-400">
                        Paso {em.step} · +{em.sendAfterDays} días vs anterior
                      </p>
                      <p className="mt-1 font-medium text-white">{em.subject}</p>
                      <pre className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{em.body}</pre>
                    </li>
                  ))}
                </ul>
              )}
              {createdCampaign && (
                <p className="mt-4 text-xs text-slate-500">ID campaña: {createdCampaign.id}</p>
              )}
            </div>
          </section>
        )}

        {tab === "prospects" && (
          <section className="space-y-4">
            <label className="block max-w-md text-sm">
              <span className="text-slate-400">Campaña</span>
              <select
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
              >
                <option value="">— Selecciona —</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.targetCompany} ({c.status})
                  </option>
                ))}
              </select>
            </label>
            {!selectedCampaignId ? (
              <p className="text-sm text-slate-500">Elige una campaña para ver prospectos.</p>
            ) : prospectRows.length === 0 ? (
              <p className="text-sm text-slate-500">No hay prospectos en esta campaña.</p>
            ) : (
              <ul className="space-y-3">
                {prospectRows.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-white">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.email}</p>
                      <p className="text-xs text-slate-500">
                        {[p.company, p.role].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-xs uppercase ${prospectBadge(p.status)}`}>
                        {p.status}
                      </span>
                      {p.status !== "replied" && (
                        <button
                          type="button"
                          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700"
                          onClick={() => void markReplied(p.id)}
                        >
                          Marcar respondido
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
