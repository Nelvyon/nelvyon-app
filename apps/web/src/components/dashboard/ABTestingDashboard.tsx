"use client";

import { useEffect, useState } from "react";

type Variant = {
  id: string;
  name: string;
  content: string;
  impressions: number;
  clicks: number;
  conversions: number;
};

type Experiment = {
  id: string;
  name: string;
  channel: string;
  status: "running" | "paused" | "done";
  winnerVariant: string | null;
  confidenceThreshold: number;
  variants?: Variant[];
};

const accent = "#f59e0b";
const channels = ["email", "social", "ads", "landing"] as const;

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

function statusCls(status: string): string {
  if (status === "done") return "bg-emerald-700/80 text-white";
  if (status === "paused") return "bg-zinc-700 text-zinc-100";
  return "bg-amber-700/80 text-white";
}

export default function AbTestingDashboard() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<(typeof channels)[number]>("email");
  const [baseContent, setBaseContent] = useState("");
  const [nVariants, setNVariants] = useState(2);

  async function load(): Promise<void> {
    setLoading(true);
    try {
      const res = await fetch("/api/os/ab/experiments");
      if (!res.ok) throw new Error("load_failed");
      const data = (await res.json()) as { experiments: Experiment[] };
      setExperiments(data.experiments ?? []);
    } catch {
      setStatus("No se pudieron cargar experimentos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createExperiment(): Promise<void> {
    if (!name.trim() || !baseContent.trim()) {
      setStatus("Nombre y contenido base son obligatorios");
      return;
    }
    setStatus("");
    try {
      const res = await fetch("/api/os/ab/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          channel,
          baseContent: baseContent.trim(),
          nVariants,
        }),
      });
      if (!res.ok) throw new Error("create_failed");
      setOpenModal(false);
      setName("");
      setBaseContent("");
      setNVariants(2);
      await load();
      setStatus("Experimento creado");
    } catch {
      setStatus("No se pudo crear el experimento");
    }
  }

  async function detectWinner(expId: string): Promise<void> {
    setStatus("");
    try {
      const res = await fetch(`/api/os/ab/experiments/${encodeURIComponent(expId)}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "detect_winner" }),
      });
      if (!res.ok) throw new Error("detect_failed");
      const data = (await res.json()) as { winnerVariantId: string | null };
      setStatus(data.winnerVariantId ? "Ganador detectado" : "Aún no hay ganador estadísticamente claro");
      await load();
    } catch {
      setStatus("No se pudo detectar ganador");
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: accent }}>
            A/B Testing Multicanal
          </h2>
          <p className="text-sm text-zinc-400">Experimentos automáticos con winner detection.</p>
        </div>
        <button
          type="button"
          className="rounded px-3 py-2 text-sm font-semibold text-zinc-950"
          style={{ backgroundColor: accent }}
          onClick={() => setOpenModal(true)}
        >
          Nuevo experimento
        </button>
      </div>

      {loading ? <p className="text-sm text-zinc-400">Cargando experimentos…</p> : null}

      <div className="space-y-4">
        {experiments.map((exp) => {
          const variants = exp.variants ?? [];
          const bestConv = Math.max(1, ...variants.map((v) => v.conversions));
          return (
            <article key={exp.id} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">{exp.name}</h3>
                  <p className="text-xs text-zinc-500">
                    {exp.channel} · threshold {Math.round(exp.confidenceThreshold * 100)}%
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-1 text-xs ${statusCls(exp.status)}`}>{exp.status}</span>
                  <button
                    type="button"
                    className="rounded border border-amber-500/70 px-2 py-1 text-xs text-amber-200 hover:bg-amber-800/30"
                    onClick={() => void detectWinner(exp.id)}
                  >
                    Detectar ganador
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="text-xs uppercase text-zinc-400">
                    <tr>
                      <th className="px-2 py-1">Variante</th>
                      <th className="px-2 py-1">Contenido</th>
                      <th className="px-2 py-1">Imp.</th>
                      <th className="px-2 py-1">Clicks</th>
                      <th className="px-2 py-1">Conv.</th>
                      <th className="px-2 py-1">CTR</th>
                      <th className="px-2 py-1">CVR</th>
                      <th className="px-2 py-1">Progreso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v) => {
                      const ctr = pct(v.clicks, v.impressions);
                      const cvr = pct(v.conversions, v.impressions);
                      const progress = Math.max(2, Math.round((v.conversions / bestConv) * 100));
                      const isWinner = exp.winnerVariant === v.id;
                      return (
                        <tr key={v.id} className="border-t border-zinc-800/80">
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-2">
                              <span>{v.name}</span>
                              {isWinner ? <span className="rounded bg-emerald-700 px-1.5 py-0.5 text-[10px] text-white">WINNER</span> : null}
                            </div>
                          </td>
                          <td className="max-w-[280px] truncate px-2 py-2 text-zinc-400">{v.content}</td>
                          <td className="px-2 py-2">{v.impressions}</td>
                          <td className="px-2 py-2">{v.clicks}</td>
                          <td className="px-2 py-2">{v.conversions}</td>
                          <td className="px-2 py-2">{ctr.toFixed(1)}%</td>
                          <td className="px-2 py-2">{cvr.toFixed(1)}%</td>
                          <td className="px-2 py-2">
                            <div className="h-2 w-28 rounded bg-zinc-800">
                              <div
                                className={`h-2 rounded ${isWinner ? "bg-emerald-500" : "bg-amber-500"}`}
                                style={{ width: `${Math.min(100, progress)}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </article>
          );
        })}
      </div>

      {!loading && experiments.length === 0 ? <p className="text-sm text-zinc-500">No hay experimentos todavía.</p> : null}
      {status ? <p className="mt-3 text-sm text-zinc-300">{status}</p> : null}

      {openModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <h3 className="text-base font-semibold" style={{ color: accent }}>
              Nuevo experimento
            </h3>
            <div className="mt-3 grid gap-2">
              <input
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                placeholder="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <select
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                value={channel}
                onChange={(e) => setChannel(e.target.value as (typeof channels)[number])}
              >
                {channels.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <textarea
                className="min-h-[140px] rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                placeholder="Contenido base para generar variantes"
                value={baseContent}
                onChange={(e) => setBaseContent(e.target.value)}
              />
              <input
                type="number"
                min={2}
                max={5}
                className="w-40 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                value={nVariants}
                onChange={(e) => setNVariants(Math.max(2, Math.min(5, Number(e.target.value) || 2)))}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded px-3 py-2 text-sm text-zinc-400" onClick={() => setOpenModal(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="rounded px-4 py-2 text-sm font-semibold text-zinc-950"
                style={{ backgroundColor: accent }}
                onClick={() => void createExperiment()}
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
