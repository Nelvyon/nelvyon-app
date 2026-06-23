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

const MOCK_COMMUNITIES: Community[] = [
  { id: "c1", name: "Clientes Premium", description: "Espacio exclusivo para clientes de plan Pro y Agency", icon: "⭐", color: "#6366f1", memberCount: 47, postCount: 234, private: true, createdAt: "2026-01-10T10:00:00Z" },
  { id: "c2", name: "Formación & Recursos", description: "Materiales, guías y tutoriales para aprovechar al máximo el servicio", icon: "📚", color: "#10b981", memberCount: 312, postCount: 891, private: false, createdAt: "2026-02-01T10:00:00Z" },
  { id: "c3", name: "Ideas & Sugerencias", description: "Comparte tu feedback y vota las próximas funcionalidades", icon: "💡", color: "#f59e0b", memberCount: 189, postCount: 456, private: false, createdAt: "2026-03-15T10:00:00Z" },
];

const MOCK_POSTS: Post[] = [
  { id: "p1", communityId: "c1", authorName: "María García", authorAvatar: "M", content: "¡Hola a todos! Acabo de implementar el workflow de lead nurturing que compartió el equipo y los resultados son increíbles. CTR del 34% en la primera semana. ¿Alguien más lo ha probado?", likes: 23, replies: 8, pinned: true, createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: "p2", communityId: "c1", authorName: "Carlos Méndez", authorAvatar: "C", content: "Pregunta: ¿cómo configuráis vosotros el lead scoring para el sector inmobiliario? Tengo dudas con el peso de las variables firmográficas.", likes: 11, replies: 5, pinned: false, createdAt: new Date(Date.now() - 3600000 * 8).toISOString() },
  { id: "p3", communityId: "c2", authorName: "Equipo Nelvyon", authorAvatar: "N", content: "📹 NUEVO VIDEO: Cómo configurar tu primer funnel de captación desde cero en menos de 30 minutos. Enlace en los recursos adjuntos.", likes: 67, replies: 14, pinned: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "p4", communityId: "c3", authorName: "Ana López", authorAvatar: "A", content: "Votad: ¿qué queréis que implementemos antes? A) Integración nativa con Shopify B) Editor visual de emails C) App móvil", likes: 45, replies: 32, pinned: false, createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
];

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

function CreateCommunityModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🌐");
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Nueva comunidad</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={save} className="space-y-4 p-6">
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
  const [communities] = useState<Community[]>(MOCK_COMMUNITIES);
  const [selectedId, setSelectedId] = useState<string>(MOCK_COMMUNITIES[0]!.id);
  const [posts] = useState<Post[]>(MOCK_POSTS);
  const [showModal, setShowModal] = useState(false);
  const [newPost, setNewPost] = useState("");

  const selected = communities.find(c => c.id === selectedId);
  const visiblePosts = posts.filter(p => p.communityId === selectedId).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="comunidades" />}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader title="Comunidades" subtitle="Espacios privados para conectar con tus clientes y crear engagement duradero" />
              <NelvyonDsButton onClick={() => setShowModal(true)}>+ Nueva comunidad</NelvyonDsButton>
            </div>

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
                {visiblePosts.length === 0 ? (
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
      {showModal && <CreateCommunityModal onClose={() => setShowModal(false)} />}
    </SaasShellLayout>
  );
}
