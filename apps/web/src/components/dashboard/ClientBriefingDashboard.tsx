"use client";

import { useEffect, useState } from "react";

type BriefingInput = {
  companyName: string;
  website?: string;
  industry: string;
  description?: string;
  targetAudience?: string;
  goals?: string[];
};

type BriefingResult = {
  summary: string;
  businessAnalysis: string;
  competitors: string[];
  targetAudience: string;
  recommendedChannels: string[];
  actionPlan: string[];
  strengths: string[];
  opportunities: string[];
  estimatedBudget: { min: number; max: number };
};

type Briefing = {
  id: string;
  companyName: string;
  input: BriefingInput;
  result: BriefingResult;
  createdAt: string;
};

export default function ClientBriefingDashboard() {
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [selected, setSelected] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    summary: true,
    analysis: true,
    competitors: true,
    channels: true,
    action: true,
    budget: true,
  });

  async function loadBriefings(): Promise<void> {
    const res = await fetch("/api/saas/briefing");
    if (!res.ok) throw new Error("load_failed");
    const data = (await res.json()) as { briefings: Briefing[] };
    setBriefings(data.briefings ?? []);
    if (!selected && (data.briefings?.length ?? 0) > 0) setSelected(data.briefings[0]);
  }

  useEffect(() => {
    loadBriefings().catch(() => setStatus("No se pudieron cargar briefings"));
  }, []);

  function addGoal(): void {
    const g = goalInput.trim();
    if (!g) return;
    setGoals((prev) => [...prev, g]);
    setGoalInput("");
  }

  async function generate(): Promise<void> {
    if (!companyName.trim() || !industry.trim()) {
      setStatus("companyName e industry son requeridos");
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      const payload: BriefingInput = {
        companyName: companyName.trim(),
        website: website.trim() || undefined,
        industry: industry.trim(),
        description: description.trim() || undefined,
        targetAudience: targetAudience.trim() || undefined,
        goals,
      };
      const res = await fetch("/api/saas/briefing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("generate_failed");
      const data = (await res.json()) as { briefing: Briefing };
      await loadBriefings();
      setSelected(data.briefing);
      setStatus("Briefing generado");
    } catch {
      setStatus("No se pudo generar briefing");
    } finally {
      setLoading(false);
    }
  }

  function toggle(section: string): void {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <h2 className="text-lg font-semibold">Briefing de Cliente</h2>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <input className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        <input className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Website" value={website} onChange={(e) => setWebsite(e.target.value)} />
        <input className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
        <input className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Target audience" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
        <textarea className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm md:col-span-2" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="md:col-span-2">
          <div className="flex gap-2">
            <input className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Goal" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} />
            <button className="rounded bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700" type="button" onClick={addGoal}>
              Añadir
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {goals.map((g, i) => (
              <span className="rounded bg-zinc-800 px-2 py-1 text-xs" key={`${g}-${i}`}>
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>

      <button className="mt-3 rounded bg-indigo-700 px-4 py-2 text-sm hover:bg-indigo-600 disabled:opacity-60" disabled={loading} onClick={generate} type="button">
        Generar Briefing
      </button>

      <div className="mt-5 grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="rounded border border-zinc-800 bg-zinc-900 p-3">
          <h3 className="mb-2 text-sm font-semibold">Briefings anteriores</h3>
          <div className="space-y-1">
            {briefings.map((b) => (
              <button
                className={`block w-full rounded px-2 py-2 text-left text-xs ${selected?.id === b.id ? "bg-indigo-700 text-white" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"}`}
                key={b.id}
                type="button"
                onClick={() => setSelected(b)}
              >
                <p className="font-medium">{b.companyName}</p>
                <p className="opacity-80">{new Date(b.createdAt).toLocaleDateString()}</p>
              </button>
            ))}
          </div>
        </aside>

        <div className="space-y-2">
          {selected ? (
            <>
              <div className="rounded border border-zinc-800 bg-zinc-900 p-3">
                <button className="w-full text-left text-sm font-semibold" onClick={() => toggle("summary")} type="button">
                  Resumen
                </button>
                {openSections.summary ? <p className="mt-2 text-sm text-zinc-300">{selected.result.summary}</p> : null}
              </div>
              <div className="rounded border border-zinc-800 bg-zinc-900 p-3">
                <button className="w-full text-left text-sm font-semibold" onClick={() => toggle("analysis")} type="button">
                  Análisis
                </button>
                {openSections.analysis ? <p className="mt-2 text-sm text-zinc-300">{selected.result.businessAnalysis}</p> : null}
              </div>
              <div className="rounded border border-zinc-800 bg-zinc-900 p-3">
                <button className="w-full text-left text-sm font-semibold" onClick={() => toggle("competitors")} type="button">
                  Competidores
                </button>
                {openSections.competitors ? <ul className="mt-2 list-disc pl-5 text-sm text-zinc-300">{selected.result.competitors.map((c) => <li key={c}>{c}</li>)}</ul> : null}
              </div>
              <div className="rounded border border-zinc-800 bg-zinc-900 p-3">
                <button className="w-full text-left text-sm font-semibold" onClick={() => toggle("channels")} type="button">
                  Canales recomendados
                </button>
                {openSections.channels ? <ul className="mt-2 list-disc pl-5 text-sm text-zinc-300">{selected.result.recommendedChannels.map((c) => <li key={c}>{c}</li>)}</ul> : null}
              </div>
              <div className="rounded border border-zinc-800 bg-zinc-900 p-3">
                <button className="w-full text-left text-sm font-semibold" onClick={() => toggle("action")} type="button">
                  Plan de acción
                </button>
                {openSections.action ? <ul className="mt-2 list-disc pl-5 text-sm text-zinc-300">{selected.result.actionPlan.map((s, i) => <li key={`${s}-${i}`}>{s}</li>)}</ul> : null}
              </div>
              <div className="rounded border border-zinc-800 bg-zinc-900 p-3">
                <button className="w-full text-left text-sm font-semibold" onClick={() => toggle("budget")} type="button">
                  Presupuesto estimado
                </button>
                {openSections.budget ? (
                  <p className="mt-2 text-sm text-zinc-300">
                    EUR {selected.result.estimatedBudget.min} - EUR {selected.result.estimatedBudget.max}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="rounded border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-400">Genera o selecciona un briefing para ver detalles.</div>
          )}
        </div>
      </div>

      {status ? <p className="mt-3 text-sm text-zinc-300">{status}</p> : null}
    </section>
  );
}
