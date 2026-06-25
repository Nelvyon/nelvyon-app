"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import type { AvailablePackDef, PackLaunch, LaunchStatusDetail } from "@nelvyon/saas";

// ── Types ─────────────────────────────────────────────────────────────────────

type WizardStep = "select" | "brief" | "running" | "done";

// ── Pack card ─────────────────────────────────────────────────────────────────

function PackCard({
  pack,
  selected,
  onSelect,
}: {
  pack: AvailablePackDef;
  selected: boolean;
  onSelect: () => void;
}) {
  const isBeta = pack.availability === "beta";
  return (
    <button
      onClick={onSelect}
      className={`relative w-full text-left rounded-xl border p-5 transition-all ${
        selected
          ? "border-[#0084ff] bg-[#0084ff]/10"
          : "border-white/10 bg-white/5 hover:border-white/20"
      }`}
    >
      {isBeta && (
        <span className="absolute top-3 right-3 rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] text-yellow-400 font-medium">
          BETA
        </span>
      )}
      <p className="text-white font-semibold text-sm">{pack.name}</p>
      <p className="text-white/50 text-xs mt-1 line-clamp-2">{pack.tagline}</p>
      <p className="text-white/30 text-[10px] mt-3">⏱ ~{pack.estimatedMinutes} min</p>
    </button>
  );
}

// ── Brief form ────────────────────────────────────────────────────────────────

const BRIEF_FIELDS: Record<string, { key: string; label: string; placeholder: string; required?: boolean }[]> = {
  "local-business-growth": [
    { key: "business_name", label: "Nombre del negocio", placeholder: "La Pizzería Napoli", required: true },
    { key: "city", label: "Ciudad", placeholder: "Madrid", required: true },
    { key: "value_proposition", label: "¿Qué te diferencia?", placeholder: "La mejor pizza napolitana del barrio", required: true },
    { key: "primary_cta", label: "CTA principal", placeholder: "Reservar mesa", required: true },
    { key: "contact_email", label: "Email de contacto", placeholder: "hola@negocio.com" },
  ],
  "ecommerce-growth": [
    { key: "business_name", label: "Nombre de marca", placeholder: "ModaVerde DTC", required: true },
    { key: "city", label: "Ciudad / Mercado", placeholder: "España", required: true },
    { key: "value_proposition", label: "Categoría de producto", placeholder: "Moda sostenible femenina", required: true },
    { key: "primary_cta", label: "Canal principal", placeholder: "Meta Ads", required: true },
    { key: "contact_email", label: "Email de contacto", placeholder: "hola@marca.com" },
  ],
  "saas-b2b-growth": [
    { key: "business_name", label: "Nombre del producto", placeholder: "FlowMetrics", required: true },
    { key: "city", label: "Mercado objetivo", placeholder: "Europa", required: true },
    { key: "value_proposition", label: "ICP / Cargo objetivo", placeholder: "VP Engineering", required: true },
    { key: "primary_cta", label: "Motion comercial", placeholder: "Trial PLG", required: true },
    { key: "contact_email", label: "Email de contacto", placeholder: "hola@saas.com" },
  ],
};

const DEFAULT_FIELDS = [
  { key: "business_name", label: "Nombre del negocio / proyecto", placeholder: "Acme Corp", required: true },
  { key: "city", label: "Ciudad / Mercado", placeholder: "Madrid", required: true },
  { key: "value_proposition", label: "Propuesta de valor", placeholder: "¿Qué te diferencia?", required: true },
  { key: "primary_cta", label: "Objetivo principal", placeholder: "Generar leads", required: true },
  { key: "contact_email", label: "Email de contacto", placeholder: "hola@empresa.com" },
];

function BriefForm({
  packId,
  values,
  onChange,
}: {
  packId: string;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const fields = BRIEF_FIELDS[packId] ?? DEFAULT_FIELDS;
  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="text-xs text-white/50 block mb-1">
            {f.label} {f.required && <span className="text-red-400">*</span>}
          </label>
          <input
            type={f.key === "contact_email" ? "email" : "text"}
            value={values[f.key] ?? ""}
            onChange={(e) => onChange(f.key, e.target.value)}
            placeholder={f.placeholder}
            className="w-full rounded-lg border border-white/10 bg-white/5 text-white text-sm px-3 py-2 placeholder:text-white/20 focus:outline-none focus:border-[#0084ff]"
          />
        </div>
      ))}
    </div>
  );
}

