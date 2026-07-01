"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasDegradedBanner } from "@/features/saas-shell/components/SaasDegradedBanner";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type AdsPlatform = "meta" | "google" | "linkedin" | "tiktok" | "snapchat";

interface AdsStatusResult {
  platform: AdsPlatform;
  connected: boolean;
  accountName?: string;
  tokenExpired?: boolean;
}

interface AdsMetrics {
  platform: AdsPlatform;
  dateStart: string;
  dateEnd: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number | null;
  cpc: number | null;
  roas: number | null;
  fromCache: boolean;
  fetchedAt: string;
}

const PLATFORM_CFG: Record<AdsPlatform, { label: string; icon: string; tokenLabel: string; tokenPlaceholder: string }> = {
  google: { label: "Google Ads", icon: "🔍", tokenLabel: "OAuth Access Token", tokenPlaceholder: "ya29..." },
  meta: { label: "Meta Ads", icon: "📘", tokenLabel: "Access Token", tokenPlaceholder: "EAAG..." },
  linkedin: { label: "LinkedIn Ads", icon: "💼", tokenLabel: "Access Token", tokenPlaceholder: "AQV..." },
  tiktok: { label: "TikTok Ads", icon: "🎵", tokenLabel: "Access Token", tokenPlaceholder: "d4ff..." },
  snapchat: { label: "Snapchat Ads", icon: "👻", tokenLabel: "OAuth Access Token", tokenPlaceholder: "Bearer token..." },
};

function fmt(n: number) { return n.toLocaleString("es-ES", { maximumFractionDigits: 2 }); }
function eur(n: number) { return `${n.toFixed(2)} EUR`; }
function today() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }

function ConnectModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [platform, setPlatform] = useState<AdsPlatform>("meta");
  const [accountId, setAccountId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId.trim() || !accessToken.trim()) { setError("Account ID y Access Token son obligatorios"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/saas/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, account_id: accountId.trim(), account_name: accountName.trim() || accountId.trim(), access_token: accessToken.trim() }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Error al conectar cuenta");
      }
      onSaved(); onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">Conectar cuenta publicitaria</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">x</button>
        </div>
        {error && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Plataforma</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(PLATFORM_CFG) as AdsPlatform[]).map((p) => (
                <button key={p} type="button" onClick={() => setPlatform(p)}
                  className={`rounded-xl border p-3 text-center text-sm transition-all ${platform === p ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  <div className="text-xl">{PLATFORM_CFG[p].icon}</div>
                  <div className="mt-1 text-xs">{PLATFORM_CFG[p].label.split(" ")[0]}</div>
                </button>
              ))}
            </div>
          </div>
          {(platform === "meta" || platform === "google" || platform === "linkedin" || platform === "tiktok") && (
            <div className="rounded-lg border border-[#0084ff]/20 bg-[#0084ff]/5 px-4 py-3 space-y-2">
              <p className="text-xs text-muted-foreground">Conexión recomendada — OAuth oficial:</p>
              <div className="flex flex-wrap gap-2">
                {platform === "meta" && (
                  <a href="/api/oauth/meta" className="rounded-lg bg-[#0084ff]/15 px-3 py-1.5 text-xs font-semibold text-[#0084ff] hover:bg-[#0084ff]/25">
                    Conectar Meta OAuth →
                  </a>
                )}
                {platform === "google" && (
                  <a href="/api/oauth/google" className="rounded-lg bg-[#0084ff]/15 px-3 py-1.5 text-xs font-semibold text-[#0084ff] hover:bg-[#0084ff]/25">
                    Conectar Google OAuth →
                  </a>
                )}
                {platform === "linkedin" && (
                  <a href="/api/oauth/linkedin" className="rounded-lg bg-[#0084ff]/15 px-3 py-1.5 text-xs font-semibold text-[#0084ff] hover:bg-[#0084ff]/25">
                    Conectar LinkedIn OAuth →
                  </a>
                )}
                {platform === "tiktok" && (
                  <a href="/api/oauth/tiktok" className="rounded-lg bg-[#0084ff]/15 px-3 py-1.5 text-xs font-semibold text-[#0084ff] hover:bg-[#0084ff]/25">
                    Conectar TikTok OAuth →
                  </a>
                )}
              </div>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Account ID *</label>
            <input value={accountId} onChange={e => setAccountId(e.target.value)} placeholder="act_123456789"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre de cuenta</label>
            <input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Mi cuenta de publicidad"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {PLATFORM_CFG[platform]?.tokenLabel ?? "Access Token"} *
            </label>
            <input value={accessToken} onChange={e => setAccessToken(e.target.value)} type="password"
              placeholder={PLATFORM_CFG[platform]?.tokenPlaceholder ?? "token..."}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          {(platform === "tiktok" || platform === "snapchat") && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs text-blue-400">
              {platform === "tiktok"
                ? "TikTok: genera el Access Token desde TikTok for Business → Marketing API → App → Access Token."
                : "Snapchat: genera el token OAuth desde Snapchat Business → Snap Marketing API → OAuth."}
            </div>
          )}
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-xs text-yellow-400">
            El token se almacena cifrado. Necesitas permisos de lectura de metricas.
          </div>
          <div className="flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Conectando..." : "Conectar cuenta"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

type AdsCampaign = { id: string; name: string; status: string; platform: string; dailyBudget: number | null };

function CreateCampaignModal({ platform, onClose, onSaved }: { platform: AdsPlatform; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("10");
  const [objective, setObjective] = useState("LINK_CLICKS");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const dailyBudgetUsd = parseFloat(budget);
    if (!name.trim() || isNaN(dailyBudgetUsd) || dailyBudgetUsd <= 0) { setError("Nombre y presupuesto válido son obligatorios"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/saas/ads/campaigns/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, name: name.trim(), daily_budget_usd: dailyBudgetUsd, objective }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!d.ok) throw new Error(d.error ?? "Error al crear campaña");
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  }

  const OBJECTIVES: Record<string, string> = {
    LINK_CLICKS: "Clics en enlace", LEAD_GENERATION: "Generación de leads",
    CONVERSIONS: "Conversiones", BRAND_AWARENESS: "Notoriedad de marca",
    REACH: "Alcance", VIDEO_VIEWS: "Visualizaciones de vídeo",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">Crear campaña — {platform.toUpperCase()}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">×</button>
        </div>
        {error && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre de campaña *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Captación verano 2026"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Presupuesto diario (USD) *</label>
            <input type="number" min="0.01" step="0.01" value={budget} onChange={e => setBudget(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          {platform === "meta" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Objetivo</label>
              <select value={objective} onChange={e => setObjective(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
                {Object.entries(OBJECTIVES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          )}
          <p className="text-xs text-muted-foreground">La campaña se creará en estado <strong>Pausada</strong>. Actívala desde el panel de campañas.</p>
          <div className="flex gap-3 pt-1">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Creando…" : "Crear campaña"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditBudgetModal({ campaign, platform, onClose, onSaved }: { campaign: AdsCampaign; platform: AdsPlatform; onClose: () => void; onSaved: () => void }) {
  const [budget, setBudget] = useState(String(campaign.dailyBudget ?? 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const dailyBudgetUsd = parseFloat(budget);
    if (isNaN(dailyBudgetUsd) || dailyBudgetUsd <= 0) { setError("Presupuesto debe ser mayor a 0"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/saas/ads/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, daily_budget_usd: dailyBudgetUsd }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!d.ok) throw new Error(d.error ?? "Error al actualizar presupuesto");
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">Editar presupuesto</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">×</button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground truncate">{campaign.name}</p>
        {error && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Presupuesto diario (USD) *</label>
            <input type="number" min="0.01" step="0.01" value={budget} onChange={e => setBudget(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div className="flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Guardando…" : "Guardar"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function CampaignsSection({ platform }: { platform: AdsPlatform }) {
  const [campaigns, setCampaigns] = useState<AdsCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editCampaign, setEditCampaign] = useState<AdsCampaign | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    fetch(`/api/saas/ads/campaigns?platform=${platform}`)
      .then(r => r.json() as Promise<{ campaigns?: AdsCampaign[]; error?: string; code?: string }>)
      .then(d => {
        if (d.error && d.code === "NOT_CONNECTED") { setCampaigns([]); setError(null); }
        else if (d.error) setError(d.error);
        else setCampaigns(d.campaigns ?? []);
      })
      .catch(() => setError("Error de red"))
      .finally(() => setLoading(false));
  }, [platform]);

  useEffect(() => { void load(); }, [load]);

  async function toggle(c: AdsCampaign) {
    setToggling(c.id);
    try {
      const action = c.status === "ACTIVE" ? "pause" : "activate";
      const res = await fetch("/api/saas/ads/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, campaign_id: c.id, action }),
      });
      if (!res.ok) { const j = (await res.json().catch(() => ({}))) as { error?: string }; throw new Error(j.error ?? "Error"); }
      load();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setToggling(null); }
  }

  if (loading) return <div className="h-16 animate-pulse rounded-xl bg-muted/30" />;
  if (error) return <p className="text-sm text-red-400">{error}</p>;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Campañas</p>
        <NelvyonDsButton size="sm" variant="ghost" className="text-xs" onClick={() => setShowCreate(true)}>
          + Crear campaña
        </NelvyonDsButton>
      </div>
      {campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">Sin campañas en {platform.toUpperCase()}.</p>
          <NelvyonDsButton size="sm" className="mt-3 text-xs" onClick={() => setShowCreate(true)}>
            + Crear primera campaña
          </NelvyonDsButton>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {campaigns.map(c => (
            <div key={c.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card/50 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                {c.dailyBudget != null && (
                  <p className="text-xs text-muted-foreground">
                    Ppto. diario: {c.dailyBudget.toFixed(2)} USD
                    <button onClick={() => setEditCampaign(c)} className="ml-2 text-primary hover:underline">Editar</button>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <NelvyonDsBadge tone={c.status === "ACTIVE" ? "success" : "neutral"}>
                  {c.status === "ACTIVE" ? "Activa" : "Pausada"}
                </NelvyonDsBadge>
                <NelvyonDsButton size="sm" variant="ghost" disabled={toggling === c.id} onClick={() => void toggle(c)}>
                  {toggling === c.id ? "…" : c.status === "ACTIVE" ? "Pausar" : "Activar"}
                </NelvyonDsButton>
              </div>
            </div>
          ))}
        </div>
      )}
      {showCreate && <CreateCampaignModal platform={platform} onClose={() => setShowCreate(false)} onSaved={load} />}
      {editCampaign && <EditBudgetModal campaign={editCampaign} platform={platform} onClose={() => setEditCampaign(null)} onSaved={load} />}
    </div>
  );
}

function MetricsCard({ platform, dateStart, dateEnd }: { platform: AdsPlatform; dateStart: string; dateEnd: string }) {
  const [metrics, setMetrics] = useState<AdsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    fetch(`/api/saas/ads?platform=${platform}&date_start=${dateStart}&date_end=${dateEnd}`)
      .then(r => r.json() as Promise<{ metrics?: AdsMetrics; error?: string }>)
      .then(d => { if (d.metrics) setMetrics(d.metrics); else setError(d.error ?? "Error"); })
      .catch(() => setError("Error de red"))
      .finally(() => setLoading(false));
  }, [platform, dateStart, dateEnd]);

  const cfg = PLATFORM_CFG[platform];

  return (
    <NelvyonDsCard className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{cfg.icon}</span>
        <div>
          <p className="font-semibold text-foreground">{cfg.label}</p>
          <p className="text-xs text-muted-foreground">{dateStart} a {dateEnd}</p>
        </div>
        {metrics?.fromCache && <NelvyonDsBadge tone="primary" className="ml-auto">cache</NelvyonDsBadge>}
      </div>
      {loading ? (
        <div className="h-16 animate-pulse rounded-lg bg-muted/30" />
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : metrics ? (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6 text-sm">
          <div><p className="text-xs text-muted-foreground">Gasto</p><p className="font-semibold text-foreground">{eur(metrics.spend)}</p></div>
          <div><p className="text-xs text-muted-foreground">Impresiones</p><p className="font-semibold text-foreground">{fmt(metrics.impressions)}</p></div>
          <div><p className="text-xs text-muted-foreground">Clics</p><p className="font-semibold text-foreground">{fmt(metrics.clicks)}</p></div>
          <div><p className="text-xs text-muted-foreground">Conversiones</p><p className="font-semibold text-foreground">{fmt(metrics.conversions)}</p></div>
          <div><p className="text-xs text-muted-foreground">CTR</p><p className="font-semibold text-foreground">{metrics.ctr != null ? `${metrics.ctr.toFixed(2)}%` : "-"}</p></div>
          <div><p className="text-xs text-muted-foreground">ROAS</p><p className={`font-semibold ${metrics.roas != null && metrics.roas >= 2 ? "text-green-400" : metrics.roas != null && metrics.roas >= 1 ? "text-yellow-400" : "text-foreground"}`}>{metrics.roas != null ? `${metrics.roas.toFixed(2)}x` : "-"}</p></div>
        </div>
      ) : null}
    </NelvyonDsCard>
  );
}

// ─── Attribution types ──────────────────────────────────────────────────────

type AdsAttributionModel = "first_touch" | "last_touch" | "linear" | "time_decay";

interface AdsCampaignLink {
  id: string; tenantId: string; platform: string;
  externalCampaignId: string; externalCampaignName: string | null;
  utmCampaign: string; utmSource: string | null; utmMedium: string | null;
  createdAt: string;
}

interface AttributedRoasRow {
  link: AdsCampaignLink;
  spend: number;
  attributedCredit: number;
  attributedConversions: number;
  attributedRoas: number | null;
  model: AdsAttributionModel;
}

const MODEL_LABELS: Record<AdsAttributionModel, string> = {
  first_touch: "Primer toque",
  last_touch: "Último toque",
  linear: "Lineal",
  time_decay: "Decaimiento temporal",
};

function LinkCampaignModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [platform, setPlatform] = useState<AdsPlatform>("meta");
  const [campaignId, setCampaignId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!campaignId.trim() || !utmCampaign.trim()) {
      setError("Campaign ID y UTM Campaign son obligatorios"); return;
    }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/saas/ads/attribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "link",
          platform,
          external_campaign_id: campaignId.trim(),
          external_campaign_name: campaignName.trim() || undefined,
          utm_campaign: utmCampaign.trim(),
          utm_source: utmSource.trim() || undefined,
          utm_medium: utmMedium.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Error al vincular campaña");
      }
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">Vincular campaña Ads ↔ UTM</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">×</button>
        </div>
        {error && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Plataforma</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(PLATFORM_CFG) as AdsPlatform[]).map(p => (
                <button key={p} type="button" onClick={() => setPlatform(p)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${platform === p ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`}>
                  {PLATFORM_CFG[p].icon} {PLATFORM_CFG[p].label.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Campaign ID (plataforma) *</label>
              <input value={campaignId} onChange={e => setCampaignId(e.target.value)} placeholder="12345678"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre (opcional)</label>
              <input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Captación verano"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">utm_campaign *</label>
              <input value={utmCampaign} onChange={e => setUtmCampaign(e.target.value)} placeholder="verano_2026"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">utm_source</label>
              <input value={utmSource} onChange={e => setUtmSource(e.target.value)} placeholder="meta"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">utm_medium</label>
              <input value={utmMedium} onChange={e => setUtmMedium(e.target.value)} placeholder="cpc"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Vinculando…" : "Vincular campaña"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function AttributionTab() {
  const [model, setModel] = useState<AdsAttributionModel>("linear");
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<AttributedRoasRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLink, setShowLink] = useState(false);
  const lastFetch = useRef<string>("");

  const load = useCallback(() => {
    const key = `${model}-${days}`;
    lastFetch.current = key;
    setLoading(true); setError(null);
    fetch(`/api/saas/ads/attribution?resource=roas&model=${model}&days=${days}`)
      .then(r => r.json() as Promise<{ roas?: AttributedRoasRow[]; error?: string }>)
      .then(d => {
        if (lastFetch.current !== key) return;
        if (d.error) setError(d.error);
        else setRows(d.roas ?? []);
      })
      .catch(() => setError("Error de red"))
      .finally(() => setLoading(false));
  }, [model, days]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Modelo</label>
            <select value={model} onChange={e => setModel(e.target.value as AdsAttributionModel)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none">
              {(Object.entries(MODEL_LABELS) as [AdsAttributionModel, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Ventana</label>
            <select value={days} onChange={e => setDays(Number(e.target.value))}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none">
              <option value={7}>7 días</option>
              <option value={30}>30 días</option>
              <option value={90}>90 días</option>
            </select>
          </div>
        </div>
        <NelvyonDsButton size="sm" onClick={() => setShowLink(true)}>+ Vincular campaña</NelvyonDsButton>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">{[1,2,3].map(i => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted/30"/>)}</div>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-4xl mb-3">🔗</p>
          <p className="text-sm font-medium text-foreground">Sin campañas vinculadas</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Vincula una campaña de Ads con su <code className="text-primary">utm_campaign</code> para calcular ROAS atribuido.
          </p>
          <NelvyonDsButton size="sm" className="mt-4" onClick={() => setShowLink(true)}>+ Vincular primera campaña</NelvyonDsButton>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Campaña</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Plataforma</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">UTM Campaign</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Gasto</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Conv. atrib.</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">ROAS atrib.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.link.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-foreground font-medium">
                    {r.link.externalCampaignName ?? r.link.externalCampaignId}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-muted-foreground uppercase">{r.link.platform}</span>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs text-primary">{r.link.utmCampaign}</code>
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">{r.spend > 0 ? eur(r.spend) : "—"}</td>
                  <td className="px-4 py-3 text-right text-foreground">{r.attributedConversions > 0 ? fmt(r.attributedConversions) : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {r.attributedRoas != null ? (
                      <span className={r.attributedRoas >= 2 ? "font-semibold text-green-400" : r.attributedRoas >= 1 ? "text-yellow-400" : "text-red-400"}>
                        {r.attributedRoas.toFixed(2)}x
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Modelo: <strong className="text-foreground">{MODEL_LABELS[model]}</strong> · Ventana: {days} días ·
              Spend de métricas en caché · Conversiones de <code className="text-primary">saas_lead_attribution</code>
            </p>
          </div>
        </div>
      )}

      {showLink && <LinkCampaignModal onClose={() => setShowLink(false)} onSaved={load} />}
    </div>
  );
}

type PublicidadTab = "metricas" | "atribucion";

export default function SaasPublicidadPage() {
  const [tab, setTab] = useState<PublicidadTab>("metricas");
  const [status, setStatus] = useState<AdsStatusResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnect, setShowConnect] = useState(false);
  const dateStart = daysAgo(30);
  const dateEnd = today();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/ads");
      if (res.ok) {
        const d = (await res.json()) as { status?: AdsStatusResult[] };
        setStatus(d.status ?? []);
      } else setStatus([]);
    } catch { setStatus([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const connected = status.filter(s => s.connected);
  const disconnected = status.filter(s => !s.connected);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="publicidad" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader
            title="Publicidad Digital"
            subtitle="Metricas reales de Google, Meta, LinkedIn y TikTok Ads"
          />
          <NelvyonDsButton onClick={() => setShowConnect(true)}>+ Conectar plataforma</NelvyonDsButton>
        </div>

        {!loading && connected.length === 0 && (
          <SaasDegradedBanner reason="oauth_not_configured">
            Conecta Meta, Google, LinkedIn o TikTok Ads en Integraciones para métricas y campañas en vivo.
            Sin OAuth configurado, las métricas y campañas no se sincronizan.
          </SaasDegradedBanner>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-border bg-card/50 p-1 w-fit">
          {([["metricas", "Métricas y campañas"], ["atribucion", "Atribución multi-touch"]] as [PublicidadTab, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${tab === id ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "atribucion" ? (
          <AttributionTab />
        ) : loading ? (
          <div className="flex flex-col gap-3">{[1, 2, 3].map(i => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/30" />)}</div>
        ) : connected.length === 0 ? (
          <NelvyonDsCard className="p-16 text-center">
            <p className="text-5xl">📢</p>
            <p className="mt-4 text-lg font-semibold text-foreground">Sin plataformas conectadas</p>
            <p className="mt-2 text-sm text-muted-foreground">Conecta tu cuenta de Meta, Google, LinkedIn o TikTok para ver metricas reales aqui</p>
            <NelvyonDsButton className="mt-5" onClick={() => setShowConnect(true)}>+ Conectar plataforma</NelvyonDsButton>
          </NelvyonDsCard>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ultimos 30 dias</p>
              {connected.map(s => (
                <div key={s.platform} className="flex flex-col gap-3">
                  <MetricsCard platform={s.platform} dateStart={dateStart} dateEnd={dateEnd} />
                  <CampaignsSection platform={s.platform} />
                </div>
              ))}
            </div>
            {disconnected.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">No conectadas</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {disconnected.map(s => {
                    const cfg = PLATFORM_CFG[s.platform];
                    return (
                      <NelvyonDsCard key={s.platform} className="flex items-center gap-4 p-4 opacity-60">
                        <span className="text-2xl">{cfg.icon}</span>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{cfg.label}</p>
                          <p className="text-xs text-muted-foreground">No conectada</p>
                        </div>
                        <NelvyonDsButton variant="ghost" className="text-xs" onClick={() => setShowConnect(true)}>Conectar</NelvyonDsButton>
                      </NelvyonDsCard>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {showConnect && <ConnectModal onClose={() => setShowConnect(false)} onSaved={load} />}
      </div>
    </SaasShellLayout>
  );
}