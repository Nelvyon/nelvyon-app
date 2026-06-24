"use client";

import { useCallback, useEffect, useState } from "react";

import {
  NelvyonDsBadge,
  NelvyonDsButton,
  NelvyonDsCard,
  NelvyonDsSectionHeader,
} from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { EmailEditor } from "@/features/email-editor/EmailEditor";

// ─── Types (shaped to match /api/saas/social/* responses) ─────────────────────

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

const PLATFORM_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  instagram: { label: "Instagram", color: "bg-pink-500/10 text-pink-400 border-pink-500/20", icon: "📸" },
  facebook: { label: "Facebook", color: "bg-blue-600/10 text-blue-400 border-blue-600/20", icon: "👤" },
  twitter: { label: "X (Twitter)", color: "bg-sky-500/10 text-sky-400 border-sky-500/20", icon: "🐦" },
  linkedin: { label: "LinkedIn", color: "bg-blue-700/10 text-blue-300 border-blue-700/20", icon: "💼" },
  tiktok: { label: "TikTok", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: "🎵" },
  meta: { label: "Meta", color: "bg-blue-600/10 text-blue-400 border-blue-600/20", icon: "🌐" },
};

function getPlatformCfg(platform: string) {
  return PLATFORM_CONFIG[platform] ?? { label: platform, color: "border-border text-muted-foreground", icon: "📱" };
}

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
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useRichEditor, setUseRichEditor] = useState(false);

  const connectedAccounts = accounts.filter((a) => a.isActive);

  function toggleAccount(id: string) {
    setSelectedAccountIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
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
      // One POST per selected account
      await Promise.all(selectedAccountIds.map((social_account_id) =>
        fetch("/api/saas/social/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ social_account_id, content: content.trim(), media_urls: mediaUrls, scheduled_at: scheduledAt }),
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Nuevo post</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-5 p-6">
          {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}

          {/* Account selector */}
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Cuentas *</label>
            <div className="flex flex-wrap gap-2">
              {connectedAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay cuentas conectadas. Ve a Configuración → Redes Sociales.</p>
              ) : connectedAccounts.map((a) => {
                const cfg = getPlatformCfg(a.platform);
                const sel = selectedAccountIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAccount(a.id)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                      sel ? cfg.color + " ring-2 ring-primary/40" : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {cfg.icon} {cfg.label}
                    <span className="text-xs opacity-60">{a.accountName}</span>
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
  const [filterStatus, setFilterStatus] = useState<SocialPost["status"] | "all">("all");
  const [publishing, setPublishing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [postsRes, accountsRes] = await Promise.allSettled([
        fetch("/api/saas/social/posts?limit=50"),
        fetch("/api/saas/social/accounts"),
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

  async function handlePublishNow(postId: string) {
    setPublishing(postId);
    try {
      const r = await fetch("/api/saas/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", id: postId }),
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!d.ok) alert(d.error ?? "Error al publicar");
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
    <SaasShellLayout sidebar={<SaasSidebar activeId="social" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader
            title="Redes Sociales"
            subtitle="Programa y publica en todas tus redes desde un solo lugar"
          />
          <NelvyonDsButton onClick={() => setShowNew(true)}>+ Nuevo post</NelvyonDsButton>
        </div>

        {/* No-account warning */}
        {!loading && accounts.length === 0 && (
          <NelvyonDsCard className="border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-medium text-foreground">Sin cuentas de redes sociales conectadas</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Conecta tu cuenta de Meta o LinkedIn para poder programar y publicar posts.
                  Ve a <strong>Configuración → Integraciones</strong> y pega tu Access Token.
                </p>
              </div>
            </div>
          </NelvyonDsCard>
        )}

        {/* Connected accounts */}
        {accounts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => {
              const cfg = getPlatformCfg(a.platform);
              return (
                <div key={a.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${a.isActive ? cfg.color : "border-border text-muted-foreground"}`}>
                  {cfg.icon}
                  <span className="font-medium">{a.accountName}</span>
                  <span className="text-xs opacity-70">{a.isActive ? "Conectado" : "Desconectado"}</span>
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
            { label: "Cuentas activas", value: stats.connected },
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {/* Status filters */}
        <div className="flex flex-wrap gap-2">
          {(["all", "draft", "scheduled", "published", "failed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}
            >
              {s === "all" ? "Todos" : STATUS_LABELS[s]}
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
              const cfg = getPlatformCfg(p.platform);
              return (
                <NelvyonDsCard key={p.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <span className="text-2xl">{cfg.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{cfg.label}</span>
                        <NelvyonDsBadge tone={STATUS_TONE[p.status]}>{STATUS_LABELS[p.status]}</NelvyonDsBadge>
                        {p.scheduledAt && (
                          <span className="text-xs text-muted-foreground">
                            📅 {new Date(p.scheduledAt).toLocaleString("es-ES")}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.content.replace(/<[^>]+>/g, "")}</p>
                      {p.errorMessage && (
                        <p className="mt-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-400">
                          ❌ {p.errorMessage}
                        </p>
                      )}
                      <div className="mt-3 flex gap-2">
                        {(p.status === "draft" || p.status === "failed") && (
                          <NelvyonDsButton
                            variant="ghost"
                            className="text-xs"
                            onClick={() => void handlePublishNow(p.id)}
                            disabled={publishing === p.id}
                          >
                            {publishing === p.id ? "Publicando…" : "↑ Publicar ahora"}
                          </NelvyonDsButton>
                        )}
                        <NelvyonDsButton
                          variant="ghost"
                          className="text-xs text-red-400 hover:text-red-300"
                          onClick={() => void handleDelete(p.id)}
                          disabled={deleting === p.id}
                        >
                          {deleting === p.id ? "…" : "Eliminar"}
                        </NelvyonDsButton>
                      </div>
                    </div>
                  </div>
                </NelvyonDsCard>
              );
            })}
          </div>
        )}
      </div>

      {showNew && <NewPostModal accounts={accounts} onClose={() => setShowNew(false)} onSaved={load} />}
    </SaasShellLayout>
  );
}
