"use client";

import { useCallback, useEffect, useState } from "react";

import {
  NelvyonDsBadge,
  NelvyonDsButton,
  NelvyonDsCard,
  NelvyonDsSectionHeader,
} from "@/design-system/components";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

// ─── Types ────────────────────────────────────────────────────────────────────

type AdPlatform = "google" | "meta" | "tiktok" | "snapchat";
type AdStatus = "active" | "paused" | "ended" | "pending";
type ObjectiveType = "traffic" | "leads" | "conversions" | "awareness" | "engagement";

interface AdCampaign {
  id: string;
  platform: AdPlatform;
  name: string;
  status: AdStatus;
  objective: ObjectiveType;
  budgetDaily: number;
  budgetTotal: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  roas: number;
  startDate: string;
  endDate: string | null;
}

const PLATFORM_CFG: Record<AdPlatform, { label: string; icon: string; color: string }> = {
  google: { label: "Google Ads", icon: "🔍", color: "text-blue-400" },
  meta: { label: "Meta Ads", icon: "📘", color: "text-blue-300" },
  tiktok: { label: "TikTok Ads", icon: "🎵", color: "text-purple-400" },
  snapchat: { label: "Snapchat Ads", icon: "👻", color: "text-yellow-400" },
};

const OBJ_LABELS: Record<ObjectiveType, string> = {
  traffic: "Tráfico",
  leads: "Leads",
  conversions: "Conversiones",
  awareness: "Alcance",
  engagement: "Engagement",
};

const STATUS_TONE = { active: "success", paused: "warning", ended: "primary", pending: "primary" } as const;
const STATUS_LABELS = { active: "Activa", paused: "Pausada", ended: "Finalizada", pending: "Pendiente" } as const;

function fmt(n: number) { return n.toLocaleString("es-ES", { maximumFractionDigits: 2 }); }
function eur(n: number) { return `${n.toFixed(2)} €`; }

// ─── New campaign modal ───────────────────────────────────────────────────────

function NewCampaignModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [platform, setPlatform] = useState<AdPlatform>("google");
  const [name, setName] = useState("");
  const [objective, setObjective] = useState<ObjectiveType>("leads");
  const [budgetDaily, setBudgetDaily] = useState("10");
  const [budgetTotal, setBudgetTotal] = useState("300");
  const [startDate, setStartDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !startDate) { setError("Nombre y fecha de inicio son obligatorios"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/${platform}_ads/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          objective,
          budget_daily: parseFloat(budgetDaily),
          budget_total: parseFloat(budgetTotal),
          start_date: startDate,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(j.detail ?? `Error en ${PLATFORM_CFG[platform].label}: ¿credenciales configuradas?`);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-semibold text-foreground">Nueva campaña publicitaria</h2>
        {error && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Plataforma *</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["google", "meta", "tiktok", "snapchat"] as AdPlatform[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`rounded-xl border p-3 text-center text-sm transition-all ${platform === p ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}
                >
                  <div className="text-xl">{PLATFORM_CFG[p].icon}</div>
                  <div className="mt-1 text-xs">{PLATFORM_CFG[p].label.split(" ")[0]}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaña de leads Q3 2026"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Objetivo</label>
              <select value={objective} onChange={(e) => setObjective(e.target.value as ObjectiveType)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
                {Object.entries(OBJ_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Fecha inicio</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Presupuesto diario (€)</label>
              <input type="number" min="1" step="0.01" value={budgetDaily} onChange={(e) => setBudgetDaily(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Presupuesto total (€)</label>
              <input type="number" min="1" step="0.01" value={budgetTotal} onChange={(e) => setBudgetTotal(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-xs text-yellow-400">
            ⚠️ Requiere credenciales de API en Railway: <code>GOOGLE_ADS_*</code>, <code>META_ADS_*</code>, etc.
          </div>
          <div className="flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Creando…" : "Crear campaña"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SaasPublicidadPage() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<AdPlatform | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/ads_agent/campaigns");
      const data = (await res.json().catch(() => ({ campaigns: [] }))) as { campaigns: AdCampaign[] };
      setCampaigns(data.campaigns ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = filterPlatform === "all" ? campaigns : campaigns.filter((c) => c.platform === filterPlatform);

  const totals = {
    active: campaigns.filter((c) => c.status === "active").length,
    spent: campaigns.reduce((s, c) => s + c.spent, 0),
    impressions: campaigns.reduce((s, c) => s + c.impressions, 0),
    conversions: campaigns.reduce((s, c) => s + c.conversions, 0),
  };

  return (
    <DashboardLayout sidebar={<SaasSidebar activeId="campanias" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader
            title="Publicidad Digital"
            subtitle="Gestiona campañas en Google, Meta, TikTok y Snapchat"
          />
          <NelvyonDsButton onClick={() => setShowNew(true)}>+ Nueva campaña</NelvyonDsButton>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Campañas activas", value: totals.active },
            { label: "Total invertido", value: eur(totals.spent) },
            { label: "Impresiones", value: fmt(totals.impressions) },
            { label: "Conversiones", value: fmt(totals.conversions) },
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {/* Platform tabs */}
        <div className="flex flex-wrap gap-2">
          {(["all", "google", "meta", "tiktok", "snapchat"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setFilterPlatform(p as AdPlatform | "all")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filterPlatform === p ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}
            >
              {p === "all" ? "Todas" : `${PLATFORM_CFG[p].icon} ${PLATFORM_CFG[p].label.split(" ")[0]}`}
            </button>
          ))}
        </div>

        {/* Campaigns */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/30" />)}
          </div>
        ) : filtered.length === 0 ? (
          <NelvyonDsCard className="p-16 text-center">
            <p className="text-5xl">📢</p>
            <p className="mt-4 text-lg font-semibold text-foreground">Sin campañas publicitarias</p>
            <p className="mt-2 text-sm text-muted-foreground">Crea tu primera campaña para empezar a conseguir clientes</p>
            <NelvyonDsButton className="mt-5" onClick={() => setShowNew(true)}>+ Nueva campaña</NelvyonDsButton>
          </NelvyonDsCard>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((c) => {
              const cfg = PLATFORM_CFG[c.platform];
              return (
                <NelvyonDsCard key={c.id} className="p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <span className="text-2xl">{cfg.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{c.name}</p>
                        <NelvyonDsBadge tone={STATUS_TONE[c.status]} size="sm">{STATUS_LABELS[c.status]}</NelvyonDsBadge>
                        <span className="text-xs text-muted-foreground">{OBJ_LABELS[c.objective]}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4 lg:grid-cols-6">
                        <div><p className="text-xs text-muted-foreground">Gastado</p><p className="font-medium text-foreground">{eur(c.spent)}</p></div>
                        <div><p className="text-xs text-muted-foreground">Presup/día</p><p className="font-medium text-foreground">{eur(c.budgetDaily)}</p></div>
                        <div><p className="text-xs text-muted-foreground">Impresiones</p><p className="font-medium text-foreground">{fmt(c.impressions)}</p></div>
                        <div><p className="text-xs text-muted-foreground">CTR</p><p className="font-medium text-foreground">{c.ctr.toFixed(2)}%</p></div>
                        <div><p className="text-xs text-muted-foreground">CPC</p><p className="font-medium text-foreground">{eur(c.cpc)}</p></div>
                        <div><p className="text-xs text-muted-foreground">ROAS</p><p className={`font-semibold ${c.roas >= 2 ? "text-green-400" : c.roas >= 1 ? "text-yellow-400" : "text-red-400"}`}>{c.roas.toFixed(2)}x</p></div>
                      </div>
                    </div>
                  </div>
                </NelvyonDsCard>
              );
            })}
          </div>
        )}
      </div>

      {showNew && <NewCampaignModal onClose={() => setShowNew(false)} onSaved={load} />}
    </DashboardLayout>
  );
}
