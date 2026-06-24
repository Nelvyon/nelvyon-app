"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type AdsPlatform = "meta" | "google" | "linkedin" | "tiktok";

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

const PLATFORM_CFG: Record<AdsPlatform, { label: string; icon: string }> = {
  google: { label: "Google Ads", icon: "🔍" },
  meta: { label: "Meta Ads", icon: "📘" },
  linkedin: { label: "LinkedIn Ads", icon: "💼" },
  tiktok: { label: "TikTok Ads", icon: "🎵" },
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
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Access Token *</label>
            <input value={accessToken} onChange={e => setAccessToken(e.target.value)} type="password" placeholder="EAAG..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
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

function CampaignsSection({ platform }: { platform: AdsPlatform }) {
  const [campaigns, setCampaigns] = useState<AdsCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

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
  if (!campaigns.length) return null;

  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Campañas activas</p>
      <div className="flex flex-col gap-2">
        {campaigns.map(c => (
          <div key={c.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card/50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">{c.name}</p>
              {c.dailyBudget != null && <p className="text-xs text-muted-foreground">Ppto. diario: {c.dailyBudget.toFixed(2)} EUR</p>}
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

export default function SaasPublicidadPage() {
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

        {loading ? (
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