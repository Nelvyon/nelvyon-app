"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  FeaturedEnvatoTemplateCard,
  type FeaturedTemplateMeta,
} from "@/features/saas-web-builder/components/FeaturedEnvatoTemplateCard";
import { NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";
import { ActivationChecklist } from "@/features/saas-shell/components/ActivationChecklist";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type HealthItem = {
  id: string;
  label: string;
  category: string;
  status: "ok" | "warning" | "missing";
  configured: boolean;
  href: string;
  detail: string;
  actionable: boolean;
};

type HealthReport = {
  score: number;
  status: "healthy" | "degraded" | "critical";
  items: HealthItem[];
  activation: { done: number; total: number; percent: number };
  summary: { platformReady: boolean; productReady: boolean; missingCount: number };
};

const CATEGORY_LABELS: Record<string, string> = {
  platform: "Plataforma",
  payments: "Pagos",
  comms: "Comunicación",
  integrations: "Integraciones",
  product: "Uso del producto",
};

const STATUS_ICON: Record<HealthItem["status"], string> = {
  ok: "✓",
  warning: "◐",
  missing: "○",
};

const STATUS_CLS: Record<HealthItem["status"], string> = {
  ok: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  warning: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  missing: "text-red-300 border-red-500/30 bg-red-500/10",
};

export default function SaasSetupPage() {
  const router = useRouter();
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [packLoading, setPackLoading] = useState(false);
  const [packMsg, setPackMsg] = useState<string | null>(null);
  const [featuredTemplate, setFeaturedTemplate] = useState<FeaturedTemplateMeta | null>(null);
  const [autonomyMode, setAutonomyMode] = useState<"draft" | "propose" | "execute">("propose");
  const [memoryChunks, setMemoryChunks] = useState<Array<{ id: string; title: string; content: string }>>([]);
  const [memoryInput, setMemoryInput] = useState("");
  const [eliteSaving, setEliteSaving] = useState(false);
  const [setupProgress, setSetupProgress] = useState<Record<string, boolean>>({});
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  const SETUP_STEPS = [
    { id: "starter_pack", label: "Kit de arranque", done: setupProgress.starter_pack },
    { id: "autonomy", label: "Autonomía IA", done: setupProgress.autonomy },
    { id: "memory", label: "Memoria IA", done: setupProgress.memory },
    { id: "geo", label: "Auditoría GEO", done: setupProgress.geo },
    { id: "health_ok", label: "Salud ≥90%", done: setupProgress.health_ok },
  ] as const;
  const setupDone = SETUP_STEPS.filter((s) => s.done).length;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/platform-health", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/auth/login?next=/saas/setup");
        return;
      }
      if (res.ok) setReport((await res.json()) as HealthReport);
      const tplRes = await fetch("/api/saas/web-builder/templates", { cache: "no-store" });
      if (tplRes.ok) {
        const tpl = (await tplRes.json()) as { templates: FeaturedTemplateMeta[] };
        setFeaturedTemplate(tpl.templates?.[0] ?? null);
      }
      const eliteRes = await fetch("/api/saas/setup", { cache: "no-store" });
      if (eliteRes.ok) {
        const elite = (await eliteRes.json()) as {
          elite?: { autonomyMode?: string; setupProgress?: Record<string, boolean> };
        };
        if (elite.elite?.autonomyMode === "draft" || elite.elite?.autonomyMode === "propose" || elite.elite?.autonomyMode === "execute") {
          setAutonomyMode(elite.elite.autonomyMode);
        }
        if (elite.elite?.setupProgress) {
          setSetupProgress(elite.elite.setupProgress);
        }
      }
      const memRes = await fetch("/api/saas/memory", { cache: "no-store" });
      if (memRes.ok) {
        const mem = (await memRes.json()) as { chunks?: Array<{ id: string; title: string; content: string }> };
        setMemoryChunks(mem.chunks ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (report && report.score >= 90 && !setupProgress.health_ok) {
      void fetch("/api/saas/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupStep: "health_ok" }),
      }).then(() => setSetupProgress((p) => ({ ...p, health_ok: true })));
    }
  }, [report, setupProgress.health_ok]);

  async function installStarterPack() {
    setPackLoading(true);
    setPackMsg(null);
    try {
      const res = await fetch("/api/saas/starter-pack", { method: "POST" });
      const d = (await res.json()) as { error?: string; totalWorkflows?: number; totalSequences?: number };
      if (!res.ok) {
        setPackMsg(d.error ?? "Error al instalar");
        return;
      }
      setPackMsg(`✅ Kit instalado: ${d.totalWorkflows ?? 6} workflows + ${d.totalSequences ?? 4} secuencias`);
      await fetch("/api/saas/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupStep: "starter_pack" }),
      });
      setSetupProgress((p) => ({ ...p, starter_pack: true }));
      await load();
    } finally {
      setPackLoading(false);
    }
  }

  const grouped = report
    ? Object.entries(
        report.items.reduce<Record<string, HealthItem[]>>((acc, item) => {
          (acc[item.category] ??= []).push(item);
          return acc;
        }, {}),
      )
    : [];

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="setup" />}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#0084ff]/70">Centro de configuración</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Perfecciona tu cuenta Nelvyon</h1>
          <p className="mt-1 text-sm text-white/50 max-w-xl">
            Estado en tiempo real de email, pagos, comunicación e integraciones. Objetivo: 100% operativo.
          </p>
        </div>
        {report && (
          <div
            className={`rounded-2xl border px-6 py-4 text-center ${
              report.status === "healthy"
                ? "border-emerald-500/40 bg-emerald-500/10"
                : report.status === "degraded"
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "border-red-500/40 bg-red-500/10"
            }`}
          >
            <p className="text-4xl font-bold text-white tabular-nums">{report.score}%</p>
            <p className="text-xs text-white/60 mt-1">Salud global</p>
          </div>
        )}
      </div>

      {loading && (
        <p className="text-sm text-white/40">Analizando configuración…</p>
      )}

      {report && (
        <>
          <NelvyonDsCard className="p-5 border-emerald-500/20 bg-emerald-500/5">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <p className="font-semibold text-white">🎯 Onboarding productizado</p>
                <p className="text-sm text-white/50">{setupDone}/{SETUP_STEPS.length} pasos elite completados</p>
              </div>
              <p className="text-2xl font-bold text-white tabular-nums">{Math.round((setupDone / SETUP_STEPS.length) * 100)}%</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {SETUP_STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    step.done ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-white/10 text-white/40"
                  }`}
                >
                  {step.done ? "✓" : "○"} {step.label}
                </div>
              ))}
            </div>
          </NelvyonDsCard>

          <NelvyonDsCard className="p-5 border-cyan-500/20 bg-cyan-500/5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-white">🌐 GEO / AI Visibility</p>
                <p className="text-sm text-white/50 mt-1">Schema.org, FAQ, llms.txt — informe PDF vendible (0€ LLM)</p>
                {geoMsg && <p className="text-xs text-emerald-400 mt-2">{geoMsg}</p>}
              </div>
              <NelvyonDsButton
                disabled={geoLoading}
                onClick={async () => {
                  setGeoLoading(true);
                  setGeoMsg(null);
                  try {
                    const res = await fetch("/api/saas/geo-visibility", { method: "POST" });
                    const d = (await res.json()) as { run?: { score: number | null; domain: string; id: string }; error?: string };
                    if (!res.ok) {
                      setGeoMsg(d.error ?? "Error al analizar");
                      return;
                    }
                    setGeoMsg(`✅ Score ${d.run?.score ?? 0}/100 — ${d.run?.domain ?? ""}`);
                    await fetch("/api/saas/setup", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ setupStep: "geo" }),
                    });
                    setSetupProgress((p) => ({ ...p, geo: true }));
                  } finally {
                    setGeoLoading(false);
                  }
                }}
              >
                {geoLoading ? "Analizando…" : "Analizar GEO"}
              </NelvyonDsButton>
            </div>
          </NelvyonDsCard>

          <NelvyonDsCard className="p-5 border-[#0084ff]/20 bg-[#0084ff]/5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-white">⚡ Kit de arranque oficial Nelvyon</p>
                <p className="text-sm text-white/50 mt-1">6 workflows + 4 secuencias — importación en 1 clic</p>
                {packMsg && <p className="text-xs text-emerald-400 mt-2">{packMsg}</p>}
              </div>
              <NelvyonDsButton disabled={packLoading} onClick={() => void installStarterPack()}>
                {packLoading ? "Instalando…" : "Instalar kit"}
              </NelvyonDsButton>
            </div>
          </NelvyonDsCard>

          <NelvyonDsCard className="p-5 border-purple-500/20 bg-purple-500/5">
            <p className="font-semibold text-white mb-1">🎚 Autonomía IA (elite)</p>
            <p className="text-sm text-white/50 mb-4">Borrador → solo genera · Propuesta → confirma tú · Ejecutar → auto-acciones</p>
            <div className="flex gap-2 flex-wrap">
              {(["draft", "propose", "execute"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  disabled={eliteSaving}
                  onClick={async () => {
                    setEliteSaving(true);
                    try {
                      await fetch("/api/saas/setup", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ autonomyMode: mode, setupStep: "autonomy" }),
                      });
                      setAutonomyMode(mode);
                      setSetupProgress((p) => ({ ...p, autonomy: true }));
                    } finally {
                      setEliteSaving(false);
                    }
                  }}
                  className={`rounded-lg px-4 py-2 text-sm capitalize transition ${
                    autonomyMode === mode
                      ? "bg-[#0084ff] text-white"
                      : "border border-white/10 text-white/60 hover:border-[#0084ff]/40"
                  }`}
                >
                  {mode === "draft" ? "Borrador" : mode === "propose" ? "Propuesta" : "Ejecutar"}
                </button>
              ))}
            </div>
          </NelvyonDsCard>

          <NelvyonDsCard className="p-5">
            <p className="font-semibold text-white mb-1">🧠 Memoria IA compartida</p>
            <p className="text-sm text-white/50 mb-3">Contexto Moso-style para inbox, agentes y packs</p>
            <div className="flex gap-2 mb-3">
              <input
                value={memoryInput}
                onChange={(e) => setMemoryInput(e.target.value)}
                placeholder="Ej: Somos clínica dental en Madrid, tono cercano…"
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
              <NelvyonDsButton
                disabled={!memoryInput.trim() || eliteSaving}
                onClick={async () => {
                  setEliteSaving(true);
                  try {
                    const res = await fetch("/api/saas/memory", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ content: memoryInput }),
                    });
                    if (res.ok) {
                      setMemoryInput("");
                      await fetch("/api/saas/setup", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ setupStep: "memory" }),
                      });
                      setSetupProgress((p) => ({ ...p, memory: true }));
                      const mem = (await fetch("/api/saas/memory").then((r) => r.json())) as { chunks?: typeof memoryChunks };
                      setMemoryChunks(mem.chunks ?? []);
                    }
                  } finally {
                    setEliteSaving(false);
                  }
                }}
              >
                Guardar
              </NelvyonDsButton>
            </div>
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {memoryChunks.slice(0, 8).map((c) => (
                <li key={c.id} className="text-xs text-white/60 border-b border-white/5 pb-2">
                  {c.content.slice(0, 120)}{c.content.length > 120 ? "…" : ""}
                </li>
              ))}
            </ul>
          </NelvyonDsCard>

          {featuredTemplate && (
            <section>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">
                Landing premium Nelvyon
              </p>
              <FeaturedEnvatoTemplateCard template={featuredTemplate} onImported={load} />
            </section>
          )}

          {grouped.map(([category, items]) => (
            <section key={category}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">
                {CATEGORY_LABELS[category] ?? category}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((item) => (
                  <NelvyonDsCard key={item.id} className="p-4 flex gap-3 items-start">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${STATUS_CLS[item.status]}`}
                    >
                      {STATUS_ICON[item.status]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="text-xs text-white/50 mt-1">{item.detail}</p>
                      <Link
                        href={item.href}
                        className="inline-block mt-2 text-xs font-semibold text-[#0084ff] hover:underline"
                      >
                        {item.actionable ? "Configurar →" : "Ver módulo →"}
                      </Link>
                    </div>
                  </NelvyonDsCard>
                ))}
              </div>
            </section>
          ))}

          <section>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">
              Activación del producto ({report.activation.percent}%)
            </p>
            <ActivationChecklist />
          </section>

          {report.score >= 90 && (
            <NelvyonDsCard className="p-6 text-center border-emerald-500/30 bg-emerald-500/10">
              <p className="text-lg font-semibold text-emerald-300">✓ Cuenta en estado óptimo</p>
              <p className="text-sm text-white/60 mt-2">Tu Nelvyon está listo para operar a escala.</p>
              <Link href="/saas/dashboard" className="inline-block mt-4 text-sm font-semibold text-[#0084ff] hover:underline">
                Ir al dashboard →
              </Link>
            </NelvyonDsCard>
          )}
        </>
      )}
    </SaasShellLayout>
  );
}
