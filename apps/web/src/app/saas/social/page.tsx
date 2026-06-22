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
import { EmailEditor } from "@/features/email-editor/EmailEditor";

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = "instagram" | "facebook" | "twitter" | "linkedin" | "tiktok";
type PostStatus = "draft" | "scheduled" | "published" | "failed";

interface SocialPost {
  id: string;
  platform: Platform;
  content: string;
  mediaUrl: string | null;
  status: PostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
}

interface SocialAccount {
  platform: Platform;
  username: string;
  connected: boolean;
  followers: number;
}

const PLATFORM_CONFIG: Record<Platform, { label: string; color: string; icon: string }> = {
  instagram: { label: "Instagram", color: "bg-pink-500/10 text-pink-400 border-pink-500/20", icon: "📸" },
  facebook: { label: "Facebook", color: "bg-blue-600/10 text-blue-400 border-blue-600/20", icon: "👤" },
  twitter: { label: "X (Twitter)", color: "bg-sky-500/10 text-sky-400 border-sky-500/20", icon: "🐦" },
  linkedin: { label: "LinkedIn", color: "bg-blue-700/10 text-blue-300 border-blue-700/20", icon: "💼" },
  tiktok: { label: "TikTok", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: "🎵" },
};

const STATUS_TONE = {
  draft: "primary",
  scheduled: "warning",
  published: "success",
  failed: "danger",
} as const;

const STATUS_LABELS = {
  draft: "Borrador",
  scheduled: "Programado",
  published: "Publicado",
  failed: "Error",
} as const;

// ─── New post modal ───────────────────────────────────────────────────────────

