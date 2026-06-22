"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type FunnelStatus = "draft" | "active" | "paused";
type StepType = "landing" | "form" | "video" | "checkout" | "upsell" | "thankyou";

interface FunnelStep { id: string; type: StepType; name: string; conversions: number; visitors: number }
interface Funnel {
  id: string; name: string; description: string | null; status: FunnelStatus;
  steps: FunnelStep[]; totalVisitors: number; totalConversions: number; revenue: number; createdAt: string;
}

const STEP_TYPES: { type: StepType; label: string; icon: string }[] = [
  { type: "landing", label: "Landing Page", icon: "🏠" },
  { type: "form", label: "Formulario", icon: "📋" },
  { type: "video", label: "Video VSL", icon: "🎥" },
  { type: "checkout", label: "Checkout", icon: "💳" },
  { type: "upsell", label: "Upsell", icon: "⬆️" },
  { type: "thankyou", label: "Gracias", icon: "✅" },
];

function uid() { return Math.random().toString(36).slice(2, 8); }

function NewFunnelModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [steps, setSteps] = useState<FunnelStep[]>([
    { id: uid(), type: "landing", name: "Landing Page", conversions: 0, visitors: 0 },
    { id: uid(), type: "form", name: "Formulario de captación", conversions: 0, visitors: 0 },
    { id: uid(), type: "thankyou", name: "Página de gracias", conversions: 0, visitors: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addStep(type: StepType) {
    const cfg = STEP_TYPES.find(s => s.type === type)!;
    setSteps(prev => [...prev, { id: uid(), type, name: cfg.label, conversions: 0, visitors: 0 }]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/v1/funnel_builder/funnels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: desc.trim() || null, steps }),
      });
      if (!res.ok) throw new Error("Error al crear funnel");
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Nuevo funnel</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={save} className="space-y-5 p-6">
          {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Funnel de captación de leads"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none text-foreground" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Descripción</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Para captar leads B2B"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none text-foreground" />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Pasos del funnel</p>
            <div className="space-y-2">
              {steps.map((step, i) => {
                const cfg = STEP_TYPES.find(s => s.type === step.type)!;
                return (
                  <div key={step.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/50 px-4 py-2.5">
                    <span className="text-lg">{cfg.icon}</span>
                    <span className="text-sm font-medium text-foreground flex-1">{i + 1}. {step.name}</span>
                    <span className="text-xs text-muted-foreground">{cfg.label}</span>
                    <button type="button" onClick={() => setSteps(p => p.filter(s => s.id !== step.id))} className="text-red-400 text-xs hover:text-red-300">✕</button>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {STEP_TYPES.map(t => (
                <button key={t.type} type="button" onClick={() => addStep(t.type)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
                  + {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Creando…" : "Crear funnel"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SaasFunnelsPage() {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/funnel_builder/funnels");
      const data = (await res.json().catch(() => ({ funnels: [] }))) as { funnels: Funnel[] };
      setFunnels(data.funnels ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalRevenue = funnels.reduce((s, f) => s + f.revenue, 0);
  const avgCvr = funnels.length > 0
    ? funnels.reduce((s, f) => s + (f.totalVisitors > 0 ? f.totalConversions / f.totalVisitors : 0), 0) / funnels.length * 100
    : 0;

  return (
    <DashboardLayout sidebar={<SaasSidebar activeId="workflows" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader title="Funnel Builder" subtitle="Crea embudos de conversión multipaso que venden solos" />
          <NelvyonDsButton onClick={() => setShowNew(true)}>+ Nuevo funnel</NelvyonDsButton>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Funnels", value: funnels.length },
            { label: "Activos", value: funnels.filter(f => f.status === "active").length },
            { label: "Revenue total", value: `${totalRevenue.toFixed(0)}€` },
            { label: "CVR medio", value: `${avgCvr.toFixed(1)}%` },
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/30" />)}</div>
        ) : funnels.length === 0 ? (
          <NelvyonDsCard className="p-16 text-center">
            <p className="text-5xl">🚀</p>
            <p className="mt-4 text-lg font-semibold text-foreground">Sin funnels</p>
            <p className="mt-2 text-sm text-muted-foreground">Crea tu primer funnel de ventas o captación de leads</p>
            <NelvyonDsButton className="mt-5" onClick={() => setShowNew(true)}>+ Nuevo funnel</NelvyonDsButton>
          </NelvyonDsCard>
        ) : (
          <div className="space-y-3">
            {funnels.map(f => (
              <NelvyonDsCard key={f.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{f.name}</p>
                      <NelvyonDsBadge tone={f.status === "active" ? "success" : "primary"} size="sm">
                        {f.status === "active" ? "Activo" : f.status === "paused" ? "Pausado" : "Borrador"}
                      </NelvyonDsBadge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {f.steps.map((s, i) => {
                        const cfg = STEP_TYPES.find(t => t.type === s.type)!;
                        return (
                          <span key={s.id} className="flex items-center gap-1 rounded-lg bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground">
                            {i > 0 && <span className="text-border">→</span>}
                            {cfg.icon} {s.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-6 text-center text-sm">
                    <div><p className="text-xs text-muted-foreground">Visitas</p><p className="font-semibold text-foreground">{f.totalVisitors.toLocaleString()}</p></div>
                    <div><p className="text-xs text-muted-foreground">Conversiones</p><p className="font-semibold text-foreground">{f.totalConversions}</p></div>
                    <div><p className="text-xs text-muted-foreground">Revenue</p><p className="font-semibold text-green-400">{f.revenue.toFixed(0)}€</p></div>
                  </div>
                </div>
              </NelvyonDsCard>
            ))}
          </div>
        )}
      </div>
      {showNew && <NewFunnelModal onClose={() => setShowNew(false)} onSaved={load} />}
    </DashboardLayout>
  );
}
