"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

// ── Types ──────────────────────────────────────────────────────────────────────
type Sentiment = "positive" | "neutral" | "negative";
type ReplyStatus = "pending" | "replied" | "ignored";

interface Mention { id: string; channel: string; text: string; score: number; label: Sentiment; topics: string[] | null; createdAt: string }
interface SentimentAlert { id: string; avgScore: number; windowHours: number; status: string; createdAt: string }
interface GbpReview { id: string; authorName: string; rating: number; reviewText: string | null; reviewTime: string | null; replyText: string | null; replyStatus: ReplyStatus }
interface GbpStats { total: number; avgRating: number; byRating: Record<number, number>; pendingReplies: number }
interface GbpConfig { placesConfigured: boolean; oauthConfigured: boolean }

type Tab = "reviews" | "mentions" | "alerts";

const STAR = "★"; const STAR_EMPTY = "☆";
function Stars({ n }: { n: number }) {
  return <span className={n <= 2 ? "text-red-400" : n >= 4 ? "text-yellow-400" : "text-muted-foreground"}>
    {Array.from({ length: 5 }, (_, i) => i < n ? STAR : STAR_EMPTY).join("")}
  </span>;
}

// ── Reply Modal ────────────────────────────────────────────────────────────────
function ReplyModal({ review, onClose, onSaved }: { review: GbpReview; onClose: () => void; onSaved: () => void }) {
  const [comment, setComment] = useState(review.replyText ?? "");
  const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) { setError("La respuesta no puede estar vacía"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/saas/reputation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reply", review_id: review.id, comment: comment.trim() }) });
      if (!res.ok) { const d = await res.json() as { error?: string }; throw new Error(d.error ?? "Error"); }
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-2 text-lg font-semibold text-foreground">Responder reseña</h2>
        <div className="mb-4 rounded-lg bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground mb-1"><span className="font-medium text-foreground">{review.authorName}</span> · <Stars n={review.rating} /></p>
          <p className="text-sm text-foreground line-clamp-3">{review.reviewText ?? "Sin comentario"}</p>
        </div>
        {error && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={save} className="space-y-4">
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Tu respuesta *</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} placeholder="Gracias por tu reseña…" className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
          <div className="flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Enviando…" : "Publicar respuesta"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Alert Monitor Modal ────────────────────────────────────────────────────────
function NewAlertModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch("/api/saas/reputation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "check_alerts" }) });
      if (!res.ok) throw new Error("Error");
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); } finally { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Verificar alertas</h2>
        <p className="text-sm text-muted-foreground mb-5">Ejecuta el análisis de sentiment para detectar alertas negativas (score 24h &lt; -0.3).</p>
        {error && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={save} className="flex gap-3">
          <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
          <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Ejecutando…" : "Ejecutar"}</NelvyonDsButton>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SaasReputacionPage() {
  const [tab, setTab] = useState<Tab>("reviews");
  const [reviews, setReviews] = useState<GbpReview[]>([]);
  const [gbpStats, setGbpStats] = useState<GbpStats | null>(null);
  const [gbpConfig, setGbpConfig] = useState<GbpConfig>({ placesConfigured: false, oauthConfigured: false });
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [sentAlerts, setSentAlerts] = useState<SentimentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [replyReview, setReplyReview] = useState<GbpReview | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);

  const loadReviews = useCallback(async () => {
    const res = await fetch("/api/saas/reputation?resource=reviews");
    if (!res.ok) return;
    const d = await res.json() as { reviews?: GbpReview[]; stats?: GbpStats; gbp_config?: GbpConfig };
    setReviews(d.reviews ?? []); if (d.stats) setGbpStats(d.stats); if (d.gbp_config) setGbpConfig(d.gbp_config);
  }, []);

  const loadMentions = useCallback(async () => {
    const res = await fetch("/api/saas/reputation");
    if (!res.ok) return;
    const d = await res.json() as { mentions?: Mention[]; gbp_config?: GbpConfig };
    setMentions(d.mentions ?? []); if (d.gbp_config) setGbpConfig(d.gbp_config);
  }, []);

  const loadAlerts = useCallback(async () => {
    const res = await fetch("/api/saas/reputation?resource=alerts");
    if (!res.ok) return;
    const d = await res.json() as { alerts?: SentimentAlert[] };
    setSentAlerts(d.alerts ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    void Promise.all([loadReviews(), loadMentions(), loadAlerts()]).finally(() => setLoading(false));
  }, [loadReviews, loadMentions, loadAlerts]);

  async function syncReviews() {
    setSyncing(true); setSyncMsg(null);
    try {
      const res = await fetch("/api/saas/reputation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync" }) });
      const d = await res.json() as { result?: { synced: number; newNegative: number }; error?: string };
      if (!res.ok) { setSyncMsg(`Error: ${d.error ?? "desconocido"}`); return; }
      setSyncMsg(`✓ ${d.result?.synced ?? 0} reseñas sincronizadas · ${d.result?.newNegative ?? 0} negativas nuevas`);
      void loadReviews();
    } finally { setSyncing(false); }
  }

  async function ignoreReview(id: string) {
    await fetch("/api/saas/reputation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ignore", review_id: id }) });
    void loadReviews();
  }

  const negativeReviews = reviews.filter(r => r.rating <= 2 && r.replyStatus === "pending");
  const positive = mentions.filter(m => m.label === "positive").length;
  const sentScore = mentions.length > 0 ? Math.round((positive / mentions.length) * 100) : 0;

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="reputacion" />}>
      <div className="flex flex-col gap-6 pb-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader title="Reputación & Reseñas" subtitle="Google Business Profile sync bidireccional, menciones y alertas de sentiment" />
          <div className="flex items-center gap-2">
            {tab === "reviews" && (
              <NelvyonDsButton onClick={syncReviews} disabled={syncing || !gbpConfig.placesConfigured}>
                {syncing ? "Sincronizando…" : "🔄 Sincronizar GBP"}
              </NelvyonDsButton>
            )}
            {tab === "alerts" && <NelvyonDsButton variant="ghost" onClick={() => setShowAlertModal(true)}>Verificar alertas</NelvyonDsButton>}
          </div>
        </div>

        {/* Negative reviews alert banner */}
        {negativeReviews.length > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <span className="text-xl">⚠️</span>
            <p className="text-sm text-red-300 font-medium">{negativeReviews.length} reseña{negativeReviews.length > 1 ? "s" : ""} negativa{negativeReviews.length > 1 ? "s" : ""} sin responder</p>
            <NelvyonDsButton variant="ghost" className="ml-auto text-xs" onClick={() => setTab("reviews")}>Ver reseñas →</NelvyonDsButton>
          </div>
        )}

        {/* GBP config banner when not configured */}
        {!gbpConfig.placesConfigured && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/10 px-4 py-3">
            <span className="text-xl">🔗</span>
            <p className="text-sm text-muted-foreground">Conecta Google Business Profile: añade <code className="text-primary">GOOGLE_PLACES_API_KEY</code> + <code className="text-primary">GBP_PLACE_ID</code> en Railway para sincronizar reseñas.</p>
          </div>
        )}

        {syncMsg && (
          <p className={`text-sm px-4 py-2 rounded-lg ${syncMsg.startsWith("Error") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>{syncMsg}</p>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Reseñas GBP", value: gbpStats?.total ?? 0 },
            { label: "Rating promedio", value: gbpStats ? `${gbpStats.avgRating}★` : "—" },
            { label: "Sin responder", value: gbpStats?.pendingReplies ?? 0 },
            { label: "Score menciones", value: `${sentScore}%` },
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {(["reviews", "mentions", "alerts"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${tab === t ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "reviews" ? `Reseñas Google (${reviews.length})` : t === "mentions" ? `Menciones (${mentions.length})` : `Alertas (${sentAlerts.length})`}
            </button>
          ))}
        </div>

        {/* Tab: Reseñas GBP */}
        {tab === "reviews" && (
          loading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/30" />)}</div> :
          reviews.length === 0 ? (
            <NelvyonDsCard className="p-16 text-center">
              <p className="text-5xl">⭐</p>
              <p className="mt-4 text-lg font-semibold text-foreground">Sin reseñas sincronizadas</p>
              <p className="mt-2 text-sm text-muted-foreground">{gbpConfig.placesConfigured ? "Pulsa «Sincronizar GBP» para importar tus reseñas de Google" : "Configura GOOGLE_PLACES_API_KEY + GBP_PLACE_ID en Railway"}</p>
              {gbpConfig.placesConfigured && <NelvyonDsButton className="mt-5" onClick={syncReviews} disabled={syncing}>🔄 Sincronizar ahora</NelvyonDsButton>}
            </NelvyonDsCard>
          ) : (
            <div className="space-y-3">
              {reviews.map(r => (
                <NelvyonDsCard key={r.id} className={`p-4 ${r.rating <= 2 && r.replyStatus === "pending" ? "border-red-500/30" : ""}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground text-sm">{r.authorName}</p>
                        <Stars n={r.rating} />
                        <NelvyonDsBadge tone={r.replyStatus === "replied" ? "success" : r.replyStatus === "ignored" ? "primary" : r.rating <= 2 ? "warning" : "primary"}>
                          {r.replyStatus === "replied" ? "Respondida" : r.replyStatus === "ignored" ? "Ignorada" : "Pendiente"}
                        </NelvyonDsBadge>
                        {r.reviewTime && <span className="text-xs text-muted-foreground">{new Date(r.reviewTime).toLocaleDateString("es-ES")}</span>}
                      </div>
                      <p className="mt-2 text-sm text-foreground line-clamp-3">{r.reviewText ?? "Sin comentario"}</p>
                      {r.replyText && (
                        <div className="mt-2 border-l-2 border-primary pl-3">
                          <p className="text-xs text-muted-foreground mb-0.5">Tu respuesta</p>
                          <p className="text-sm text-foreground line-clamp-2">{r.replyText}</p>
                        </div>
                      )}
                    </div>
                    {r.replyStatus !== "replied" && (
                      <div className="flex gap-2 shrink-0">
                        <NelvyonDsButton variant="ghost" className="text-xs px-3 py-1.5" onClick={() => setReplyReview(r)}>Responder</NelvyonDsButton>
                        {r.replyStatus === "pending" && <button onClick={() => void ignoreReview(r.id)} className="text-xs text-muted-foreground hover:text-foreground px-2">Ignorar</button>}
                      </div>
                    )}
                  </div>
                </NelvyonDsCard>
              ))}
            </div>
          )
        )}

        {/* Tab: Menciones sentiment */}
        {tab === "mentions" && (
          loading ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/30" />)}</div> :
          mentions.length === 0 ? (
            <NelvyonDsCard className="p-16 text-center">
              <p className="text-5xl">👁️</p>
              <p className="mt-4 text-lg font-semibold text-foreground">Sin menciones detectadas</p>
              <p className="mt-2 text-sm text-muted-foreground">Las menciones guardadas via API aparecerán aquí con análisis de sentiment</p>
            </NelvyonDsCard>
          ) : (
            <div className="space-y-2">
              {mentions.map(m => (
                <NelvyonDsCard key={m.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <NelvyonDsBadge tone={m.label === "positive" ? "success" : m.label === "negative" ? "warning" : "primary"}>
                          {m.label === "positive" ? "Positivo" : m.label === "negative" ? "Negativo" : "Neutral"}
                        </NelvyonDsBadge>
                        <span className="text-xs text-muted-foreground">{m.channel} · score {m.score.toFixed(2)}</span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">{m.text}</p>
                      {m.topics && m.topics.length > 0 && (
                        <div className="mt-1 flex gap-1 flex-wrap">{m.topics.map(t => <span key={t} className="rounded bg-muted/30 px-1.5 py-0.5 text-xs text-muted-foreground">{t}</span>)}</div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{new Date(m.createdAt).toLocaleDateString("es-ES")}</span>
                  </div>
                </NelvyonDsCard>
              ))}
            </div>
          )
        )}

        {/* Tab: Alertas */}
        {tab === "alerts" && (
          loading ? <div className="h-24 animate-pulse rounded-xl bg-muted/30" /> :
          sentAlerts.length === 0 ? (
            <NelvyonDsCard className="p-16 text-center">
              <p className="text-5xl">🔔</p>
              <p className="mt-4 text-lg font-semibold text-foreground">Sin alertas activas</p>
              <p className="mt-2 text-sm text-muted-foreground">Las alertas se disparan automáticamente cuando el score de sentiment cae por debajo de -0.3 en 24h</p>
              <NelvyonDsButton className="mt-5" variant="ghost" onClick={() => setShowAlertModal(true)}>Verificar ahora</NelvyonDsButton>
            </NelvyonDsCard>
          ) : (
            <div className="space-y-2">
              {sentAlerts.map(a => (
                <NelvyonDsCard key={a.id} className="flex items-center justify-between gap-4 px-5 py-3 border-red-500/30">
                  <div>
                    <p className="font-medium text-red-400">Alerta de sentiment negativo</p>
                    <p className="text-xs text-muted-foreground">Score promedio {a.avgScore.toFixed(2)} · ventana {a.windowHours}h · {new Date(a.createdAt).toLocaleDateString("es-ES")}</p>
                  </div>
                  <NelvyonDsBadge tone={a.status === "active" ? "warning" : "primary"}>{a.status === "active" ? "Activa" : "Resuelta"}</NelvyonDsBadge>
                </NelvyonDsCard>
              ))}
            </div>
          )
        )}
      </div>

      {replyReview && <ReplyModal review={replyReview} onClose={() => setReplyReview(null)} onSaved={() => { void loadReviews(); setReplyReview(null); }} />}
      {showAlertModal && <NewAlertModal onClose={() => setShowAlertModal(false)} onSaved={() => { void loadAlerts(); setShowAlertModal(false); }} />}
    </SaasShellLayout>
  );
}