function NewPostModal({ accounts, onClose, onSaved }: { accounts: SocialAccount[]; onClose: () => void; onSaved: () => void }) {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useRichEditor, setUseRichEditor] = useState(false);

  const connectedAccounts = accounts.filter((a) => a.connected);

  function togglePlatform(p: Platform) {
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (platforms.length === 0) { setError("Selecciona al menos una red social"); return; }
    if (!content.trim()) { setError("El contenido es obligatorio"); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        platforms,
        content: content.trim(),
        mediaUrl: mediaUrl.trim() || null,
        scheduledAt: scheduleAt ? new Date(scheduleAt).toISOString() : null,
      };
      const res = await fetch("/api/v1/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(j.detail ?? "Error al publicar");
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Nuevo post</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-5 p-6">
          {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}

          {/* Platform selector */}
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Redes sociales *</label>
            <div className="flex flex-wrap gap-2">
              {connectedAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay cuentas conectadas. Ve a Configuración → Redes Sociales.</p>
              ) : connectedAccounts.map((a) => {
                const cfg = PLATFORM_CONFIG[a.platform];
                const sel = platforms.includes(a.platform);
                return (
                  <button
                    key={a.platform}
                    type="button"
                    onClick={() => togglePlatform(a.platform)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                      sel ? cfg.color + " ring-2 ring-primary/40" : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {cfg.icon} {cfg.label}
                    <span className="text-xs opacity-60">@{a.username}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Contenido *</label>
              <button type="button" onClick={() => setUseRichEditor((v) => !v)} className="text-xs text-primary hover:underline">
                {useRichEditor ? "Editor simple" : "Editor HTML"}
              </button>
            </div>
            {useRichEditor ? (
              <EmailEditor value={content} onChange={setContent} placeholder="Escribe tu post…" />
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                placeholder="Escribe tu post... Usa #hashtags y @menciones"
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            )}
            <p className="mt-1 text-right text-xs text-muted-foreground">{content.replace(/<[^>]+>/g, "").length} caracteres</p>
          </div>

          {/* Media URL */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">URL de imagen/vídeo</label>
            <input
              type="url"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="https://cdn.tudominio.com/imagen.jpg"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* Schedule */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Publicar en (vacío = ahora)</label>
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">
              {saving ? "Publicando…" : scheduleAt ? "Programar" : "Publicar ahora"}
            </NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SaasSocialPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<Platform | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [postsRes, accountsRes] = await Promise.allSettled([
        fetch("/api/v1/social/posts?limit=50"),
        fetch("/api/v1/social/accounts"),
      ]);

      if (postsRes.status === "fulfilled" && postsRes.value.ok) {
        const data = (await postsRes.value.json().catch(() => ({ posts: [] }))) as { posts: SocialPost[] };
        setPosts(data.posts ?? []);
      }
      if (accountsRes.status === "fulfilled" && accountsRes.value.ok) {
        const data = (await accountsRes.value.json().catch(() => ({ accounts: [] }))) as { accounts: SocialAccount[] };
        setAccounts(data.accounts ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const PLATFORMS: Platform[] = ["instagram", "facebook", "twitter", "linkedin", "tiktok"];
  const filtered = filterPlatform === "all" ? posts : posts.filter((p) => p.platform === filterPlatform);

  const stats = {
    total: posts.length,
    published: posts.filter((p) => p.status === "published").length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    totalReach: posts.reduce((s, p) => s + p.reach, 0),
  };

  return (
    <DashboardLayout sidebar={<SaasSidebar activeId="campanias" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader
            title="Redes Sociales"
            subtitle="Programa y publica en todas tus redes desde un solo lugar"
          />
          <NelvyonDsButton onClick={() => setShowNew(true)}>+ Nuevo post</NelvyonDsButton>
        </div>

        {/* Connected accounts */}
        {accounts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => {
              const cfg = PLATFORM_CONFIG[a.platform];
              return (
                <div key={a.platform} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${a.connected ? cfg.color : "border-border text-muted-foreground"}`}>
                  {cfg.icon}
                  <span className="font-medium">@{a.username}</span>
                  <span className="text-xs opacity-70">{a.connected ? `${a.followers.toLocaleString("es-ES")} seg.` : "Desconectado"}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Posts totales", value: stats.total },
            { label: "Publicados", value: stats.published },
            { label: "Programados", value: stats.scheduled },
            { label: "Alcance total", value: stats.totalReach.toLocaleString("es-ES") },
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {/* Platform filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterPlatform("all")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filterPlatform === "all" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}
          >
            Todas
          </button>
          {PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => setFilterPlatform(p)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filterPlatform === p ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}
            >
              {PLATFORM_CONFIG[p].icon} {PLATFORM_CONFIG[p].label}
            </button>
          ))}
        </div>

        {/* Posts */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/30" />)}
          </div>
        ) : filtered.length === 0 ? (
          <NelvyonDsCard className="p-16 text-center">
            <p className="text-5xl">📱</p>
            <p className="mt-4 text-lg font-semibold text-foreground">Sin posts</p>
            <p className="mt-2 text-sm text-muted-foreground">Crea tu primer contenido para redes sociales</p>
            <NelvyonDsButton className="mt-5" onClick={() => setShowNew(true)}>+ Nuevo post</NelvyonDsButton>
          </NelvyonDsCard>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((p) => {
              const cfg = PLATFORM_CONFIG[p.platform];
              return (
                <NelvyonDsCard key={p.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <span className="text-2xl">{cfg.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{cfg.label}</span>
                        <NelvyonDsBadge tone={STATUS_TONE[p.status]} size="sm">{STATUS_LABELS[p.status]}</NelvyonDsBadge>
                        {p.scheduledAt && (
                          <span className="text-xs text-muted-foreground">
                            📅 {new Date(p.scheduledAt).toLocaleString("es-ES")}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.content.replace(/<[^>]+>/g, "")}</p>
                      {p.status === "published" && (
                        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                          <span>❤️ {p.likes}</span>
                          <span>💬 {p.comments}</span>
                          <span>🔁 {p.shares}</span>
                          <span>👁 {p.reach.toLocaleString("es-ES")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </NelvyonDsCard>
              );
            })}
          </div>
        )}
      </div>

      {showNew && <NewPostModal accounts={accounts} onClose={() => setShowNew(false)} onSaved={load} />}
    </DashboardLayout>
  );
}
