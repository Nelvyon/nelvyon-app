"use client";

import { useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

interface KBArticle {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  published: boolean;
  views: number;
  helpful: number;
  notHelpful: number;
  updatedAt: string;
}

interface KBCategory {
  id: string;
  name: string;
  icon: string;
  articleCount: number;
}

const MOCK_CATEGORIES: KBCategory[] = [
  { id: "c1", name: "Primeros pasos", icon: "🚀", articleCount: 8 },
  { id: "c2", name: "CRM & Contactos", icon: "👥", articleCount: 12 },
  { id: "c3", name: "Email Marketing", icon: "📧", articleCount: 15 },
  { id: "c4", name: "Automatizaciones", icon: "⚡", articleCount: 10 },
  { id: "c5", name: "Facturación", icon: "💳", articleCount: 6 },
  { id: "c6", name: "Integraciones", icon: "🔗", articleCount: 9 },
];

const MOCK_ARTICLES: KBArticle[] = [
  { id: "a1", title: "Cómo configurar tu primera campaña de email", excerpt: "Guía paso a paso para crear y enviar tu primera campaña de email marketing con Nelvyon.", category: "Email Marketing", published: true, views: 1243, helpful: 98, notHelpful: 4, updatedAt: "2026-06-10T10:00:00Z" },
  { id: "a2", title: "Importar contactos desde CSV", excerpt: "Aprende a importar tu lista de contactos desde un archivo Excel o CSV en segundos.", category: "CRM & Contactos", published: true, views: 892, helpful: 76, notHelpful: 8, updatedAt: "2026-06-05T10:00:00Z" },
  { id: "a3", title: "Crear un workflow de lead nurturing", excerpt: "Automatiza el seguimiento de tus leads con workflows basados en comportamiento.", category: "Automatizaciones", published: true, views: 654, helpful: 61, notHelpful: 5, updatedAt: "2026-06-15T10:00:00Z" },
  { id: "a4", title: "Conectar tu dominio personalizado", excerpt: "Cómo usar tu propio dominio para el portal de clientes y los emails enviados.", category: "Primeros pasos", published: true, views: 432, helpful: 45, notHelpful: 12, updatedAt: "2026-06-01T10:00:00Z" },
  { id: "a5", title: "Gestionar facturas y pagos", excerpt: "Todo sobre el módulo de facturación: crear, enviar y registrar pagos.", category: "Facturación", published: false, views: 0, helpful: 0, notHelpful: 0, updatedAt: "2026-06-22T10:00:00Z" },
];

function ArticleEditor({ article, onClose }: { article?: KBArticle; onClose: () => void }) {
  const [title, setTitle] = useState(article?.title ?? "");
  const [content, setContent] = useState(article?.excerpt ?? "");
  const [category, setCategory] = useState(article?.category ?? MOCK_CATEGORIES[0]!.name);
  const [published, setPublished] = useState(article?.published ?? false);
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
      <div className="my-8 w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">{article ? "Editar artículo" : "Nuevo artículo"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={save} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Cómo configurar tu primera campaña"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Categoría</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
              {MOCK_CATEGORIES.map(c => <option key={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Contenido * (Markdown soportado)</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={12}
              placeholder="# Título&#10;&#10;Escribe tu artículo aquí..."
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground font-mono focus:border-primary focus:outline-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} className="accent-primary" />
            <span className="text-sm text-foreground">Publicar (visible para clientes)</span>
          </label>
          <div className="flex gap-3 pt-2">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving || !title} className="flex-1">{saving ? "Guardando…" : "Guardar artículo"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SaasKnowledgeBasePage() {
  const [articles] = useState<KBArticle[]>(MOCK_ARTICLES);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<KBArticle | undefined>();
  const [filterCategory, setFilterCategory] = useState("Todas");
  const [search, setSearch] = useState("");

  const filtered = articles.filter(a => {
    if (filterCategory !== "Todas" && a.category !== filterCategory) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalViews = articles.reduce((s, a) => s + a.views, 0);
  const avgHelpful = articles.filter(a => a.helpful + a.notHelpful > 0).reduce((s, a) => s + (a.helpful / (a.helpful + a.notHelpful)) * 100, 0) / articles.filter(a => a.helpful + a.notHelpful > 0).length;

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="herramientas" />}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader title="Base de Conocimiento" subtitle="Centro de ayuda público para tus clientes — reduce tickets y mejora la satisfacción" />
              <div className="flex gap-2">
                <NelvyonDsButton variant="ghost">↗ Ver portal público</NelvyonDsButton>
                <NelvyonDsButton onClick={() => { setEditing(undefined); setShowEditor(true); }}>+ Nuevo artículo</NelvyonDsButton>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Artículos publicados", value: articles.filter(a => a.published).length },
                { label: "Total lecturas", value: totalViews.toLocaleString("es-ES") },
                { label: "% útil", value: `${Math.round(avgHelpful)}%` },
                { label: "Categorías", value: MOCK_CATEGORIES.length },
              ].map(({ label, value }) => (
                <NelvyonDsCard key={label} className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
                </NelvyonDsCard>
              ))}
            </div>

            {/* Categories */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {MOCK_CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setFilterCategory(filterCategory === c.name ? "Todas" : c.name)}
                  className={`rounded-xl border p-3 text-center transition-colors ${filterCategory === c.name ? "border-primary bg-primary/10" : "border-border hover:bg-muted/10"}`}>
                  <p className="text-2xl">{c.icon}</p>
                  <p className="mt-1 text-xs font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.articleCount} art.</p>
                </button>
              ))}
            </div>

            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar artículo…"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" />

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
                          <span className="rounded-md bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground">{a.category}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{a.excerpt}</p>
                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>{a.views.toLocaleString("es-ES")} lecturas</span>
                          {helpfulPct !== null && <span className="text-green-400">👍 {helpfulPct}% útil</span>}
                          <span>Actualizado {new Date(a.updatedAt).toLocaleDateString("es-ES")}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <NelvyonDsButton variant="ghost" className="text-xs" onClick={() => { setEditing(a); setShowEditor(true); }}>✎ Editar</NelvyonDsButton>
                      </div>
                    </div>
                  </NelvyonDsCard>
                );
              })}
            </div>
      {showEditor && <ArticleEditor article={editing} onClose={() => setShowEditor(false)} />}
    </SaasShellLayout>
  );
}
