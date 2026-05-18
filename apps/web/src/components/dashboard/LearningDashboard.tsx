"use client";

import { useEffect, useState } from "react";

type AgentStat = {
  agentId: string;
  outcomes: number;
  successRate: number;
  improvementsApplied: number;
};

type LearningStats = {
  totalOutcomes: number;
  nextCycleAt: string;
  byAgent: AgentStat[];
};

type LearningItem = {
  id: string;
  agentId: string;
  sector: string;
  promptImprovement: string;
  applied: boolean;
};

const accent = "#14b8a6";

export default function LearningDashboard() {
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [learnings, setLearnings] = useState<LearningItem[]>([]);
  const [status, setStatus] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [agentId, setAgentId] = useState("");
  const [outcomeType, setOutcomeType] = useState("conversion");
  const [outcomeValue, setOutcomeValue] = useState("0");
  const [feedback, setFeedback] = useState("");
  const [outputId, setOutputId] = useState("");

  async function load(): Promise<void> {
    try {
      const res = await fetch("/api/os/learning/insights");
      if (!res.ok) throw new Error("load_failed");
      const data = (await res.json()) as { stats: LearningStats; learnings: LearningItem[] };
      setStats(data.stats);
      setLearnings(data.learnings ?? []);
    } catch {
      setStatus("No se pudieron cargar insights");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submitOutcome(): Promise<void> {
    if (!agentId.trim()) {
      setStatus("agentId requerido");
      return;
    }
    try {
      const res = await fetch("/api/os/learning/outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agentId.trim(),
          outputId: outputId.trim() || "manual",
          outcomeType,
          outcomeValue: Number(outcomeValue || "0"),
          feedback: feedback.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("report_failed");
      setOpenModal(false);
      setAgentId("");
      setOutputId("");
      setOutcomeType("conversion");
      setOutcomeValue("0");
      setFeedback("");
      setStatus("Resultado reportado");
      await load();
    } catch {
      setStatus("No se pudo reportar resultado");
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold" style={{ color: accent }}>
          Auto-Learning
        </h2>
        <button
          type="button"
          className="rounded px-3 py-2 text-sm font-semibold text-zinc-950"
          style={{ backgroundColor: accent }}
          onClick={() => setOpenModal(true)}
        >
          Reportar resultado
        </button>
      </div>
      <p className="mt-1 text-sm text-zinc-400">
        NELVYON aprende solo de tus resultados. Cuantos más clientes, mejor se vuelve.
      </p>

      <div className="mt-3 rounded border border-zinc-800 bg-zinc-900/40 p-4 md:p-6 text-sm">
        <div>Outcomes totales: <span className="font-semibold text-teal-400">{stats?.totalOutcomes ?? 0}</span></div>
        <div>Próximo ciclo: <span className="text-zinc-400">{stats?.nextCycleAt ? new Date(stats.nextCycleAt).toLocaleString() : "—"}</span></div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase text-zinc-400">
            <tr>
              <th className="px-2 py-1">Agente</th>
              <th className="px-2 py-1">Outcomes</th>
              <th className="px-2 py-1">Tasa éxito</th>
              <th className="px-2 py-1">Mejoras aplicadas</th>
              <th className="px-2 py-1">Próximo ciclo</th>
            </tr>
          </thead>
          <tbody>
            {(stats?.byAgent ?? []).map((row) => (
              <tr key={row.agentId} className="border-t border-zinc-800">
                <td className="px-2 py-2">{row.agentId}</td>
                <td className="px-2 py-2">{row.outcomes}</td>
                <td className="px-2 py-2">{row.successRate.toFixed(2)}%</td>
                <td className="px-2 py-2">{row.improvementsApplied}</td>
                <td className="px-2 py-2">{stats?.nextCycleAt ? new Date(stats.nextCycleAt).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <h3 className="mb-1 text-sm font-semibold text-zinc-300">Últimos learnings</h3>
        <ul className="space-y-2">
          {learnings.slice(0, 6).map((l) => (
            <li key={l.id} className="rounded border border-zinc-800 bg-zinc-900/40 p-2 text-sm">
              <div className="text-xs text-zinc-500">{l.agentId} · {l.sector} · {l.applied ? "aplicado" : "pendiente"}</div>
              <div className="line-clamp-3 whitespace-pre-wrap text-zinc-300">{l.promptImprovement}</div>
            </li>
          ))}
        </ul>
      </div>

      {status ? <p className="mt-3 text-sm text-zinc-300">{status}</p> : null}

      {openModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <h3 className="text-base font-semibold" style={{ color: accent }}>Reportar resultado</h3>
            <div className="mt-3 grid gap-2">
              <input className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="agentId" value={agentId} onChange={(e) => setAgentId(e.target.value)} />
              <input className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="outputId" value={outputId} onChange={(e) => setOutputId(e.target.value)} />
              <select className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" value={outcomeType} onChange={(e) => setOutcomeType(e.target.value)}>
                <option value="conversion">Si</option>
                <option value="ignored">No</option>
                <option value="reply">Reply</option>
                <option value="click">Click</option>
                <option value="open">Open</option>
                <option value="rejected">Rejected</option>
              </select>
              <input className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Revenue / value" value={outcomeValue} onChange={(e) => setOutcomeValue(e.target.value)} />
              <textarea className="min-h-[90px] rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded px-3 py-2 text-sm text-zinc-400" onClick={() => setOpenModal(false)}>Cancelar</button>
              <button type="button" className="rounded px-4 py-2 text-sm font-semibold text-zinc-950" style={{ backgroundColor: accent }} onClick={() => void submitOutcome()}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