function briefIsValid(packId: string, values: Record<string, string>): boolean {
  const fields = BRIEF_FIELDS[packId] ?? DEFAULT_FIELDS;
  return fields.filter((f) => f.required).every((f) => (values[f.key] ?? "").trim().length > 0);
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full rounded-full bg-white/10 h-2">
      <div
        className="h-2 rounded-full bg-[#0084ff] transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BriefToLaunchPage() {
  const [packs, setPacks] = useState<AvailablePackDef[]>([]);
  const [recentLaunches, setRecentLaunches] = useState<PackLaunch[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<WizardStep>("select");
  const [selectedPack, setSelectedPack] = useState<AvailablePackDef | null>(null);
  const [briefValues, setBriefValues] = useState<Record<string, string>>({});
  const [launching, setLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState<LaunchStatusDetail | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [currentLaunchId, setCurrentLaunchId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void fetch("/api/saas/brief-to-launch")
      .then((r) => (r.ok ? r.json() : { packs: [], launches: [] }))
      .then((d) => {
        setPacks((d.packs ?? []) as AvailablePackDef[]);
        setRecentLaunches((d.launches ?? []) as PackLaunch[]);
      })
      .finally(() => setLoading(false));
  }, []);

  const pollStatus = useCallback(
    async (launchId: string) => {
      try {
        const res = await fetch(`/api/saas/brief-to-launch/${launchId}`);
        if (!res.ok) return;
        const d = (await res.json()) as { launch: LaunchStatusDetail };
        setLaunchResult(d.launch);
        if (d.launch.status === "completed" || d.launch.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep("done");
          setLaunching(false);
          if (d.launch.status === "failed") {
            setLaunchError(d.launch.errorMessage ?? "Error desconocido");
          }
        }
      } catch { /* silent */ }
    },
    [],
  );

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function handleLaunch() {
    if (!selectedPack || !briefIsValid(selectedPack.id, briefValues)) return;
    setLaunching(true);
    setLaunchError(null);
    setStep("running");

    try {
      const res = await fetch("/api/saas/brief-to-launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: selectedPack.id, brief: briefValues }),
      });
      const d = (await res.json()) as { launch?: PackLaunch; error?: string };
      if (!res.ok || !d.launch) {
        setLaunchError(d.error ?? "Error al lanzar el pack");
        setStep("brief");
        setLaunching(false);
        return;
      }
      setCurrentLaunchId(d.launch.id);
      // Poll every 3s
      pollRef.current = setInterval(() => { void pollStatus(d.launch!.id); }, 3000);
      void pollStatus(d.launch.id);
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : "Error de red");
      setStep("brief");
      setLaunching(false);
    }
  }

  function reset() {
    if (pollRef.current) clearInterval(pollRef.current);
    setStep("select");
    setSelectedPack(null);
    setBriefValues({});
    setLaunchResult(null);
    setLaunchError(null);
    setCurrentLaunchId(null);
    setLaunching(false);
  }

  const isBeta = selectedPack?.availability === "beta";

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="brief-to-launch" />}>
      <div className="space-y-8 p-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-white">Lanzar Pack IA</h1>
          <p className="text-white/50 text-sm mt-1">
            Elige un pack, completa el brief y el motor IA entregará los activos en minutos.
          </p>
        </div>

        {/* Wizard steps */}
        <div className="flex items-center gap-3 text-xs">
          {(["select", "brief", "running", "done"] as WizardStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <span className="text-white/20">→</span>}
              <span
                className={`font-medium ${
                  step === s ? "text-[#0084ff]" : i < ["select","brief","running","done"].indexOf(step) ? "text-green-400" : "text-white/30"
                }`}
              >
                {["1. Pack", "2. Brief", "3. Ejecutando", "4. Resultado"][i]}
              </span>
            </div>
          ))}
        </div>

        {/* ── Step 1: Select pack ───────────────────────────────── */}
        {step === "select" && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-white/40 text-sm py-10 text-center">Cargando packs…</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {packs.map((p) => (
                  <PackCard
                    key={p.id}
                    pack={p}
                    selected={selectedPack?.id === p.id}
                    onSelect={() => {
                      setSelectedPack(p);
                      setBriefValues({});
                    }}
                  />
                ))}
              </div>
            )}

            {selectedPack && (
              <div className="space-y-3 pt-2">
                {isBeta ? (
                  <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-5 py-4">
                    <p className="text-yellow-300 font-semibold text-sm">Pack en beta</p>
                    <p className="text-yellow-400/70 text-xs mt-1">
                      Este pack está en acceso anticipado. Puedes registrar tu interés y te
                      avisaremos cuando esté disponible para ejecución automática.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => setStep("brief")}
                    className="w-full rounded-xl bg-[#0084ff] py-3 text-white font-semibold hover:bg-[#0070dd] transition-colors"
                  >
                    Continuar con {selectedPack.name} →
                  </button>
                )}
              </div>
            )}

            {/* Recent launches */}
            {recentLaunches.length > 0 && (
              <div className="space-y-2 pt-4">
                <p className="text-white/40 text-xs uppercase tracking-wide">Lanzamientos recientes</p>
                {recentLaunches.slice(0, 5).map((l) => (
                  <div
                    key={l.id}
                    className="flex justify-between items-center rounded-lg border border-white/5 bg-white/5 px-4 py-2"
                  >
                    <span className="text-white/70 text-xs">{l.packId}</span>
                    <span
                      className={`text-xs font-medium ${
                        l.status === "completed"
                          ? "text-green-400"
                          : l.status === "failed"
                          ? "text-red-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Brief form ────────────────────────────────── */}
        {step === "brief" && selectedPack && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white font-semibold">{selectedPack.name}</h2>
                <p className="text-white/40 text-xs">{selectedPack.tagline}</p>
              </div>
              <button onClick={() => setStep("select")} className="text-white/40 text-xs hover:text-white">
                ← Cambiar pack
              </button>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <p className="text-white/60 text-xs mb-4 font-medium uppercase tracking-wide">Brief del proyecto</p>
              <BriefForm
                packId={selectedPack.id}
                values={briefValues}
                onChange={(key, val) => setBriefValues((prev) => ({ ...prev, [key]: val }))}
              />
            </div>

            {launchError && (
              <p className="text-red-400 text-sm">{launchError}</p>
            )}

            <button
              disabled={launching || !briefIsValid(selectedPack.id, briefValues)}
              onClick={() => { void handleLaunch(); }}
              className="w-full rounded-xl bg-[#0084ff] py-3 text-white font-semibold disabled:opacity-40 hover:bg-[#0070dd] transition-colors"
            >
              {launching ? "Lanzando…" : "🚀 Lanzar pack"}
            </button>

            <p className="text-white/30 text-xs text-center">
              El motor IA ejecutará el pack (~{selectedPack.estimatedMinutes} min). Puedes cerrar esta pestaña.
            </p>
          </div>
        )}

        {/* ── Step 3: Running ───────────────────────────────────── */}
        {step === "running" && (
          <div className="space-y-6 py-8 text-center">
            <div className="text-5xl animate-pulse">⚙️</div>
            <div className="space-y-2">
              <p className="text-white font-semibold">Ejecutando {selectedPack?.name}…</p>
              <p className="text-white/40 text-sm">El motor IA está generando tus activos</p>
            </div>
            <div className="max-w-xs mx-auto space-y-2">
              <ProgressBar pct={launchResult?.progressPct ?? 0} />
              <p className="text-white/30 text-xs">{launchResult?.progressPct ?? 0}% completado</p>
            </div>
            {launchResult?.steps && launchResult.steps.length > 0 && (
              <div className="text-left max-w-sm mx-auto space-y-2">
                {launchResult.steps.map((s) => (
                  <div key={s.key} className="flex items-center gap-3 text-xs">
                    <span>
                      {s.status === "done" ? "✅" : s.status === "running" ? "⏳" : s.status === "failed" ? "❌" : "○"}
                    </span>
                    <span className={s.status === "done" ? "text-white/60 line-through" : "text-white/80"}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Done ──────────────────────────────────────── */}
        {step === "done" && launchResult && (
          <div className="space-y-6">
            {launchResult.status === "failed" ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-8 text-center space-y-3">
                <div className="text-4xl">❌</div>
                <p className="text-white font-semibold">El pack falló</p>
                <p className="text-red-400 text-sm">{launchResult.errorMessage ?? "Error desconocido"}</p>
                <button onClick={reset} className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">
                  Intentar de nuevo
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-6 py-6 text-center space-y-2">
                  <div className="text-4xl">🎉</div>
                  <p className="text-white font-bold text-lg">{selectedPack?.name} completado</p>
                  {launchResult.qaScore !== null && (
                    <p className={`text-sm font-semibold ${launchResult.qaScore >= 85 ? "text-green-400" : "text-yellow-400"}`}>
                      QA Score: {launchResult.qaScore}%
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <a
                    href="/saas/entregables"
                    className="flex flex-col items-center rounded-xl border border-white/10 bg-white/5 px-4 py-4 hover:bg-white/10 transition-colors"
                  >
                    <span className="text-2xl">📦</span>
                    <span className="text-white text-xs font-medium mt-2">Ver Entregables</span>
                  </a>
                  {launchResult.portalUrl && (
                    <a
                      href={launchResult.portalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center rounded-xl border border-[#0084ff]/30 bg-[#0084ff]/10 px-4 py-4 hover:bg-[#0084ff]/20 transition-colors"
                    >
                      <span className="text-2xl">🌐</span>
                      <span className="text-[#0084ff] text-xs font-medium mt-2">Abrir Portal</span>
                    </a>
                  )}
                  <a
                    href="/saas/reportes"
                    className="flex flex-col items-center rounded-xl border border-white/10 bg-white/5 px-4 py-4 hover:bg-white/10 transition-colors"
                  >
                    <span className="text-2xl">📊</span>
                    <span className="text-white text-xs font-medium mt-2">Ver Informe CEO</span>
                  </a>
                </div>

                <button
                  onClick={reset}
                  className="w-full rounded-xl border border-white/10 py-2 text-white/50 text-sm hover:text-white hover:border-white/20 transition-colors"
                >
                  Lanzar otro pack
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </SaasShellLayout>
  );
}
