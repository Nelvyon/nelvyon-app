"use client";

/**
 * /saas/comunidades sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: listado de comunidades, composición y muro -> `W3crmContentBox`; los
 * posts -> `list-group` con `W3crmAvatar`; el alta -> `W3crmModal`. Sin
 * componentes nuevos.
 *
 * SANEADO: `communities` y `posts` se validan como array antes de mapearlos, y
 * `timeAgo` deja de imprimir "Hace NaN min" cuando la fecha no es válida.
 * `mapCommunity`/`mapPost` conservan su normalización original —incluidos los
 * alias `membersCount`/`postsCount`/`repliesCount`— porque es la que absorbe las
 * dos formas que devuelve el backend.
 *
 * Lógica de NELVYON intacta: `GET /api/saas/communities`, el mismo GET con
 * `?communityId=…&posts=true`, `POST` para el alta y para las acciones
 * `create_post` y `like_post`, y `GET /api/saas/profile` para el nombre de
 * autor. Los dos botones deshabilitados (respuestas anidadas y compartir) se
 * conservan con su `title`: siguen siendo funciones no disponibles, no se
 * "arreglan" aquí.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmAvatar, W3crmEmptyState } from "@/features/saas-w3crm/components/W3crmUi";
import {
  W3crmCargando,
  W3crmContentBox,
  W3crmModal,
} from "@/features/saas-w3crm/components/W3crmContentBox";

interface Community {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  memberCount: number;
  postCount: number;
  private: boolean;
  createdAt: string;
}

interface Post {
  id: string;
  communityId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  likes: number;
  replies: number;
  pinned: boolean;
  createdAt: string;
}

function mapCommunity(raw: Record<string, unknown>): Community {
  return {
    id: String(raw.id),
    name: String(raw.name),
    description: String(raw.description ?? ""),
    icon: String(raw.icon ?? "💬"),
    color: "#0084ff",
    memberCount: Number(raw.memberCount ?? raw.membersCount ?? 0),
    postCount: Number(raw.postCount ?? raw.postsCount ?? 0),
    private: Boolean(raw.private ?? false),
    createdAt: String(raw.createdAt ?? ""),
  };
}

function mapPost(raw: Record<string, unknown>): Post {
  const authorName = String(raw.authorName ?? "Usuario");
  return {
    id: String(raw.id),
    communityId: String(raw.communityId),
    authorName,
    authorAvatar: authorName.charAt(0).toUpperCase() || "?",
    content: String(raw.content ?? ""),
    likes: Number(raw.likes ?? 0),
    replies: Number(raw.replies ?? raw.repliesCount ?? 0),
    pinned: Boolean(raw.pinned),
    createdAt: String(raw.createdAt ?? ""),
  };
}

/** Una fecha inválida imprimía "Hace NaN min". */
function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 0) return "Ahora";
  if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`;
  return `Hace ${Math.floor(diff / 86400000)} días`;
}

function miles(v: unknown): string {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n.toLocaleString("es-ES") : "—";
}

function PostCard({ post, onLike, liking }: { post: Post; onLike: (postId: string) => void; liking: boolean }) {
  return (
    <li className={`list-group-item px-0 ${post.pinned ? "bg-light" : ""}`}>
      {post.pinned && <p className="text-primary fs-12 fw-bold mb-1">📌 Anclado</p>}
      <div className="d-flex gap-3">
        <W3crmAvatar seed={post.id} label={post.authorName} />
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <span className="fw-bold me-2">{post.authorName}</span>
          <span className="text-muted fs-12">{timeAgo(post.createdAt)}</span>
          <p className="mt-1 mb-2">{post.content}</p>
          <div className="d-flex flex-wrap gap-3">
            <button type="button" className="btn btn-link p-0 fs-12 text-muted text-decoration-none"
              disabled={liking} aria-label={`Me gusta el post de ${post.authorName}`}
              onClick={() => onLike(post.id)}>
              ♡ {miles(post.likes)}
            </button>
            <button type="button" className="btn btn-link p-0 fs-12 text-muted text-decoration-none" disabled
              title="Respuestas anidadas próximamente">
              💬 {miles(post.replies)} respuestas
            </button>
            <button type="button" className="btn btn-link p-0 fs-12 text-muted text-decoration-none" disabled
              title="Comparte el enlace de la página desde el navegador">
              ↗ Compartir
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function CreateCommunityModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🌐");
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, icon, private: isPrivate }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear comunidad");
    } finally {
      setSaving(false);
    }
  }

  return (
    <W3crmModal titulo="Nueva comunidad" onClose={onClose} error={error}>
      <form onSubmit={(e) => void save(e)}>
        <div className="row">
          <div className="col-3">
            <div className="form-group mb-3">
              <label htmlFor="cm-icono" className="text-black font-w600">Icono</label>
              <input id="cm-icono" className="form-control fs-18" maxLength={2}
                value={icon} onChange={e => setIcon(e.target.value)} />
            </div>
          </div>
          <div className="col-9">
            <div className="form-group mb-3">
              <label htmlFor="cm-nombre" className="text-black font-w600">
                Nombre <span className="required">*</span>
              </label>
              <input id="cm-nombre" className="form-control" placeholder="Ej: Clientes VIP"
                value={name} onChange={e => setName(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="form-group mb-3">
          <label htmlFor="cm-desc" className="text-black font-w600">Descripción</label>
          <textarea id="cm-desc" className="form-control" rows={3}
            placeholder="Para qué sirve esta comunidad…"
            value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="form-check mb-3">
          <input className="form-check-input" type="checkbox" id="cm-privada"
            checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
          <label className="form-check-label" htmlFor="cm-privada">
            Comunidad privada (solo por invitación)
          </label>
        </div>
        <div className="text-end">
          <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !name}>
            {saving ? "Creando…" : "Crear comunidad"}
          </button>
        </div>
      </form>
    </W3crmModal>
  );
}

export default function SaasComunidadesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newPost, setNewPost] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("Usuario");

  useEffect(() => {
    void fetch("/api/saas/profile")
      .then(r => (r.ok ? r.json() : null))
      .then((d: { profile?: { fullName?: string } } | null) => {
        const name = d?.profile?.fullName?.trim();
        if (name) setAuthorName(name);
      })
      .catch(() => {});
  }, []);

  const loadCommunities = useCallback(async () => {
    setLoadingCommunities(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/communities");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = (await res.json()) as { communities?: Record<string, unknown>[] };
      const list = (Array.isArray(d.communities) ? d.communities : []).map(mapCommunity);
      setCommunities(list);
      if (list.length > 0) {
        setSelectedId(prev => prev ?? list[0]!.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar comunidades");
      setCommunities([]);
    } finally {
      setLoadingCommunities(false);
    }
  }, []);

  const loadPosts = useCallback(async (communityId: string) => {
    setLoadingPosts(true);
    try {
      const res = await fetch(`/api/saas/communities?communityId=${communityId}&posts=true`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = (await res.json()) as { posts?: Record<string, unknown>[] };
      setPosts((Array.isArray(d.posts) ? d.posts : []).map(mapPost));
    } catch {
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => { void loadCommunities(); }, [loadCommunities]);
  useEffect(() => { if (selectedId) void loadPosts(selectedId); }, [selectedId, loadPosts]);

  async function publishPost() {
    if (!selectedId || !newPost.trim()) return;
    setPublishing(true);
    setPostError(null);
    try {
      const res = await fetch("/api/saas/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_post",
          communityId: selectedId,
          content: newPost.trim(),
          authorName,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Error ${res.status}`);
      }
      setNewPost("");
      await loadPosts(selectedId);
      await loadCommunities();
    } catch (err) {
      setPostError(err instanceof Error ? err.message : "Error al publicar");
    } finally {
      setPublishing(false);
    }
  }

  async function likePost(postId: string) {
    if (!selectedId) return;
    setLikingId(postId);
    try {
      const res = await fetch("/api/saas/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like_post", postId }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      await loadPosts(selectedId);
    } catch {
      // silent — count will reconcile on next load
    } finally {
      setLikingId(null);
    }
  }

  const selected = communities.find(c => c.id === selectedId);
  const visiblePosts = posts.filter(p => p.communityId === selectedId).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Comunidades" parentTitle="Fidelización" pageTitle="Espacios" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-12">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
              <p className="fs-14 text-muted mb-0">
                Espacios privados para conectar con tus clientes y crear engagement duradero
              </p>
              <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>
                + Nueva comunidad
              </button>
            </div>

            {error && (
              <div className="alert alert-danger py-2" role="alert">
                <span className="fs-14 d-block">{error}</span>
                <button type="button" className="btn btn-primary light btn-sm mt-2"
                  onClick={() => void loadCommunities()}>Reintentar</button>
              </div>
            )}
          </div>

          {loadingCommunities ? (
            <div className="col-xl-12"><W3crmCargando texto="Cargando comunidades…" /></div>
          ) : communities.length === 0 && !error ? (
            <div className="col-xl-12">
              <W3crmContentBox titulo="Comunidades" icono="fa-solid fa-users-rectangle">
                <W3crmEmptyState
                  title="Sin comunidades todavía"
                  description="Crea tu primera comunidad para conectar con tus clientes"
                />
                <div className="text-center">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
                    + Nueva comunidad
                  </button>
                </div>
              </W3crmContentBox>
            </div>
          ) : (
            <>
              <div className="col-xl-4 col-lg-5">
                <W3crmContentBox titulo={`Espacios (${communities.length})`} icono="fa-solid fa-users-rectangle">
                  <ul className="list-group list-group-flush">
                    {communities.map(c => (
                      <li key={c.id} className={`list-group-item px-0 ${selectedId === c.id ? "bg-light" : ""}`}>
                        <button type="button"
                          className="btn btn-link p-0 text-start text-decoration-none d-flex align-items-center gap-2 w-100"
                          aria-pressed={selectedId === c.id}
                          onClick={() => setSelectedId(c.id)}>
                          <span className="d-inline-flex align-items-center justify-content-center rounded fs-18"
                            style={{ width: 40, height: 40, backgroundColor: `${c.color}20` }} aria-hidden="true">
                            {c.icon}
                          </span>
                          <span className="flex-grow-1" style={{ minWidth: 0 }}>
                            <span className="fw-bold d-block">
                              {c.name}{c.private ? <span className="ms-1 fs-12">🔒</span> : null}
                            </span>
                            <span className="d-block text-muted fs-12">
                              {miles(c.memberCount)} miembros · {miles(c.postCount)} posts
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </W3crmContentBox>
              </div>

              <div className="col-xl-8 col-lg-7">
                {selected && (
                  <W3crmContentBox
                    titulo={`${selected.icon} ${selected.name}`}
                    icono="fa-solid fa-pen-to-square"
                  >
                    {selected.description ? (
                      <p className="fs-12 text-muted">{selected.description}</p>
                    ) : null}
                    <div className="form-group mb-2">
                      <label htmlFor="cm-post" className="visually-hidden">Nuevo post</label>
                      <textarea id="cm-post" className="form-control" rows={3}
                        placeholder="Escribe algo para la comunidad…"
                        value={newPost} onChange={e => setNewPost(e.target.value)} />
                    </div>
                    {postError && <div className="alert alert-danger py-2 fs-14" role="alert">{postError}</div>}
                    <div className="text-end">
                      <button type="button" className="btn btn-primary"
                        disabled={!newPost.trim() || publishing}
                        onClick={() => void publishPost()}>
                        {publishing ? "Publicando…" : "Publicar"}
                      </button>
                    </div>
                  </W3crmContentBox>
                )}

                <W3crmContentBox titulo={`Muro (${visiblePosts.length})`} icono="fa-solid fa-comments">
                  {loadingPosts ? (
                    <W3crmCargando texto="Cargando posts…" />
                  ) : visiblePosts.length === 0 ? (
                    <W3crmEmptyState
                      title="Sin posts aún"
                      description="Sé el primero en publicar en esta comunidad"
                    />
                  ) : (
                    <ul className="list-group list-group-flush">
                      {visiblePosts.map(p => (
                        <PostCard
                          key={p.id}
                          post={p}
                          onLike={id => void likePost(id)}
                          liking={likingId === p.id}
                        />
                      ))}
                    </ul>
                  )}
                </W3crmContentBox>
              </div>
            </>
          )}
        </div>
      </div>

      {showModal && <CreateCommunityModal onClose={() => setShowModal(false)} onCreated={() => void loadCommunities()} />}
    </SaasW3crmShell>
  );
}
