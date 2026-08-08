"use client";

/**
 * /saas/social sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: cuentas conectadas y listado de posts -> `W3crmContentBox` +
 * `W3crmDataTable`; alta de post -> `W3crmModal`; metricas -> `W3crmKpiTile`.
 * Sin componentes nuevos.
 *
 * Inventario: sin `data-testid` y sin spec dedicado — lo cubre
 * `saas-nav-full-coverage`. Verificado que ningun spec hace aserciones de
 * texto sobre esta ruta.
 *
 * Logica de NELVYON intacta: `GET /api/saas/social/posts?limit=50` y
 * `GET /api/saas/social/accounts` con `Promise.allSettled` (un fallo no tumba
 * al otro); el alta que hace UN POST POR CUENTA seleccionada con
 * `social_account_id`, `media_urls` y `scheduled_at`; `POST { action:
 * "publish", id }`; `DELETE ?id=`; el agente de sugerencias
 * `POST /api/saas/social/suggest` con su `topic`/`platform` y el pegado de
 * hashtags; las plantillas elite (`listSocialElitePresets` /
 * `formatSocialPresetContent`); el editor HTML alternativo (`EmailEditor`); el
 * contador de caracteres que descuenta las etiquetas; y los enlaces OAuth a
 * Meta y LinkedIn.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import {
  W3crmCargando,
  W3crmContentBox,
  W3crmDataTable,
  W3crmModal,
} from "@/features/saas-w3crm/components/W3crmContentBox";
import { EmailEditor } from "@/features/email-editor/EmailEditor";
import { formatSocialPresetContent, listSocialElitePresets } from "@/lib/eliteTemplates/socialTemplates";

type SocialPlatform = string;

interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  accountName: string;
  isActive: boolean;
}

interface SocialPost {
  id: string;
  platform: SocialPlatform;
  content: string;
  status: "draft" | "scheduled" | "published" | "failed";
  scheduledAt: string | null;
  publishedAt: string | null;
  errorMessage: string | null;
}

const PLATFORM_CONFIG: Record<string, { label: string; icon: string }> = {
  instagram: { label: "Instagram", icon: "fa-brands fa-instagram" },
  facebook: { label: "Facebook", icon: "fa-brands fa-facebook" },
  twitter: { label: "X (Twitter)", icon: "fa-brands fa-x-twitter" },
  linkedin: { label: "LinkedIn", icon: "fa-brands fa-linkedin" },
  tiktok: { label: "TikTok", icon: "fa-brands fa-tiktok" },
  meta: { label: "Meta", icon: "fa-brands fa-meta" },
};

/** Una red desconocida ya caia al generico; se mantiene ese contrato. */
function getPlatformCfg(platform: string) {
  return PLATFORM_CONFIG[platform] ?? { label: platform || "—", icon: "fa-solid fa-mobile-screen" };
}

const STATUS_BADGE: Record<string, string> = {
  draft: "badge-primary",
  scheduled: "badge-warning",
  published: "badge-success",
  failed: "badge-danger",
};
const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  scheduled: "Programado",
  published: "Publicado",
  failed: "Error",
};

/** Un estado fuera de catalogo pintaba `undefined`. */
function estadoLabel(s: string): string { return STATUS_LABELS[s] ?? (s ? String(s) : "—"); }
function estadoBadge(s: string): string { return STATUS_BADGE[s] ?? "badge-secondary"; }
/** El contenido puede no ser texto: `replace` reventaba. */
function textoPlano(v: unknown): string {
  return typeof v === "string" ? v.replace(/<[^>]+>/g, "") : "";
}
function fechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-ES");
}

