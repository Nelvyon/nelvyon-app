"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { NelvyonDsBadge, NelvyonDsButton } from "@/design-system/components";
import { SaasShellLayout, DarkCard } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

// ─── Types ──────────────────────────────────────────────────────────────────

type FunnelStatus = "draft" | "active" | "paused" | "archived";
type StepType = "landing" | "form" | "video" | "checkout" | "upsell" | "thankyou";
type BuilderTab = "steps" | "analytics";

interface FunnelStep {
  id: string; type: StepType; name: string; content: string | null;
  ctaLabel: string | null; ctaUrl: string | null;
  stepOrder: number; visitors: number; conversions: number;
}
interface FunnelVariant {
  id: string; stepId: string; variantKey: "A" | "B";
  content: Record<string, unknown>; weightPct: number;
  visitors: number; conversions: number;
}
interface Funnel {
  id: string; name: string; description: string | null; status: FunnelStatus;
  steps: FunnelStep[]; publicSlug: string | null; publishedAt: string | null;
  totalVisitors: number; totalConversions: number; createdAt: string;
}
interface AnalyticsStep {
  id: string; name: string; type: string; stepOrder: number;
  visitors: number; conversions: number; cvr: number; dropOff: number;
  variants: Array<{ variantKey: string; visitors: number; conversions: number; cvr: number }>;
}
interface Analytics {
  funnelId: string; totalVisitors: number; totalConversions: number; overallCvr: number;
  steps: AnalyticsStep[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STEP_TYPES: { type: StepType; label: string; icon: string }[] = [
  { type: "landing", label: "Landing Page", icon: "🏠" },
  { type: "form", label: "Formulario", icon: "📋" },
  { type: "video", label: "Video VSL", icon: "🎥" },
  { type: "checkout", label: "Checkout", icon: "💳" },
  { type: "upsell", label: "Upsell", icon: "⬆️" },
  { type: "thankyou", label: "Gracias", icon: "✅" },
];

const inputCls = "w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#0084ff]/60";
const labelCls = "block text-[10px] uppercase tracking-wider text-white/30 mb-1";
const statusTone = (s: FunnelStatus) => s === "active" ? "success" : s === "paused" ? "warning" : "neutral";

// ─── New Funnel Modal ─────────────────────────────────────────────────────────

function NewFunnelModal({ onClose, onSaved }: { onClose(): void; onSaved(id: string): void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/saas/funnels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: name.trim(), description: desc.trim() || null,
          steps: [
            { type: "landing", name: "Landing Page" },
            { type: "form", name: "Formulario" },
            { type: "thankyou", name: "Gracias" },
          ],
        }),
      });
      if (!res.ok) throw new Error((await res.json() as { error?: string }).error ?? "Error al crear funnel");
      const data = (await res.json()) as { funnel: Funnel };
      onSaved(data.funnel.id);
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#020817] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-base font-semibold text-white">Nuevo funnel</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">✕</button>
        </div>
        <form onSubmit={save} className="space-y-4 p-5">
          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
          <div>
            <label className={labelCls}>Nombre *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Funnel de captación de leads" className={inputCls} autoFocus />
          </div>
          <div>
            <label className={labelCls}>Descripción</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción opcional" className={inputCls} />
          </div>
          <div className="flex gap-3 pt-2">
            <NelvyonDsButton type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Creando…" : "Crear funnel"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Step Editor Panel ────────────────────────────────────────────────────────

