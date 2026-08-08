"use client";

/**
 * /saas/reputacion sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: reseñas, menciones y alertas -> `W3crmContentBox` + `W3crmDataTable`;
 * los dos dialogos -> `W3crmModal`; KPIs -> `W3crmKpiTile`. Sin componentes
 * nuevos.
 *
 * Inventario: sin `data-testid` y sin spec dedicado — lo cubre
 * `saas-nav-full-coverage`.
 *
 * Colision `/Reputaci/i` — MEDIDA antes de tocar codigo: el sidebar expone un
 * enlace "Reputación" (`saasNav.ts:106`), pero NINGUN spec hace aserciones de
 * texto sobre esta ruta; la unica del repo vive en `saas-autopilot.spec.ts` y
 * apunta a `/saas/autopilot`. No hay locator ambiguo que acomodar, asi que el
 * producto se conserva tal cual, incluido el titulo "Reputación & Reseñas".
 *
 * Logica de NELVYON intacta: los tres GET de `/api/saas/reputation`
 * (por defecto = menciones, `?resource=reviews`, `?resource=alerts`) cargados
 * en paralelo, y el POST con sus cuatro acciones (`sync`, `reply`, `ignore`,
 * `check_alerts`); el banner de reseñas negativas sin responder (rating <= 2 y
 * `pending`); el score de menciones como porcentaje de positivas; el bloqueo
 * de la sincronizacion sin `placesConfigured`; y el mensaje de sync con su
 * recuento de negativas nuevas.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import {
  W3crmCargando,
  W3crmContentBox,
  W3crmDataTable,
  W3crmModal,
} from "@/features/saas-w3crm/components/W3crmContentBox";

type Sentiment = "positive" | "neutral" | "negative";
type ReplyStatus = "pending" | "replied" | "ignored";

interface Mention { id: string; channel: string; text: string; score: number; label: Sentiment; topics: string[] | null; createdAt: string }
interface SentimentAlert { id: string; avgScore: number; windowHours: number; status: string; createdAt: string }
interface GbpReview { id: string; authorName: string; rating: number; reviewText: string | null; reviewTime: string | null; replyText: string | null; replyStatus: ReplyStatus }
interface GbpStats { total: number; avgRating: number; byRating: Record<number, number>; pendingReplies: number }
interface GbpConfig { placesConfigured: boolean; oauthConfigured: boolean }

type Tab = "reviews" | "mentions" | "alerts";

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-ES");
}

const STAR = "★"; const STAR_EMPTY = "☆";
function Stars({ n }: { n: number }) {
  // Un rating corrupto pintaba cinco huecos raros; se acota a 0..5.
  const llenas = Math.min(5, Math.max(0, Math.round(num(n))));
  return (
    <span className={llenas <= 2 ? "text-danger" : llenas >= 4 ? "text-warning" : "text-muted"}>
      {Array.from({ length: 5 }, (_, i) => (i < llenas ? STAR : STAR_EMPTY)).join("")}
    </span>
  );
}

const REPLY_LABEL: Record<string, string> = { replied: "Respondida", ignored: "Ignorada", pending: "Pendiente" };
const SENTIMENT_LABEL: Record<string, string> = { positive: "Positivo", negative: "Negativo", neutral: "Neutral" };
const SENTIMENT_BADGE: Record<string, string> = { positive: "badge-success", negative: "badge-warning", neutral: "badge-primary" };

/** Estados fuera de catalogo pintaban `undefined`. */
function replyLabel(s: string): string { return REPLY_LABEL[s] ?? (s ? String(s) : "—"); }
function sentimentLabel(s: string): string { return SENTIMENT_LABEL[s] ?? (s ? String(s) : "—"); }
function sentimentBadge(s: string): string { return SENTIMENT_BADGE[s] ?? "badge-secondary"; }

