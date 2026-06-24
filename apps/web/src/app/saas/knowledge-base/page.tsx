"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

interface KbCategory {
  id: string; name: string; icon: string; slug: string; sortOrder: number; articleCount: number;
}
interface KbArticle {
  id: string; categoryId: string | null; categoryName: string | null;
  title: string; slug: string; content: string; excerpt: string;
  published: boolean; views: number; helpful: number; notHelpful: number;
  createdAt: string; updatedAt: string;
}

const inp = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none";

// ── Article Editor ────────────────────────────────────────────────────────────
function ArticleEditor({ article, categories, onClose, onSaved }: {
  article?: KbArticle; categories: KbCategory[];
  onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = useState(article?.title ?? "");
  const [content, setContent] = useState(article?.content ?? "");
  const [categoryId, setCategoryId] = useState(article?.categoryId ?? "");
  const [published, setPublished] = useState(article?.published ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) { setError("Título y contenido son obligatorios"); return; }
    setSaving(true); setError(null);
    try {
      const body = article
        ? { action: "update", id: article.id, title: title.trim(), content: content.trim(), categoryId: categoryId || null, published }
        : { title: title.trim(), content: content.trim(), categoryId: categoryId || null, published };
      const res = await fetch("/api/saas/knowledge-base", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json() as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error al guardar artículo"); return; }
      onSaved(); onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">{article ? "Editar artículo" : "Nuevo artículo"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={save} className="space-y-4 p-6">
          {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Cómo configurar tu primera campaña" className={inp} /></div>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Categoría</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inp}>
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Contenido * (Markdown soportado)</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={14}
              placeholder="# Título&#10;&#10;Escribe tu artículo aquí..."
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground font-mono focus:border-primary focus:outline-none" /></div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} className="accent-primary" />
            <span className="text-sm text-foreground">Publicar (visible para clientes)</span>
          </label>
          <div className="flex gap-3 pt-2">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Guardando…" : "Guardar artículo"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Category Modal ────────────────────────────────────────────────────────────
function CategoryModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Nombre obligatorio"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/saas/knowledge-base", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create-category", name: name.trim(), icon }) });
      const d = await res.json() as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error"); return; }
      onSaved(); onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Nueva categoría</h2>
        {error && <p className="mb-3 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-[60px_1fr] gap-3">
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Icono</label>
              <input value={icon} onChange={e => setIcon(e.target.value)} className={`${inp} text-center text-2xl`} maxLength={4} /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Primeros pasos" className={inp} /></div>
          </div>
          <div className="flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Guardando…" : "Crear"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SaasKnowledgeBasePage() {
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [categories, setCategories] = useState<KbCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editing, setEditing] = useState<KbArticle | undefined>();
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, cRes] = await Promise.all([
        fetch("/api/saas/knowledge-base"),
        fetch("/api/saas/knowledge-base?resource=categories"),
      ]);
      if (aRes.ok) { const d = await aRes.json() as { articles?: KbArticle[] }; setArticles(d.articles ?? []); }
      if (cRes.ok) { const d = await cRes.json() as { categories?: KbCategory[] }; setCategories(d.categories ?? []); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function deleteArticle(id: string) {
    if (!window.confirm("¿Eliminar artículo?")) return;
    await fetch("/api/saas/knowledge-base", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    void load();
  }

  async function togglePublish(article: KbArticle) {
    await fetch("/api/saas/knowledge-base", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", id: article.id, published: !article.published }) });
    void load();
  }

  const filtered = articles.filter(a => {
    if (filterCategory !== "all" && a.categoryId !== filterCategory) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.excerpt.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalViews   = articles.reduce((s, a) => s + a.views, 0);
  const withVotes    = articles.filter(a => a.helpful + a.notHelpful > 0);
  const avgHelpful   = withVotes.length > 0
    ? withVotes.reduce((s, a) => s + (a.helpful / (a.helpful + a.notHelpful)) * 100, 0) / withVotes.length
    : 0;

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="herramientas" />}>
      <div className="flex flex-col gap-6 pb-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <NelvyonDsSectionHeader title="Base de Conocimiento" subtitle="Centro de ayuda público para tus clientes — reduce tickets y mejora la satisfacción" />
          <div className="flex gap-2">
            <NelvyonDsButton variant="ghost" onClick={() => setShowCatModal(true)}>+ Categoría</NelvyonDsButton>
            <NelvyonDsButton onClick={() => { setEditing(undefined); setShowEditor(true); }}>+ Nuevo artículo</NelvyonDsButton>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Artículos publicados", value: String(articles.filter(a => a.published).length) },
            { label: "Total lecturas",        value: totalViews.toLocaleString("es-ES") },
            { label: "% útil",                value: `${Math.round(avgHelpful)}%` },
            { label: "Categorías",            value: String(categories.length) },
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {/* Category pills */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterCategory("all")} className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${filterCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"}`}>
              Todas ({articles.length})
            </button>
            {categories.map(c => (
              <button key={c.id} onClick={() => setFilterCategory(filterCategory === c.id ? "all" : c.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${filterCategory === c.id ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"}`}>
                {c.icon} {c.name} ({c.articleCount})
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar artículo…"
          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" />

        {/* Articles */}
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/30" />)}</div>
        ) : filtered.length === 0 ? (
          <NelvyonDsCard className="p-16 text-center">
            <p className="text-4xl">📚</p>
            <p className="mt-4 text-lg font-semibold text-foreground">{search || filterCategory !== "all" ? "Sin resultados" : "Base de conocimiento vacía"}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {search || filterCategory !== "all" ? "Prueba con otros filtros" : "Crea el primer artículo para ayudar a tus clientes."}
            </p>
            {!search && filterCategory === "all" && <NelvyonDsButton className="mt-5" onClick={() => { setEditing(undefined); setShowEditor(true); }}>+ Crear artículo</NelvyonDsButton>}
          </NelvyonDsCard>
        ) : (
          <div className="space-y-3">
            {filtered.map(a => {
              const helpfulPct = a.helpful + a.notHelpful > 0 ? Math.round((a.helpful / (a.helpful + a.notHelpful)) * 100) : null;
              return (
                <NelvyonDsCard key={a.id} className="p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">{a.title}</h3>
                        <NelvyonDsBadge tone={a.published ? "success" : "primary"}>{a.published ? "Publicado" : "Borrador"}</NelvyonDsBadge>
                        {a.categoryName && <span className="rounded-md bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground">{a.categoryName}</span>}
                      </div>
                      {a.excerpt && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{a.excerpt}</p>}
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>{a.views.toLocaleString("es-ES")} lecturas</span>
                        {helpfulPct !== null && <span className="text-green-400">👍 {helpfulPct}% útil</span>}
                        <span>Actualizado {new Date(a.updatedAt).toLocaleDateString("es-ES")}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0 flex-col items-end">
                      <NelvyonDsButton variant="ghost" className="text-xs" onClick={() => { setEditing(a); setShowEditor(true); }}>✎ Editar</NelvyonDsButton>
                      <button onClick={() => void togglePublish(a)} className="text-xs text-muted-foreground hover:text-foreground">{a.published ? "Despublicar" : "Publicar"}</button>
                      <button onClick={() => void deleteArticle(a.id)} className="text-xs text-muted-foreground hover:text-red-400">Eliminar</button>
                    </div>
                  </div>
                </NelvyonDsCard>
              );
            })}
          </div>
        )}
      </div>

      {showEditor && <ArticleEditor article={editing} categories={categories} onClose={() => setShowEditor(false)} onSaved={() => void load()} />}
      {showCatModal && <CategoryModal onClose={() => setShowCatModal(false)} onSaved={() => void load()} />}
    </SaasShellLayout>
  );
}
