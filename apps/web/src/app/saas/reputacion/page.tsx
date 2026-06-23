"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type Sentiment = "positive" | "neutral" | "negative";

interface Mention {
  id: string; keyword: string; source: string; title: string;
  url: string | null; snippet: string; sentiment: Sentiment;
  foundAt: string; platform: string;
}

interface Alert {
  id: string; keyword: string; platforms: string[];
  notifyEmail: string | null; active: boolean; mentionCount: number; lastCheckedAt: string | null;
}

const SENTIMENT_COLOR: Record<Sentiment, string> = {
  positive: "text-green-400", neutral: "text-muted-foreground", negative: "text-red-400"
};
const SENTIMENT_TONE: Record<Sentiment, "success" | "primary" | "danger"> = {
  positive: "success", neutral: "primary", negative: "danger"
};
const SENTIMENT_LABEL: Record<Sentiment, string> = {
  positive: "Positivo", neutral: "Neutral", negative: "Negativo"
};

function NewAlertModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [keyword, setKeyword] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["web", "news"]);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ALL_PLATFORMS = ["web", "news", "twitter", "instagram", "facebook", "linkedin", "google"];

  function togglePlatform(p: string) {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) { setError("La keyword es obligatoria"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/social-monitoring/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), platforms, notify_email: notifyEmail.trim() || null }),
      });
      if (!res.ok) throw new Error("Error al crear alerta");
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-semibold text-foreground">Nueva alerta de monitoreo</h2>
        {error && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Keyword a monitorear *</label>
            <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Mi empresa · Competidor · Marca..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Plataformas</p>
            <div className="flex flex-wrap gap-2">
              {ALL_PLATFORMS.map(p => (
                <button key={p} type="button" onClick={() => togglePlatform(p)}
                  className={`rounded-lg border px-3 py-1.5 text-xs capitalize transition-colors ${platforms.includes(p) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Email de notificación</label>
            <input type="email" value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)} placeholder="tu@email.com"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div className="flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Creando…" : "Crear alerta"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SaasReputacionPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"mentions" | "alerts">("mentions");
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, mRes] = await Promise.allSettled([
        fetch("/api/social-monitoring/alerts"),
        fetch("/api/social-monitoring/mentions"),
      ]);
      if (aRes.status === "fulfilled" && aRes.value.ok) {
        const d = (await aRes.value.json().catch(() => ({}))) as { alerts?: Alert[] };
        setAlerts(d.alerts ?? []);
      }
      if (mRes.status === "fulfilled" && mRes.value.ok) {
        const d = (await mRes.value.json().catch(() => ({}))) as { mentions?: Mention[] };
        setMentions(d.mentions ?? []);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const positive = mentions.filter(m => m.sentiment === "positive").length;
  const negative = mentions.filter(m => m.sentiment === "negative").length;
  const score = mentions.length > 0 ? Math.round((positive / mentions.length) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <SaasSidebar activeId="seo" />
          <main className="space-y-6">
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader title="Reputación & Menciones" subtitle="Monitorea lo que dicen de tu marca en internet y redes sociales" />
          <NelvyonDsButton onClick={() => setShowNew(true)}>+ Nueva alerta</NelvyonDsButton>
        </div>

        {/* Reputation score */}
        <NelvyonDsCard className="p-5">
          <div className="flex flex-wrap gap-8 items-center">
            <div className="text-center">
              <div className={`text-4xl font-bold ${score >= 70 ? "text-green-400" : score >= 40 ? "text-yellow-400" : "text-red-400"}`}>{score}%</div>
              <p className="mt-1 text-xs text-muted-foreground">Score de reputación</p>
            </div>
            <div className="flex gap-6 flex-wrap">
              {[
                { label: "Menciones totales", value: mentions.length, color: "text-foreground" },
                { label: "Positivas", value: positive, color: "text-green-400" },
                { label: "Neutras", value: mentions.filter(m => m.sentiment === "neutral").length, color: "text-muted-foreground" },
                { label: "Negativas", value: negative, color: "text-red-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </NelvyonDsCard>

        <div className="flex gap-2">
          {(["mentions", "alerts"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"}`}>
              {t === "mentions" ? `Menciones (${mentions.length})` : `Alertas (${alerts.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/30" />)}</div>
        ) : tab === "mentions" ? (
          mentions.length === 0 ? (
            <NelvyonDsCard className="p-16 text-center">
              <p className="text-5xl">👁️</p>
              <p className="mt-4 text-lg font-semibold text-foreground">Sin menciones detectadas</p>
              <p className="mt-2 text-sm text-muted-foreground">Crea alertas para monitorear tu marca, competidores o keywords clave</p>
              <NelvyonDsButton className="mt-5" onClick={() => setShowNew(true)}>+ Nueva alerta</NelvyonDsButton>
            </NelvyonDsCard>
          ) : (
            <div className="space-y-2">
              {mentions.map(m => (
                <NelvyonDsCard key={m.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground text-sm">{m.title}</p>
                        <NelvyonDsBadge tone={SENTIMENT_TONE[m.sentiment]}>{SENTIMENT_LABEL[m.sentiment]}</NelvyonDsBadge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{m.snippet}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{m.platform} · keyword: <span className="text-primary">{m.keyword}</span></p>
                    </div>
                    {m.url && (
                      <a href={m.url} target="_blank" rel="noopener noreferrer">
                        <NelvyonDsButton variant="ghost">Ver →</NelvyonDsButton>
                      </a>
                    )}
                  </div>
                </NelvyonDsCard>
              ))}
            </div>
          )
        ) : (
          alerts.length === 0 ? (
            <NelvyonDsCard className="p-16 text-center">
              <p className="text-5xl">🔔</p>
              <p className="mt-4 text-lg font-semibold text-foreground">Sin alertas configuradas</p>
              <NelvyonDsButton className="mt-5" onClick={() => setShowNew(true)}>+ Primera alerta</NelvyonDsButton>
            </NelvyonDsCard>
          ) : (
            <div className="space-y-2">
              {alerts.map(a => (
                <NelvyonDsCard key={a.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div>
                    <p className="font-medium text-foreground">{a.keyword}</p>
                    <p className="text-xs text-muted-foreground">{a.platforms.join(", ")} · {a.mentionCount} menciones</p>
                  </div>
                  <NelvyonDsBadge tone={a.active ? "success" : "primary"}>{a.active ? "Activa" : "Inactiva"}</NelvyonDsBadge>
                </NelvyonDsCard>
              ))}
            </div>
          )
        )}
      </div>
      {showNew && <NewAlertModal onClose={() => setShowNew(false)} onSaved={load} />}
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}