function StepEditor({
  step, funnelId, onUpdated,
}: { step: FunnelStep; funnelId: string; onUpdated(s: FunnelStep): void }) {
  const [form, setForm] = useState({ name: step.name, content: step.content ?? "", ctaLabel: step.ctaLabel ?? "", ctaUrl: step.ctaUrl ?? "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync when step changes
  useEffect(() => {
    setForm({ name: step.name, content: step.content ?? "", ctaLabel: step.ctaLabel ?? "", ctaUrl: step.ctaUrl ?? "" });
  }, [step.id, step.name, step.content, step.ctaLabel, step.ctaUrl]);

  async function saveStep() {
    setSaving(true); setSaved(false);
    try {
      const res = await fetch(`/api/saas/funnels/${funnelId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          action: "update_step", step_id: step.id,
          name: form.name, content: form.content || null,
          cta_label: form.ctaLabel || null, cta_url: form.ctaUrl || null,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const data = (await res.json()) as { step: FunnelStep };
      onUpdated(data.step);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }

  const cfg = STEP_TYPES.find(s => s.type === step.type)!;

  return (
    <DarkCard className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{cfg.icon}</span>
        <span className="text-sm font-semibold text-white">{cfg.label}</span>
        <span className="ml-auto text-[10px] text-white/30">Paso {step.stepOrder + 1}</span>
      </div>
      <div>
        <label className={labelCls}>Nombre del paso</label>
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Contenido HTML</label>
        <textarea
          value={form.content}
          onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
          rows={5} placeholder="<h1>Tu oferta</h1><p>Descripción…</p>"
          className={inputCls + " resize-y font-mono text-xs"}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>CTA Label</label>
          <input value={form.ctaLabel} onChange={e => setForm(f => ({ ...f, ctaLabel: e.target.value }))} placeholder="Siguiente →" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>CTA URL (opcional)</label>
          <input value={form.ctaUrl} onChange={e => setForm(f => ({ ...f, ctaUrl: e.target.value }))} placeholder="https://…" className={inputCls} />
        </div>
      </div>
      <div className="flex items-center gap-3 pt-1">
        <NelvyonDsButton onClick={() => void saveStep()} disabled={saving}>
          {saving ? "Guardando…" : "Guardar paso"}
        </NelvyonDsButton>
        {saved && <span className="text-xs text-emerald-400">✓ Guardado</span>}
      </div>
    </DarkCard>
  );
}

// ─── AB Variant Panel ─────────────────────────────────────────────────────────

function AbVariantPanel({ step, funnelId }: { step: FunnelStep; funnelId: string }) {
  const [variants, setVariants] = useState<FunnelVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    void fetch(`/api/saas/funnels/${funnelId}?resource=variants&stepId=${step.id}`, { credentials: "same-origin" })
      .then(r => r.json() as Promise<{ variants: FunnelVariant[] }>)
      .then(d => setVariants(d.variants ?? []))
      .finally(() => setLoading(false));
  }, [step.id, funnelId]);

  async function enableAb() {
    setSaving(true);
    try {
      await fetch(`/api/saas/funnels/${funnelId}`, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add-variant", step_id: step.id, variant_key: "A", weight_pct: 50, content: { html: "", ctaLabel: "", ctaUrl: "" } }),
      });
      await fetch(`/api/saas/funnels/${funnelId}`, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add-variant", step_id: step.id, variant_key: "B", weight_pct: 50, content: { html: "", ctaLabel: "", ctaUrl: "" } }),
      });
      const res = await fetch(`/api/saas/funnels/${funnelId}?resource=variants&stepId=${step.id}`, { credentials: "same-origin" });
      const data = (await res.json()) as { variants: FunnelVariant[] };
      setVariants(data.variants ?? []);
    } finally { setSaving(false); }
  }

  async function updateWeight(variantId: string, weightPct: number) {
    await fetch(`/api/saas/funnels/${funnelId}`, {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-variant-weight", variant_id: variantId, weight_pct: weightPct }),
    });
    setVariants(vs => vs.map(v => v.id === variantId ? { ...v, weightPct } : v));
  }

  if (loading) return <DarkCard><p className="text-xs text-white/40">Cargando variantes…</p></DarkCard>;

  if (!variants.length) {
    return (
      <DarkCard>
        <p className="text-xs text-white/50 mb-3">A/B testing no activado para este paso.</p>
        <NelvyonDsButton onClick={() => void enableAb()} disabled={saving} variant="secondary">
          {saving ? "Activando…" : "Activar A/B para este paso"}
        </NelvyonDsButton>
      </DarkCard>
    );
  }

  return (
    <DarkCard className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/30">A/B Testing activo</p>
      {variants.map(v => (
        <div key={v.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Variante {v.variantKey}</span>
            <span className="text-xs text-white/40">{v.visitors} vis · {v.conversions} conv</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range" min={0} max={100} value={v.weightPct}
              onChange={e => void updateWeight(v.id, Number(e.target.value))}
              className="flex-1 accent-[#0084ff]"
            />
            <span className="w-10 text-right text-sm font-semibold text-white">{v.weightPct}%</span>
          </div>
        </div>
      ))}
      <p className="text-[10px] text-white/25">
        Los pesos determinan la distribución de tráfico. Suma recomendada: 100%.
      </p>
    </DarkCard>
  );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────

function AnalyticsPanel({ funnelId }: { funnelId: string }) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch(`/api/saas/funnels/${funnelId}?resource=analytics`, { credentials: "same-origin" })
      .then(r => r.json() as Promise<{ analytics: Analytics }>)
      .then(d => setAnalytics(d.analytics ?? null))
      .finally(() => setLoading(false));
  }, [funnelId]);

  if (loading) return <DarkCard><div className="h-24 animate-pulse rounded-lg bg-white/[0.04]" /></DarkCard>;
  if (!analytics) return <DarkCard><p className="text-sm text-white/40">No hay datos de analytics.</p></DarkCard>;

  const maxVisitors = Math.max(...analytics.steps.map(s => s.visitors), 1);

  return (
    <DarkCard className="space-y-4">
      <div className="flex gap-6">
        <div>
          <p className="text-[10px] uppercase text-white/30">Visitas totales</p>
          <p className="text-xl font-bold text-white">{analytics.totalVisitors.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-white/30">Conversiones</p>
          <p className="text-xl font-bold text-white">{analytics.totalConversions.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-white/30">CVR global</p>
          <p className="text-xl font-bold text-[#0084ff]">{analytics.overallCvr}%</p>
        </div>
      </div>
      <div className="space-y-2">
        {analytics.steps.map(s => (
          <div key={s.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/70 font-medium">{s.name}</span>
              <span className="text-white/40">{s.visitors} · CVR {s.cvr}% {s.dropOff > 0 && <span className="text-red-400">· ↓{s.dropOff}%</span>}</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#0084ff]"
                style={{ width: `${(s.visitors / maxVisitors) * 100}%` }}
              />
            </div>
            {s.variants.length > 0 && (
              <div className="flex gap-3 pl-2 mt-0.5">
                {s.variants.map(v => (
                  <span key={v.variantKey} className="text-[10px] text-white/30">
                    {v.variantKey}: {v.visitors} vis · CVR {v.cvr}%
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </DarkCard>
  );
}

// ─── Builder View ─────────────────────────────────────────────────────────────

function BuilderView({ funnel, onBack, onFunnelUpdated }: {
  funnel: Funnel; onBack(): void; onFunnelUpdated(f: Funnel): void;
}) {
  const [selectedStep, setSelectedStep] = useState<FunnelStep | null>(funnel.steps[0] ?? null);
  const [builderTab, setBuilderTab] = useState<BuilderTab>("steps");
  const [abStep, setAbStep] = useState<FunnelStep | null>(null);
  const [localSteps, setLocalSteps] = useState<FunnelStep[]>(funnel.steps);
  const [publishing, setPublishing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  async function moveStep(stepId: string, dir: "up" | "down") {
    const idx = localSteps.findIndex(s => s.id === stepId);
    if (idx === -1) return;
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= localSteps.length) return;
    const newOrder = [...localSteps];
    const tmp = newOrder[idx]!; newOrder[idx] = newOrder[targetIdx]!; newOrder[targetIdx] = tmp;
    // Update step orders
    await Promise.all(newOrder.map((s, i) =>
      fetch(`/api/saas/funnels/${funnel.id}`, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_step", step_id: s.id, step_order: i }),
      }),
    ));
    setLocalSteps(newOrder.map((s, i) => ({ ...s, stepOrder: i })));
    if (selectedStep?.id === stepId) setSelectedStep(prev => prev ? { ...prev, stepOrder: targetIdx } : prev);
  }

  async function addStep(type: StepType) {
    const cfg = STEP_TYPES.find(s => s.type === type)!;
    const res = await fetch(`/api/saas/funnels/${funnel.id}`, {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "step", type, name: cfg.label }),
    });
    if (res.ok) {
      const data = (await res.json()) as { step: FunnelStep };
      setLocalSteps(prev => [...prev, data.step]);
    }
  }

  async function removeStep(stepId: string) {
    const res = await fetch(`/api/saas/funnels/${funnel.id}`, {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_step", step_id: stepId }),
    });
    if (res.ok) {
      setLocalSteps(prev => prev.filter(s => s.id !== stepId));
      if (selectedStep?.id === stepId) setSelectedStep(null);
    }
  }

  async function publishFunnel() {
    setPublishing(true);
    try {
      const res = await fetch(`/api/saas/funnels/${funnel.id}`, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      if (res.ok) {
        const data = (await res.json()) as { funnel: Funnel };
        onFunnelUpdated(data.funnel);
      }
    } finally { setPublishing(false); }
  }

  async function pauseFunnel() {
    const res = await fetch(`/api/saas/funnels/${funnel.id}`, {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pause" }),
    });
    if (res.ok) {
      const data = (await res.json()) as { funnel: Funnel };
      onFunnelUpdated(data.funnel);
    }
  }

  function copyPublicUrl() {
    const slug = funnel.publicSlug;
    if (!slug) return;
    const url = `${window.location.origin}/f/${slug}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="text-sm text-white/40 hover:text-white flex items-center gap-1">
          ← Funnels
        </button>
        <h1 className="text-lg font-bold text-white flex-1">{funnel.name}</h1>
        <NelvyonDsBadge tone={statusTone(funnel.status)}>
          {funnel.status === "active" ? "Activo" : funnel.status === "paused" ? "Pausado" : "Borrador"}
        </NelvyonDsBadge>
        <div className="flex gap-2">
          {funnel.status === "draft" && (
            <NelvyonDsButton onClick={() => void publishFunnel()} disabled={publishing}>
              {publishing ? "Publicando…" : "Publicar"}
            </NelvyonDsButton>
          )}
          {funnel.status === "active" && (
            <>
              <NelvyonDsButton variant="secondary" onClick={() => void pauseFunnel()}>Pausar</NelvyonDsButton>
              <NelvyonDsButton variant="secondary" onClick={copyPublicUrl}>
                {copySuccess ? "✓ Copiado" : "Copiar URL pública"}
              </NelvyonDsButton>
            </>
          )}
        </div>
      </div>

      {funnel.publicSlug && (
        <DarkCard className="py-2">
          <p className="text-[10px] uppercase text-white/25 mb-0.5">URL pública</p>
          <code className="text-xs text-[#0084ff] break-all">
            {typeof window !== "undefined" ? window.location.origin : "https://app.nelvyon.com"}/f/{funnel.publicSlug}
          </code>
        </DarkCard>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-1 w-fit">
        {(["steps", "analytics"] as BuilderTab[]).map(t => (
          <button key={t} onClick={() => setBuilderTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${builderTab === t ? "bg-[#0084ff]/15 text-[#0084ff]" : "text-white/40 hover:text-white/70"}`}>
            {t === "steps" ? "Editor de pasos" : "Analytics"}
          </button>
        ))}
      </div>

      {builderTab === "analytics" && <AnalyticsPanel funnelId={funnel.id} />}

      {builderTab === "steps" && (
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Steps sidebar */}
          <div className="space-y-2">
            <DarkCard>
              <p className="text-[10px] uppercase tracking-wider text-white/25 mb-3">Pasos ({localSteps.length})</p>
              {localSteps.length === 0 && (
                <p className="text-xs text-white/30">Sin pasos — añade el primero abajo.</p>
              )}
              <div className="space-y-1.5">
                {localSteps.map((s, i) => {
                  const cfg = STEP_TYPES.find(t => t.type === s.type)!;
                  const isSelected = selectedStep?.id === s.id;
                  return (
                    <div key={s.id} className={`group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors ${isSelected ? "bg-[#0084ff]/15 border border-[#0084ff]/30" : "border border-white/[0.04] hover:bg-white/[0.04]"}`}
                      onClick={() => { setSelectedStep(s); setAbStep(null); }}>
                      <span className="text-base">{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{i + 1}. {s.name}</p>
                        <p className="text-[10px] text-white/30">{cfg.label}</p>
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={e => { e.stopPropagation(); void moveStep(s.id, "up"); }}
                          disabled={i === 0} className="text-white/40 hover:text-white disabled:opacity-20 text-[10px] px-1">↑</button>
                        <button onClick={e => { e.stopPropagation(); void moveStep(s.id, "down"); }}
                          disabled={i === localSteps.length - 1} className="text-white/40 hover:text-white disabled:opacity-20 text-[10px] px-1">↓</button>
                        <button onClick={e => { e.stopPropagation(); void removeStep(s.id); }}
                          className="text-red-400/60 hover:text-red-400 text-[10px] px-1">✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Add step buttons */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {STEP_TYPES.map(t => (
                  <button key={t.type} onClick={() => void addStep(t.type)}
                    className="rounded-md border border-white/[0.06] px-2 py-1 text-[10px] text-white/40 hover:border-[#0084ff]/40 hover:text-white/70 transition-colors">
                    + {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </DarkCard>
          </div>

          {/* Step editor */}
          <div className="space-y-4">
            {selectedStep ? (
              <>
                <StepEditor
                  step={selectedStep}
                  funnelId={funnel.id}
                  onUpdated={updated => {
                    setLocalSteps(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
                    setSelectedStep(updated);
                  }}
                />
                {/* A/B toggle */}
                <div>
                  <button
                    onClick={() => setAbStep(prev => prev?.id === selectedStep.id ? null : selectedStep)}
                    className="mb-2 text-xs text-[#0084ff] hover:underline">
                    {abStep?.id === selectedStep.id ? "▲ Ocultar A/B" : "▼ Configurar A/B Testing"}
                  </button>
                  {abStep?.id === selectedStep.id && (
                    <AbVariantPanel step={selectedStep} funnelId={funnel.id} />
                  )}
                </div>
              </>
            ) : (
              <DarkCard>
                <p className="text-sm text-white/40 text-center py-8">Selecciona un paso para editarlo.</p>
              </DarkCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────

export default function SaasFunnelsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const funnelId = searchParams?.get("id") ?? null;

  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FunnelStatus | "all">("all");
  const [builderFunnel, setBuilderFunnel] = useState<Funnel | null>(null);
  const [funnelTemplates, setFunnelTemplates] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [importingFunnelTpl, setImportingFunnelTpl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/funnels", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({ funnels: [] }))) as { funnels: Funnel[] };
      setFunnels(data.funnels ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    fetch("/api/saas/funnels/templates")
      .then((r) => r.json())
      .then((d: { templates?: Array<{ id: string; name: string; description: string }> }) => setFunnelTemplates(d.templates ?? []))
      .catch(() => {});
  }, []);

  async function importFunnelTemplate(id: string) {
    setImportingFunnelTpl(id);
    try {
      const res = await fetch("/api/saas/funnels/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", template_id: id }),
      });
      if (res.ok) await load();
    } finally {
      setImportingFunnelTpl(null);
    }
  }

  // Open builder if ?id= is set
  useEffect(() => {
    if (!funnelId || !funnels.length) return;
    const f = funnels.find(x => x.id === funnelId);
    if (f) setBuilderFunnel(f);
  }, [funnelId, funnels]);

  function openBuilder(f: Funnel) {
    setBuilderFunnel(f);
    router.push(`/saas/funnels?id=${f.id}`, { scroll: false });
  }

  function closeBuilder() {
    setBuilderFunnel(null);
    router.push("/saas/funnels", { scroll: false });
  }

  const filtered = statusFilter === "all" ? funnels : funnels.filter(f => f.status === statusFilter);
  const totalVisitors = funnels.reduce((s, f) => s + f.totalVisitors, 0);
  const totalConversions = funnels.reduce((s, f) => s + f.totalConversions, 0);
  const overallCvr = totalVisitors > 0 ? ((totalConversions / totalVisitors) * 100).toFixed(1) : "0.0";

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="funnels" />}>
      {builderFunnel ? (
        <BuilderView
          funnel={builderFunnel}
          onBack={closeBuilder}
          onFunnelUpdated={updated => {
            setBuilderFunnel(updated);
            setFunnels(prev => prev.map(f => f.id === updated.id ? updated : f));
          }}
        />
      ) : (
        <div className="space-y-6 pb-8">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#0084ff]/70">Marketing</p>
              <h1 className="mt-1 text-2xl font-bold text-white">Funnel Builder</h1>
              <p className="mt-0.5 text-sm text-white/40">Editor visual de embudos con A/B testing y analytics.</p>
            </div>
            <NelvyonDsButton onClick={() => setShowNew(true)}>+ Nuevo funnel</NelvyonDsButton>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Funnels", value: funnels.length },
              { label: "Activos", value: funnels.filter(f => f.status === "active").length },
              { label: "Visitas totales", value: totalVisitors.toLocaleString() },
              { label: "CVR global", value: `${overallCvr}%` },
            ].map(({ label, value }) => (
              <DarkCard key={label} className="py-3">
                <p className="text-[10px] uppercase text-white/30">{label}</p>
                <p className="mt-1 text-2xl font-bold text-white">{value}</p>
              </DarkCard>
            ))}
          </div>

          {funnelTemplates.length > 0 && (
            <DarkCard className="p-4">
              <p className="text-sm font-semibold text-white">Plantillas funnel Nelvyon ({funnelTemplates.length})</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {funnelTemplates.map((t) => (
                  <div key={t.id} className="rounded-lg border border-white/10 p-3">
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    <p className="text-xs text-white/40 mt-0.5">{t.description}</p>
                    <NelvyonDsButton className="mt-2 w-full" size="sm" disabled={importingFunnelTpl === t.id}
                      onClick={() => void importFunnelTemplate(t.id)}>
                      {importingFunnelTpl === t.id ? "…" : "Importar funnel"}
                    </NelvyonDsButton>
                  </div>
                ))}
              </div>
            </DarkCard>
          )}

          {/* Status filter tabs */}
          <div className="flex gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-1 w-fit">
            {(["all", "draft", "active", "paused"] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${statusFilter === s ? "bg-[#0084ff]/15 text-[#0084ff]" : "text-white/40 hover:text-white/70"}`}>
                {s === "all" ? "Todos" : s === "draft" ? "Borrador" : s === "active" ? "Activos" : "Pausados"}
              </button>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-white/[0.03]" />)}</div>
          ) : filtered.length === 0 ? (
            <DarkCard className="py-16 text-center">
              <p className="text-4xl">🚀</p>
              <p className="mt-3 text-base font-semibold text-white">Sin funnels{statusFilter !== "all" ? ` (${statusFilter})` : ""}</p>
              <p className="mt-1 text-sm text-white/40">Crea tu primer embudo de ventas o captación de leads</p>
              <div className="mt-5"><NelvyonDsButton onClick={() => setShowNew(true)}>+ Nuevo funnel</NelvyonDsButton></div>
            </DarkCard>
          ) : (
            <div className="space-y-3">
              {filtered.map(f => (
                <DarkCard key={f.id} className="flex flex-wrap items-start justify-between gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white truncate">{f.name}</p>
                      <NelvyonDsBadge tone={statusTone(f.status)}>
                        {f.status === "active" ? "Activo" : f.status === "paused" ? "Pausado" : "Borrador"}
                      </NelvyonDsBadge>
                    </div>
                    {f.description && <p className="mt-0.5 text-xs text-white/40 truncate">{f.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {f.steps.slice(0, 6).map((s, i) => {
                        const cfg = STEP_TYPES.find(t => t.type === s.type)!;
                        return (
                          <span key={s.id} className="flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/50">
                            {i > 0 && <span className="text-white/20">→</span>}
                            {cfg.icon} {s.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-xs text-white/40">
                      <p>{f.totalVisitors.toLocaleString()} visitas</p>
                      <p>{f.totalConversions.toLocaleString()} conv.</p>
                    </div>
                    <NelvyonDsButton variant="secondary" onClick={() => openBuilder(f)}>
                      Abrir builder
                    </NelvyonDsButton>
                  </div>
                </DarkCard>
              ))}
            </div>
          )}
        </div>
      )}
      {showNew && (
        <NewFunnelModal
          onClose={() => setShowNew(false)}
          onSaved={id => {
            void load().then(() => {
              const f = funnels.find(x => x.id === id);
              if (f) openBuilder(f);
            });
          }}
        />
      )}
    </SaasShellLayout>
  );
}