function ReplyModal({ review, onClose, onSaved }: { review: GbpReview; onClose: () => void; onSaved: () => void }) {
  const [comment, setComment] = useState(review.replyText ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) { setError("La respuesta no puede estar vacía"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/saas/reputation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", review_id: review.id, comment: comment.trim() }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Error");
      }
      onSaved(); onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally { setSaving(false); }
  }

  return (
    <W3crmModal titulo="Responder reseña" onClose={onClose} error={error} size="lg">
      <div className="border rounded bg-light p-3 mb-3">
        <p className="fs-12 text-muted mb-1">
          <span className="fw-bold text-black">{review.authorName || "—"}</span> · <Stars n={review.rating} />
        </p>
        <p className="mb-0">{review.reviewText ?? "Sin comentario"}</p>
      </div>
      <form onSubmit={(e) => void save(e)}>
        <div className="form-group mb-3">
          <label htmlFor="rep-reply" className="text-black font-w600">
            Tu respuesta <span className="required">*</span>
          </label>
          <textarea id="rep-reply" className="form-control" rows={4} placeholder="Gracias por tu reseña…"
            value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
        <div className="text-end">
          <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Enviando…" : "Publicar respuesta"}
          </button>
        </div>
      </form>
    </W3crmModal>
  );
}

function NewAlertModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/saas/reputation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_alerts" }),
      });
      if (!res.ok) throw new Error("Error");
      onSaved(); onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally { setSaving(false); }
  }

  return (
    <W3crmModal titulo="Verificar alertas" onClose={onClose} error={error}>
      <p className="fs-14 text-muted">
        Ejecuta el análisis de sentiment para detectar alertas negativas (score 24h &lt; -0.3).
      </p>
      <form onSubmit={(e) => void save(e)}>
        <div className="text-end">
          <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Ejecutando…" : "Ejecutar"}
          </button>
        </div>
      </form>
    </W3crmModal>
  );
}

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
    const d = (await res.json().catch(() => ({}))) as { reviews?: GbpReview[]; stats?: GbpStats; gbp_config?: GbpConfig };
    setReviews(Array.isArray(d.reviews) ? d.reviews : []);
    if (d.stats && typeof d.stats === "object") setGbpStats(d.stats);
    if (d.gbp_config && typeof d.gbp_config === "object") setGbpConfig(d.gbp_config);
  }, []);

  const loadMentions = useCallback(async () => {
    const res = await fetch("/api/saas/reputation");
    if (!res.ok) return;
    const d = (await res.json().catch(() => ({}))) as { mentions?: Mention[]; gbp_config?: GbpConfig };
    setMentions(Array.isArray(d.mentions) ? d.mentions : []);
    if (d.gbp_config && typeof d.gbp_config === "object") setGbpConfig(d.gbp_config);
  }, []);

  const loadAlerts = useCallback(async () => {
    const res = await fetch("/api/saas/reputation?resource=alerts");
    if (!res.ok) return;
    const d = (await res.json().catch(() => ({}))) as { alerts?: SentimentAlert[] };
    setSentAlerts(Array.isArray(d.alerts) ? d.alerts : []);
  }, []);

  useEffect(() => {
    setLoading(true);
    // `.catch` para que un fallo de red no deje la pantalla colgada en carga.
    void Promise.all([loadReviews(), loadMentions(), loadAlerts()])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [loadReviews, loadMentions, loadAlerts]);

  async function syncReviews() {
    setSyncing(true); setSyncMsg(null);
    try {
      const res = await fetch("/api/saas/reputation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const d = (await res.json().catch(() => ({}))) as { result?: { synced?: number; newNegative?: number }; error?: string };
      if (!res.ok) { setSyncMsg(`Error: ${d.error ?? "desconocido"}`); return; }
      setSyncMsg(`✓ ${num(d.result?.synced)} reseñas sincronizadas · ${num(d.result?.newNegative)} negativas nuevas`);
      void loadReviews();
    } finally { setSyncing(false); }
  }

  async function ignoreReview(id: string) {
    await fetch("/api/saas/reputation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ignore", review_id: id }),
    });
    void loadReviews();
  }

  const negativeReviews = reviews.filter((r) => num(r.rating) <= 2 && r.replyStatus === "pending");
  const positive = mentions.filter((m) => m.label === "positive").length;
  const sentScore = mentions.length > 0 ? Math.round((positive / mentions.length) * 100) : 0;

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Reputación & Reseñas" parentTitle="Captación" pageTitle="Reputación" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Reseñas GBP" value={num(gbpStats?.total)} /></div>
          <div className="col-xl-3 col-sm-6">
            <W3crmKpiTile label="Rating promedio" value={gbpStats ? `${num(gbpStats.avgRating)}★` : "—"} accent />
          </div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Sin responder" value={num(gbpStats?.pendingReplies)} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Score menciones" value={`${sentScore}%`} /></div>

          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              Google Business Profile sync bidireccional, menciones y alertas de sentiment
            </p>

            {negativeReviews.length > 0 && (
              <div className="alert alert-danger d-flex align-items-center justify-content-between" role="alert">
                <span>
                  {negativeReviews.length} reseña{negativeReviews.length > 1 ? "s" : ""} negativa
                  {negativeReviews.length > 1 ? "s" : ""} sin responder
                </span>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setTab("reviews")}>
                  Ver reseñas
                </button>
              </div>
            )}

            {!loading && !gbpConfig.placesConfigured && (
              <div className="alert alert-warning" role="alert">
                Conecta Google Business Profile: añade credenciales OAuth y Place IDs en Integraciones
                (<code>GOOGLE_PLACES_API_KEY</code>, <code>GBP_PLACE_ID</code>) para sincronizar reseñas en vivo.
              </div>
            )}

            {syncMsg && (
              <div className={`alert ${syncMsg.startsWith("Error") ? "alert-danger" : "alert-success"}`} role="status">
                {syncMsg}
              </div>
            )}

            <ul className="nav nav-tabs mb-3">
              {(["reviews", "mentions", "alerts"] as Tab[]).map((t) => (
                <li className="nav-item" key={t}>
                  <button type="button" className={`nav-link ${tab === t ? "active" : ""}`}
                    aria-pressed={tab === t} onClick={() => setTab(t)}>
                    {t === "reviews"
                      ? `Reseñas Google (${reviews.length})`
                      : t === "mentions"
                        ? `Menciones (${mentions.length})`
                        : `Alertas (${sentAlerts.length})`}
                  </button>
                </li>
              ))}
            </ul>

            {tab === "reviews" && (
              <W3crmContentBox
                titulo="Reseñas sincronizadas"
                icono="fa-solid fa-star"
                acciones={
                  <button type="button" className="btn btn-primary btn-sm me-2"
                    disabled={syncing || !gbpConfig.placesConfigured} onClick={() => void syncReviews()}>
                    {syncing ? "Sincronizando…" : "Sincronizar GBP"}
                  </button>
                }
              >
                {loading ? (
                  <W3crmCargando texto="Cargando reseñas…" />
                ) : reviews.length === 0 ? (
                  <W3crmEmptyState
                    title="Sin reseñas sincronizadas"
                    description={gbpConfig.placesConfigured
                      ? "Pulsa «Sincronizar GBP» para importar tus reseñas de Google."
                      : "Configura GOOGLE_PLACES_API_KEY + GBP_PLACE_ID en Railway."}
                  />
                ) : (
                  <W3crmDataTable
                    filas={reviews}
                    etiqueta="reseñas"
                    wrapperId="rep_reviews_wrapper"
                    porPagina={10}
                    columnas={[
                      { titulo: "Autor" },
                      { titulo: "Reseña" },
                      { titulo: "Fecha" },
                      { titulo: "Estado" },
                      { titulo: "Gestión", alFinal: true },
                    ]}
                    render={(r) => (
                      <tr key={r.id}>
                        <td>
                          <span className="fw-bold">{r.authorName || "—"}</span>
                          <div><Stars n={r.rating} /></div>
                        </td>
                        <td>
                          <span className="text-muted">{r.reviewText ?? "Sin comentario"}</span>
                          {r.replyText ? (
                            <div className="border-start border-primary ps-2 mt-2">
                              <div className="text-muted fs-12">Tu respuesta</div>
                              <div className="fs-12">{r.replyText}</div>
                            </div>
                          ) : null}
                        </td>
                        <td>{fecha(r.reviewTime)}</td>
                        <td>
                          <span className={`badge ${
                            r.replyStatus === "replied" ? "badge-success"
                              : r.replyStatus === "ignored" ? "badge-primary"
                                : num(r.rating) <= 2 ? "badge-warning" : "badge-primary"
                          }`}>
                            {replyLabel(r.replyStatus)}
                          </span>
                        </td>
                        <td className="text-end">
                          {r.replyStatus !== "replied" && (
                            <>
                              <button type="button" className="btn btn-primary light btn-sm me-1"
                                aria-label={`Responder a ${r.authorName}`} onClick={() => setReplyReview(r)}>
                                Responder
                              </button>
                              {r.replyStatus === "pending" && (
                                <button type="button" className="btn btn-primary light btn-sm"
                                  aria-label={`Ignorar reseña de ${r.authorName}`}
                                  onClick={() => void ignoreReview(r.id)}>
                                  Ignorar
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    )}
                  />
                )}
              </W3crmContentBox>
            )}

            {tab === "mentions" && (
              <W3crmContentBox titulo="Menciones con sentiment" icono="fa-solid fa-eye">
                {loading ? (
                  <W3crmCargando texto="Cargando menciones…" />
                ) : mentions.length === 0 ? (
                  <W3crmEmptyState
                    title="Sin menciones detectadas"
                    description="Las menciones guardadas vía API aparecerán aquí con análisis de sentiment."
                  />
                ) : (
                  <W3crmDataTable
                    filas={mentions}
                    etiqueta="menciones"
                    wrapperId="rep_mentions_wrapper"
                    porPagina={10}
                    columnas={[{ titulo: "Sentiment" }, { titulo: "Mención" }, { titulo: "Fecha", alFinal: true }]}
                    render={(m) => {
                      // `topics` podia no ser array y reventaba el `.map`.
                      const topics = Array.isArray(m.topics) ? m.topics : [];
                      return (
                        <tr key={m.id}>
                          <td>
                            <span className={`badge ${sentimentBadge(m.label)}`}>{sentimentLabel(m.label)}</span>
                            <div className="text-muted fs-12">{m.channel || "—"} · score {num(m.score).toFixed(2)}</div>
                          </td>
                          <td>
                            <span>{m.text || "—"}</span>
                            {topics.length > 0 && (
                              <div className="mt-1">
                                {topics.map((t) => (
                                  <span key={t} className="badge badge-secondary me-1">{t}</span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="text-end">{fecha(m.createdAt)}</td>
                        </tr>
                      );
                    }}
                  />
                )}
              </W3crmContentBox>
            )}

            {tab === "alerts" && (
              <W3crmContentBox
                titulo="Alertas de sentiment"
                icono="fa-solid fa-bell"
                acciones={
                  <button type="button" className="btn btn-primary light btn-sm me-2"
                    onClick={() => setShowAlertModal(true)}>
                    Verificar alertas
                  </button>
                }
              >
                {loading ? (
                  <W3crmCargando texto="Cargando alertas…" />
                ) : sentAlerts.length === 0 ? (
                  <W3crmEmptyState
                    title="Sin alertas activas"
                    description="Las alertas se disparan automáticamente cuando el score de sentiment cae por debajo de -0.3 en 24h."
                  />
                ) : (
                  <W3crmDataTable
                    filas={sentAlerts}
                    etiqueta="alertas"
                    wrapperId="rep_alerts_wrapper"
                    porPagina={10}
                    columnas={[{ titulo: "Alerta" }, { titulo: "Fecha" }, { titulo: "Estado", alFinal: true }]}
                    render={(a) => (
                      <tr key={a.id}>
                        <td>
                          <span className="fw-bold text-danger">Alerta de sentiment negativo</span>
                          <div className="text-muted fs-12">
                            Score promedio {num(a.avgScore).toFixed(2)} · ventana {num(a.windowHours)}h
                          </div>
                        </td>
                        <td>{fecha(a.createdAt)}</td>
                        <td className="text-end">
                          <span className={`badge ${a.status === "active" ? "badge-warning" : "badge-primary"}`}>
                            {a.status === "active" ? "Activa" : "Resuelta"}
                          </span>
                        </td>
                      </tr>
                    )}
                  />
                )}
              </W3crmContentBox>
            )}
          </div>
        </div>
      </div>

      {replyReview && (
        <ReplyModal review={replyReview} onClose={() => setReplyReview(null)}
          onSaved={() => { void loadReviews(); setReplyReview(null); }} />
      )}
      {showAlertModal && (
        <NewAlertModal onClose={() => setShowAlertModal(false)}
          onSaved={() => { void loadAlerts(); setShowAlertModal(false); }} />
      )}
    </SaasW3crmShell>
  );
}
