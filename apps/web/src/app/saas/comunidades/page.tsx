"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

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

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`;
  return `Hace ${Math.floor(diff / 86400000)} días`;
}

function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false);
  return (
    <NelvyonDsCard className={`p-4 ${post.pinned ? "border-primary/30 bg-primary/5" : ""}`}>
      {post.pinned && <p className="mb-2 text-xs font-medium text-primary">📌 Anclado</p>}
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{post.authorAvatar}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{post.authorName}</p>
            <p className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</p>
          </div>
          <p className="mt-1.5 text-sm text-foreground/90 leading-relaxed">{post.content}</p>
          <div className="mt-3 flex gap-4">
            <button onClick={() => setLiked(l => !l)} className={`flex items-center gap-1.5 text-xs transition-colors ${liked ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {liked ? "♥" : "♡"} {post.likes + (liked ? 1 : 0)}
            </button>
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">💬 {post.replies} respuestas</button>
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">↗ Compartir</button>
          </div>
        </div>
      </div>
    </NelvyonDsCard>
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Nueva comunidad</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={save} className="space-y-4 p-6">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-[72px_1fr]">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Icono</label>
              <input value={icon} onChange={e => setIcon(e.target.value)} maxLength={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-2xl text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Clientes VIP"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Descripción</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Para qué sirve esta comunidad…"
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="accent-primary" />
            <span className="text-sm text-foreground">Comunidad privada (solo por invitación)</span>
          </label>
          <div className="flex gap-3 pt-2">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving || !name} className="flex-1">{saving ? "Creando…" : "Crear comunidad"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
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

  const loadCommunities = useCallback(async () => {
    setLoadingCommunities(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/communities");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = (await res.json()) as { communities?: Community[] };
      const list = d.communities ?? [];
      setCommunities(list);
      if (list.length > 0 && !selectedId) setSelectedId(list[0]!.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar comunidades");
      setCommunities([]);
    } finally {
      setLoadingCommunities(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPosts = useCallback(async (communityId: string) => {
    setLoadingPosts(true);
    try {
      const res = await fetch(`/api/saas/communities?communityId=${communityId}&posts=true`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = (await res.json()) as { posts?: Post[] };
      setPosts(d.posts ?? []);
    } catch {
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => { void loadCommunities(); }, [loadCommunities]);
  useEffect(() => { if (selectedId) void loadPosts(selectedId); }, [selectedId, loadPosts]);

  const selected = communities.find(c => c.id === selectedId);
  const visiblePosts = posts.filter(p => p.communityId === selectedId).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="comunidades" />}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader title="Comunidades" subtitle="Espacios privados para conectar con tus clientes y crear engagement duradero" />
              <NelvyonDsButton onClick={() => setShowModal(true)}>+ Nueva comunidad</NelvyonDsButton>
            </div>

            {error && (
              <NelvyonDsCard className="p-4 border-red-500/30 bg-red-500/5">
                <p className="text-sm text-red-400">{error}</p>
                <button onClick={() => void loadCommunities()} className="mt-2 text-xs text-primary hover:underline">Reintentar</button>
              </NelvyonDsCard>
            )}

            {loadingCommunities ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/30" />)}
              </div>
            ) : communities.length === 0 && !error ? (
              <NelvyonDsCard className="p-16 text-center">
                <p className="text-4xl">🏘️</p>
                <p className="mt-4 font-semibold text-foreground">Sin comunidades todavía</p>
                <p className="mt-2 text-sm text-muted-foreground">Crea tu primera comunidad para conectar con tus clientes</p>
                <NelvyonDsButton className="mt-5" onClick={() => setShowModal(true)}>+ Nueva comunidad</NelvyonDsButton>
              </NelvyonDsCard>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                {/* Sidebar communities */}
                <div className="space-y-2">
                  {communities.map(c => (
                    <button key={c.id} onClick={() => setSelectedId(c.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${selectedId === c.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted/20"}`}>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl" style={{ backgroundColor: `${c.color}20` }}>{c.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                          {c.private && <span className="text-xs text-muted-foreground">🔒</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{c.memberCount} miembros · {c.postCount} posts</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Posts feed */}
                <div className="space-y-4">
                  {selected && (
                    <NelvyonDsCard className="p-4">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl" style={{ backgroundColor: `${selected.color}20` }}>{selected.icon}</div>
                        <div>
                          <p className="font-semibold text-foreground">{selected.name}</p>
                          <p className="text-xs text-muted-foreground">{selected.description}</p>
                        </div>
                      </div>
                      <textarea value={newPost} onChange={e => setNewPost(e.target.value)} rows={3}
                        placeholder="Escribe algo para la comunidad…"
                        className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
                      <div className="mt-2 flex justify-end">
                        <NelvyonDsButton disabled={!newPost.trim()} onClick={() => setNewPost("")} className="text-sm">Publicar</NelvyonDsButton>
                      </div>
                    </NelvyonDsCard>
                  )}
                  {loadingPosts ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/30" />)}
                    </div>
                  ) : visiblePosts.length === 0 ? (
                    <NelvyonDsCard className="p-16 text-center">
                      <p className="text-4xl">💬</p>
                      <p className="mt-4 font-semibold text-foreground">Sin posts aún</p>
                      <p className="mt-2 text-sm text-muted-foreground">Sé el primero en publicar en esta comunidad</p>
                    </NelvyonDsCard>
                  ) : (
                    visiblePosts.map(p => <PostCard key={p.id} post={p} />)
                  )}
                </div>
              </div>
            )}
      {showModal && <CreateCommunityModal onClose={() => setShowModal(false)} onCreated={() => void loadCommunities()} />}
    </SaasShellLayout>
  );
}
