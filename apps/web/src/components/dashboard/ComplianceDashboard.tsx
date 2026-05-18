"use client";

import { useCallback, useState } from "react";

type ComplianceLibraryAgentId =
  | "compliance-gap-analyzer"
  | "compliance-control-mapper"
  | "compliance-policy-drafter"
  | "compliance-risk-register"
  | "compliance-evidence-checker"
  | "compliance-vendor-assessor"
  | "compliance-incident-plan"
  | "compliance-readiness-report";

type Row = { id: ComplianceLibraryAgentId; title: string; subtitle: string };

type ComplianceOutput = {
  agentId: string;
  content: string;
  score: number;
  controls: string[];
  gaps: string[];
};

const accent = "#14b8a6";

const AGENTS: Row[] = [
  { id: "compliance-gap-analyzer", title: "Gap analysis", subtitle: "SOC2 / ISO 27001" },
  { id: "compliance-control-mapper", title: "Mapeo controles", subtitle: "Framework ↔ práctica" },
  { id: "compliance-policy-drafter", title: "Políticas", subtitle: "Borradores ISMS" },
  { id: "compliance-risk-register", title: "Registro riesgos", subtitle: "Prob / impacto" },
  { id: "compliance-evidence-checker", title: "Evidencias", subtitle: "Auditoría" },
  { id: "compliance-vendor-assessor", title: "Vendor risk", subtitle: "Terceros" },
  { id: "compliance-incident-plan", title: "Plan incidentes", subtitle: "IR compatible" },
  { id: "compliance-readiness-report", title: "Readiness", subtitle: "Informe ejecutivo" },
];

export default function ComplianceDashboard() {
  const [sector, setSector] = useState("saas");
  const [framework, setFramework] = useState("SOC 2 Type II + ISO 27001");
  const [region, setRegion] = useState("UE / EEE");
  const [currentControlsJson, setCurrentControlsJson] = useState('["MFA IdP","Backup cifrado"]');
  const [dataTypesJson, setDataTypesJson] = useState('["PII clientes","logs acceso"]');
  const [busyId, setBusyId] = useState<ComplianceLibraryAgentId | null>(null);
  const [status, setStatus] = useState("");
  const [outputs, setOutputs] = useState<Partial<Record<ComplianceLibraryAgentId, ComplianceOutput>>>({});

  const runAgent = useCallback(
    async (agentId: ComplianceLibraryAgentId): Promise<void> => {
      setBusyId(agentId);
      setStatus("");
      try {
        let currentControls: string[] | undefined;
        let dataTypes: string[] | undefined;
        try {
          const c = JSON.parse(currentControlsJson) as unknown;
          if (Array.isArray(c)) currentControls = c.map((x) => String(x)).filter(Boolean);
        } catch {
          throw new Error("currentControls JSON inválido");
        }
        try {
          const d = JSON.parse(dataTypesJson) as unknown;
          if (Array.isArray(d)) dataTypes = d.map((x) => String(x)).filter(Boolean);
        } catch {
          throw new Error("dataTypes JSON inválido");
        }

        const res = await fetch("/api/os/agents/compliance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            input: {
              sector: sector.trim(),
              framework: framework.trim(),
              region: region.trim(),
              ...(currentControls?.length ? { currentControls } : {}),
              ...(dataTypes?.length ? { dataTypes } : {}),
            },
          }),
        });
        const data = (await res.json()) as { result?: ComplianceOutput; error?: string };
        if (!res.ok) throw new Error(data.error ?? "request_failed");
        if (!data.result) throw new Error("sin resultado");
        setOutputs((prev) => ({ ...prev, [agentId]: data.result! }));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Error";
        setStatus(msg);
      } finally {
        setBusyId(null);
      }
    },
    [currentControlsJson, dataTypesJson, framework, region, sector],
  );

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold" style={{ color: accent }}>
          SOC 2 / ISO 27001 readiness
        </h2>
        {status ? <p className="text-sm text-rose-400">{status}</p> : null}
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Sector
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          Framework / alcance
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={framework}
            onChange={(e) => setFramework(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Región
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Controles actuales (JSON array de strings)
          <textarea
            className="min-h-[64px] rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-xs text-zinc-100"
            value={currentControlsJson}
            onChange={(e) => setCurrentControlsJson(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2 lg:col-span-3">
          Tipos de datos (JSON array de strings)
          <textarea
            className="min-h-[64px] rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-xs text-zinc-100"
            value={dataTypesJson}
            onChange={(e) => setDataTypesJson(e.target.value)}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {AGENTS.map((a) => {
          const out = outputs[a.id];
          const score = out?.score ?? null;
          return (
            <article
              key={a.id}
              className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 md:p-6"
              style={{ borderColor: `${accent}33` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="line-clamp-2 text-sm md:text-base font-semibold text-zinc-100">{a.title}</h3>
                  <p className="text-xs text-zinc-400">{a.subtitle}</p>
                </div>
                {score != null ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-bold text-zinc-950"
                    style={{ backgroundColor: accent }}
                    title="Score"
                  >
                    {score}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-500">—</span>
                )}
              </div>
              <button
                type="button"
                disabled={busyId !== null}
                className="min-h-[44px] rounded px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50 md:text-base"
                style={{ backgroundColor: accent }}
                onClick={() => void runAgent(a.id)}
              >
                {busyId === a.id ? "Ejecutando…" : "Generar"}
              </button>
              {out?.controls?.length ? (
                <ul className="mt-1 max-h-32 space-y-1.5 overflow-y-auto text-xs">
                  {out.controls.slice(0, 8).map((line, idx) => (
                    <li key={idx} className="flex gap-2 rounded border border-zinc-800 bg-zinc-950/50 p-2 text-zinc-300">
                      <span className="shrink-0 text-emerald-400" aria-hidden>
                        ✓
                      </span>
                      <span>{line.length > 220 ? `${line.slice(0, 220)}…` : line}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Controles tras generar.</p>
              )}
              {out?.gaps?.length ? (
                <ul className="max-h-32 space-y-1.5 overflow-y-auto text-xs">
                  {out.gaps.slice(0, 8).map((line, idx) => (
                    <li key={idx} className="flex gap-2 rounded border border-rose-900/50 bg-rose-950/20 p-2 text-zinc-300">
                      <span className="shrink-0 text-rose-400" aria-hidden>
                        ●
                      </span>
                      <span>{line.length > 220 ? `${line.slice(0, 220)}…` : line}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Gaps tras generar.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
