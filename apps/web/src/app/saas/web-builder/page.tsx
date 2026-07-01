"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import {
  FeaturedEnvatoTemplateCard,
  type FeaturedTemplateMeta,
} from "@/features/saas-web-builder/components/FeaturedEnvatoTemplateCard";

interface WebPage {
  id: string; title: string; slug: string; type: "landing" | "blog" | "product" | "about" | "contact" | "custom";
  status: "draft" | "published" | "archived"; views: number; customDomain: string | null; publishedAt: string | null; updatedAt: string;
}

const PAGE_TYPES = [
  { type: "landing", label: "Landing Page", icon: "🚀", desc: "Página de captación" },
  { type: "blog", label: "Blog Post", icon: "📝", desc: "Artículo de contenido" },
  { type: "product", label: "Producto", icon: "🛍️", desc: "Página de producto" },
  { type: "about", label: "Sobre nosotros", icon: "🏢", desc: "Presentación empresa" },
  { type: "contact", label: "Contacto", icon: "📞", desc: "Página de contacto" },
  { type: "custom", label: "Personalizada", icon: "⚙️", desc: "Diseño libre" },
] as const;

function NewPageModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<WebPage["type"]>("landing");
  const [customDomain, setCustomDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleTitle(v: string) {
    setTitle(v);
    setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("El título es obligatorio"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/saas/web-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug || title.toLowerCase().replace(/\s+/g, "-"),
          type,
          custom_domain: customDomain.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Error al crear página");
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-semibold text-foreground">Nueva página web</h2>
        {error && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Título *</label>
            <input value={title} onChange={e => handleTitle(e.target.value)} placeholder="Servicios de Marketing Digital con IA"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Slug (URL)</label>
            <div className="flex items-center rounded-lg border border-border bg-background">
              <span className="px-3 text-xs text-muted-foreground">/</span>
              <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="servicios-marketing-ia"
                className="flex-1 bg-transparent py-2 pr-3 text-sm text-foreground focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Dominio personalizado (opcional)</label>
            <input value={customDomain} onChange={e => setCustomDomain(e.target.value)} placeholder="landing.miempresa.com"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Tipo de página</label>
            <div className="grid grid-cols-3 gap-2">
              {PAGE_TYPES.map(pt => (
                <button key={pt.type} type="button" onClick={() => setType(pt.type as WebPage["type"])}
                  className={`rounded-xl border p-3 text-left transition-colors ${type === pt.type ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>
                  <p className="text-lg">{pt.icon}</p>
                  <p className="mt-1 text-xs font-medium text-foreground">{pt.label}</p>
                  <p className="text-xs text-muted-foreground">{pt.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Creando…" : "Crear página"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function DomainModal({ page, onClose, onSaved }: { page: WebPage; onClose: () => void; onSaved: () => void }) {
  const [domain, setDomain] = useState(page.customDomain ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/saas/web-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", id: page.id, custom_domain: domain.trim() || null }),
      });
      if (!res.ok) throw new Error("Error al actualizar dominio");
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Dominio personalizado</h2>
        <p className="mb-4 text-sm text-muted-foreground">Apunta tu dominio con un CNAME a <code className="text-primary">pages.nelvyon.com</code></p>
        {error && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={save} className="space-y-4">
          <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="landing.miempresa.com"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          <div className="flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Guardando…" : "Guardar"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SaasWebBuilderPage() {
  const [pages, setPages] = useState<WebPage[]>([]);
  const [templates, setTemplates] = useState<FeaturedTemplateMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [domainPage, setDomainPage] = useState<WebPage | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pagesRes, tplRes] = await Promise.all([
        fetch("/api/saas/web-builder"),
        fetch("/api/saas/web-builder/templates"),
      ]);
      const data = (await pagesRes.json().catch(() => ({ pages: [] }))) as { pages: WebPage[] };
      setPages(data.pages ?? []);
      if (tplRes.ok) {
        const tpl = (await tplRes.json()) as { templates: FeaturedTemplateMeta[] };
        setTemplates(tpl.templates ?? []);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function publishPage(pageId: string) {
    setPublishing(pageId);
    try {
      await fetch("/api/saas/web-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", id: pageId }),
      });
      void load();
    } finally { setPublishing(null); }
  }

  async function previewHtml(pageId: string) {
    const res = await fetch("/api/saas/web-builder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "render", id: pageId }),
    });
    if (res.ok) {
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      window.open(URL.createObjectURL(blob), "_blank");
    }
  }

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="web-builder" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader title="Web Builder" subtitle="Crea y publica páginas web sin código, directamente desde Nelvyon" />
          <NelvyonDsButton onClick={() => setShowNew(true)}>+ Nueva página</NelvyonDsButton>
        </div>

        {templates.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {templates.map((tpl) => (
              <FeaturedEnvatoTemplateCard key={tpl.id} template={tpl} onImported={load} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Páginas", value: pages.length },
            { label: "Publicadas", value: pages.filter(p => p.status === "published").length },
            { label: "Borradores", value: pages.filter(p => p.status === "draft").length },
            { label: "Visitas totales", value: pages.reduce((s, p) => s + p.views, 0).toLocaleString() },
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-xl bg-muted/30" />)}</div>
        ) : pages.length === 0 ? (
          <NelvyonDsCard className="p-16 text-center">
            <p className="text-5xl">🌐</p>
            <p className="mt-4 text-lg font-semibold text-foreground">Sin páginas propias aún</p>
            <p className="mt-2 text-sm text-muted-foreground">Importa la plantilla premium Landrick arriba o crea una página desde cero</p>
            <NelvyonDsButton className="mt-5" onClick={() => setShowNew(true)}>+ Crear página en blanco</NelvyonDsButton>
          </NelvyonDsCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {pages.map(p => {
              const cfg = PAGE_TYPES.find(t => t.type === p.type);
              return (
                <NelvyonDsCard key={p.id} className="flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{cfg?.icon ?? "📄"}</span>
                      <div>
                        <p className="font-semibold text-foreground">{p.title}</p>
                        <p className="text-xs text-muted-foreground">/{p.slug}</p>
                        {p.customDomain && <p className="text-xs text-primary">{p.customDomain}</p>}
                      </div>
                    </div>
                    <NelvyonDsBadge tone={p.status === "published" ? "success" : "primary"}>
                      {p.status === "published" ? "Publicado" : "Borrador"}
                    </NelvyonDsBadge>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.views.toLocaleString()} visitas{p.publishedAt ? ` · publicado ${new Date(p.publishedAt).toLocaleDateString("es-ES")}` : ""}</p>
                  <div className="flex flex-wrap gap-2">
                    <NelvyonDsButton variant="ghost" onClick={() => previewHtml(p.id)} className="text-xs px-2 py-1">👁 Preview</NelvyonDsButton>
                    {p.status === "draft" && (
                      <NelvyonDsButton variant="ghost" onClick={() => publishPage(p.id)} disabled={publishing === p.id} className="text-xs px-2 py-1">
                        {publishing === p.id ? "Publicando…" : "🚀 Publicar"}
                      </NelvyonDsButton>
                    )}
                    <NelvyonDsButton variant="ghost" onClick={() => setDomainPage(p)} className="text-xs px-2 py-1">🌐 Dominio</NelvyonDsButton>
                  </div>
                </NelvyonDsCard>
              );
            })}
          </div>
        )}
      </div>
      {showNew && <NewPageModal onClose={() => setShowNew(false)} onSaved={load} />}
      {domainPage && <DomainModal page={domainPage} onClose={() => setDomainPage(null)} onSaved={load} />}
    </SaasShellLayout>
  );
}