function NewPostModal({ accounts, onClose, onSaved }: {
  accounts: SocialAccount[]; onClose: () => void; onSaved: () => void;
}) {
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useRichEditor, setUseRichEditor] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const connectedAccounts = accounts.filter((a) => a.isActive);
  const templatePresets = listSocialElitePresets();

  function applyPreset(presetId: string) {
    const preset = templatePresets.find((p) => p.id === presetId);
    if (!preset) return;
    setContent(formatSocialPresetContent(preset));
    if (preset.mediaHint) setMediaUrl("");
  }

  async function suggestWithAgent() {
    setAiLoading(true);
    setError(null);
    try {
      const platform = connectedAccounts[0]?.platform ?? "instagram";
      const res = await fetch("/api/saas/social/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: content.trim() || "promoción del negocio", platform }),
      });
      if (!res.ok) throw new Error("No se pudo generar borrador");
      const d = (await res.json().catch(() => ({}))) as { draft?: { content?: string; hashtags?: string[] } };
      if (d.draft?.content) {
        // `hashtags` podia no ser array y reventaba el `.join`.
        const hashtags = Array.isArray(d.draft.hashtags) ? d.draft.hashtags : [];
        const tags = hashtags.length ? `\n\n${hashtags.join(" ")}` : "";
        setContent(`${d.draft.content}${tags}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error IA");
    } finally {
      setAiLoading(false);
    }
  }

  function toggleAccount(id: string) {
    setSelectedAccountIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedAccountIds.length === 0) { setError("Selecciona al menos una cuenta"); return; }
    if (!content.trim()) { setError("El contenido es obligatorio"); return; }
    setSaving(true);
    setError(null);
    try {
      const scheduledAt = scheduleAt ? new Date(scheduleAt).toISOString() : undefined;
      const mediaUrls = mediaUrl.trim() ? [mediaUrl.trim()] : undefined;
      // Un POST por cuenta seleccionada.
      await Promise.all(selectedAccountIds.map((social_account_id) =>
        fetch("/api/saas/social/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            social_account_id, content: content.trim(), media_urls: mediaUrls, scheduled_at: scheduledAt,
          }),
        }).then(async (r) => {
          if (!r.ok) {
            const j = (await r.json().catch(() => ({}))) as { error?: string };
            throw new Error(j.error ?? "Error al publicar");
          }
        }),
      ));
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <W3crmModal titulo="Nuevo post" onClose={onClose} error={error} size="lg">
      <form onSubmit={(e) => void submit(e)}>
        <div className="form-group mb-3">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span className="text-black font-w600">Plantillas élite</span>
            <button type="button" className="btn btn-primary light btn-sm" disabled={aiLoading}
              onClick={() => void suggestWithAgent()}>
              {aiLoading ? "…" : "Agente redes (0€)"}
            </button>
          </div>
          <div className="d-flex flex-wrap gap-1">
            {templatePresets.map((p) => (
              <button key={p.id} type="button" className="btn btn-primary light btn-sm"
                onClick={() => applyPreset(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group mb-3">
          <span className="text-black font-w600 d-block mb-2">Cuentas <span className="required">*</span></span>
          {connectedAccounts.length === 0 ? (
            <p className="fs-14 text-muted mb-0">
              No hay cuentas conectadas. Ve a Configuración → Redes Sociales.
            </p>
          ) : (
            <div className="d-flex flex-wrap gap-1">
              {connectedAccounts.map((a) => {
                const cfg = getPlatformCfg(a.platform);
                const sel = selectedAccountIds.includes(a.id);
                return (
                  <button key={a.id} type="button" aria-pressed={sel}
                    className={`btn btn-sm ${sel ? "btn-primary" : "btn-primary light"}`}
                    onClick={() => toggleAccount(a.id)}>
                    <i className={`${cfg.icon} me-2`} aria-hidden="true" />
                    {cfg.label}
                    <span className="ms-2 fs-12">{a.accountName}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="form-group mb-3">
          <div className="d-flex align-items-center justify-content-between mb-1">
            <label htmlFor="soc-contenido" className="text-black font-w600">
              Contenido <span className="required">*</span>
            </label>
            <button type="button" className="btn btn-primary light btn-sm"
              onClick={() => setUseRichEditor((v) => !v)}>
              {useRichEditor ? "Editor simple" : "Editor HTML"}
            </button>
          </div>
          {useRichEditor ? (
            <EmailEditor value={content} onChange={setContent} placeholder="Escribe tu post…" />
          ) : (
            <textarea id="soc-contenido" className="form-control" rows={5}
              placeholder="Escribe tu post... Usa #hashtags y @menciones"
              value={content} onChange={(e) => setContent(e.target.value)} />
          )}
          <p className="fs-12 text-muted text-end mt-1 mb-0">{textoPlano(content).length} caracteres</p>
        </div>

        <div className="form-group mb-3">
          <label htmlFor="soc-media" className="text-black font-w600">URL de imagen/vídeo</label>
          <input id="soc-media" className="form-control" type="url"
            placeholder="https://cdn.tudominio.com/imagen.jpg"
            value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} />
        </div>

        <div className="form-group mb-3">
          <label htmlFor="soc-fecha" className="text-black font-w600">Publicar en (vacío = ahora)</label>
          <input id="soc-fecha" className="form-control" type="datetime-local"
            value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
        </div>

        <div className="text-end">
          <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Publicando…" : scheduleAt ? "Programar" : "Publicar ahora"}
          </button>
        </div>
      </form>
    </W3crmModal>
  );
}

export default function SaasSocialPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [filterStatus, setFilterStatus] = useState<SocialPost["status"] | "all">("all");
  const [publishing, setPublishing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [postsRes, accountsRes] = await Promise.allSettled([
        fetch("/api/saas/social/posts?limit=50"),
        fetch("/api/saas/social/accounts"),
      ]);

      if (postsRes.status === "fulfilled" && postsRes.value.ok) {
        const data = (await postsRes.value.json().catch(() => ({}))) as { posts?: SocialPost[] };
        setPosts(Array.isArray(data.posts) ? data.posts : []);
      }
      if (accountsRes.status === "fulfilled" && accountsRes.value.ok) {
        const data = (await accountsRes.value.json().catch(() => ({}))) as { accounts?: SocialAccount[] };
        setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handlePublishNow(postId: string) {
    setPublishing(postId);
    setActionError(null);
    try {
      const r = await fetch("/api/saas/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", id: postId }),
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!d.ok) setActionError(d.error ?? "Error al publicar");
      await load();
    } finally {
      setPublishing(null);
    }
  }

  async function handleDelete(postId: string) {
    setDeleting(postId);
    try {
      await fetch(`/api/saas/social/posts?id=${postId}`, { method: "DELETE" });
      await load();
    } finally {
      setDeleting(null);
    }
  }

  const filtered = filterStatus === "all" ? posts : posts.filter((p) => p.status === filterStatus);

  const stats = {
    total: posts.length,
    published: posts.filter((p) => p.status === "published").length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    connected: accounts.filter((a) => a.isActive).length,
  };

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Redes Sociales" parentTitle="Captación" pageTitle="Social" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Posts totales" value={stats.total} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Publicados" value={stats.published} accent /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Programados" value={stats.scheduled} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Cuentas activas" value={stats.connected} /></div>

          <div className="col-xl-12">
            <p className="fs-14 text-muted">Programa y publica en todas tus redes desde un solo lugar</p>

            {actionError && (
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {actionError}
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setActionError(null)} />
              </div>
            )}

            {!loading && accounts.length === 0 && (
              <div className="alert alert-warning" role="alert">
                <p>
                  Sin cuentas de redes sociales conectadas. Conecta Meta o LinkedIn con OAuth para
                  programar y publicar posts en vivo.
                </p>
                <a className="btn btn-primary btn-sm me-2" href="/api/oauth/meta">Conectar Meta</a>
                <a className="btn btn-primary btn-sm me-2" href="/api/oauth/linkedin">Conectar LinkedIn</a>
                <Link href="/saas/integraciones">Ver todas las integraciones</Link>
              </div>
            )}

            {accounts.length > 0 && (
              <W3crmContentBox titulo="Cuentas conectadas" icono="fa-solid fa-link">
                <div className="d-flex flex-wrap gap-2">
                  {accounts.map((a) => {
                    const cfg = getPlatformCfg(a.platform);
                    return (
                      <span key={a.id} className="border rounded px-3 py-2 d-inline-flex align-items-center gap-2">
                        <i className={`${cfg.icon} text-primary`} aria-hidden="true" />
                        <span className="fw-bold">{a.accountName || "—"}</span>
                        <span className={`badge ${a.isActive ? "badge-success" : "badge-secondary"}`}>
                          {a.isActive ? "Conectado" : "Desconectado"}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </W3crmContentBox>
            )}

            <W3crmContentBox
              titulo="Publicaciones"
              icono="fa-solid fa-share-nodes"
              acciones={
                <button type="button" className="btn btn-primary btn-sm me-2" onClick={() => setShowNew(true)}>
                  + Nuevo post
                </button>
              }
            >
              <div className="mb-3" role="group" aria-label="Filtrar publicaciones">
                {(["all", "draft", "scheduled", "published", "failed"] as const).map((s) => (
                  <button key={s} type="button" aria-pressed={filterStatus === s}
                    className={`btn btn-sm me-1 mb-1 ${filterStatus === s ? "btn-primary" : "btn-primary light"}`}
                    onClick={() => setFilterStatus(s)}>
                    {s === "all" ? "Todos" : STATUS_LABELS[s]}
                  </button>
                ))}
              </div>

              {loading ? (
                <W3crmCargando texto="Cargando publicaciones…" />
              ) : filtered.length === 0 ? (
                <W3crmEmptyState title="Sin posts" description="Crea tu primer contenido para redes sociales." />
              ) : (
                <W3crmDataTable
                  filas={filtered}
                  etiqueta="publicaciones"
                  wrapperId="social_posts_wrapper"
                  porPagina={10}
                  reiniciarEn={filterStatus}
                  columnas={[
                    { titulo: "Red" },
                    { titulo: "Contenido" },
                    { titulo: "Programado" },
                    { titulo: "Estado" },
                    { titulo: "Gestión", alFinal: true },
                  ]}
                  render={(p) => {
                    const cfg = getPlatformCfg(p.platform);
                    return (
                      <tr key={p.id}>
                        <td>
                          <i className={`${cfg.icon} me-2 text-primary`} aria-hidden="true" />
                          <span className="fw-bold">{cfg.label}</span>
                        </td>
                        <td>
                          <span className="text-muted">{textoPlano(p.content) || "—"}</span>
                          {p.errorMessage ? (
                            <div className="text-danger fs-12 mt-1">{p.errorMessage}</div>
                          ) : null}
                        </td>
                        <td>{fechaHora(p.scheduledAt)}</td>
                        <td><span className={`badge ${estadoBadge(p.status)}`}>{estadoLabel(p.status)}</span></td>
                        <td className="text-end">
                          {(p.status === "draft" || p.status === "failed") && (
                            <button type="button" className="btn btn-primary light btn-sm me-1"
                              disabled={publishing === p.id}
                              aria-label={`Publicar ahora en ${cfg.label}`}
                              onClick={() => void handlePublishNow(p.id)}>
                              {publishing === p.id ? "Publicando…" : "Publicar ahora"}
                            </button>
                          )}
                          <button type="button" className="btn btn-danger light btn-sm"
                            disabled={deleting === p.id}
                            aria-label={`Eliminar publicación de ${cfg.label}`}
                            onClick={() => void handleDelete(p.id)}>
                            {deleting === p.id ? "…" : "Eliminar"}
                          </button>
                        </td>
                      </tr>
                    );
                  }}
                />
              )}
            </W3crmContentBox>
          </div>
        </div>
      </div>

      {showNew && <NewPostModal accounts={accounts} onClose={() => setShowNew(false)} onSaved={load} />}
    </SaasW3crmShell>
  );
}
