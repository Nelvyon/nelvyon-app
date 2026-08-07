"use client";

/**
 * /saas/web-builder (listado) sobre `(cms)/content` de W3CRM, con las piezas ya
 * portadas. Mapeo: plantillas y listado -> `W3crmContentBox`; páginas ->
 * `W3crmDataTable`; alta y dominio -> `W3crmModal`; KPIs -> `W3crmKpiTile`.
 * Sin componentes nuevos.
 *
 * CONTRATO — `saas-web-builder-depth.spec.ts` y `saas-nav-full-coverage`:
 *   - el texto "Web Builder" debe estar en el body. Va en `mainTitle`. NINGUNA
 *     caja puede titularse así: el toggle de `W3crmContentBox` emite
 *     `aria-label="Plegar <título>"` y el sidebar ya expone "🌐 Web Builder",
 *     de modo que un `getByRole`/`getByText` futuro vería varios.
 *   - el body nunca debe contener "Something went wrong": de ahí que todo dato
 *     de la API pase por un guarda antes de tocar `.map`, `.reduce`,
 *     `.toLocaleString` o `new Date`.
 *
 * SANEADO — `nviews()` de f89c198c se conserva INTACTO y se sigue usando para
 * el total. Para el dato por página se usa `opt()`, que distingue "sin dato"
 * (se pinta "—") de un cero real: sumar nulos como 0 es correcto, pero
 * mostrarlos como "0 visitas" sería inventar un dato. Además `pages` y
 * `templates` se validan como array antes de recorrerlos, y las fechas pasan
 * por `fecha()` para no imprimir "Invalid Date".
 *
 * Lógica de NELVYON intacta: `GET /api/saas/web-builder`,
 * `GET /api/saas/web-builder/templates`, `POST /api/saas/web-builder` para el
 * alta y para las acciones `update` (dominio), `publish` y `render` —que
 * devuelve HTML y se abre en una pestaña con un blob—, y
 * `DELETE /api/saas/web-builder/{id}`. Se respeta que estas llamadas NO llevan
 * `credentials` (a diferencia del editor); no se "corrige" nada de eso.
 * `FeaturedEnvatoTemplateCard` se reutiliza tal cual porque lo comparte
 * `/saas/setup`, que todavía no está migrado.
 *
 * Único cambio de comportamiento: el `window.confirm()` del borrado pasa al
 * diálogo de sweetalert2 que ya usa el resto del SaaS migrado.
 */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Alert from "sweetalert2";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import {
  W3crmCargando,
  W3crmContentBox,
  W3crmDataTable,
  W3crmModal,
} from "@/features/saas-w3crm/components/W3crmContentBox";
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

/** Un tipo fuera de catálogo dejaba la fila sin icono ni etiqueta. */
function tipoCfg(type: unknown) {
  return PAGE_TYPES.find((t) => t.type === type) ?? {
    type: "custom" as WebPage["type"], label: String(type ?? "—"), icon: "📄", desc: "",
  };
}

/**
 * f89c198c — SIN CAMBIOS. La API podía devolver texto o ausencia y
 * `.toLocaleString()` sobre eso tumbaba la página al hidratar.
 */
function nviews(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** `null` = sin dato. Se pinta "—", nunca 0: sumar nulos sí, mostrarlos no. */
function opt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
function miles(v: unknown): string {
  const n = opt(v);
  return n === null ? "—" : n.toLocaleString("es-ES");
}
function txt(v: unknown): string { return typeof v === "string" ? v : ""; }
/** Una fecha corrupta imprimía "Invalid Date" en la tarjeta. */
function fecha(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("es-ES");
}

function estadoBadge(s: unknown): string {
  return s === "published" ? "badge-success" : s === "archived" ? "badge-secondary" : "badge-primary";
}
function estadoLabel(s: unknown): string {
  return s === "published" ? "Publicado" : s === "archived" ? "Archivado" : "Borrador";
}

// ── Nueva página ─────────────────────────────────────────────────────────────
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
    <W3crmModal titulo="Nueva página web" onClose={onClose} error={error}>
      <form onSubmit={(e) => void save(e)}>
        <div className="form-group mb-3">
          <label htmlFor="wb-titulo" className="text-black font-w600">
            Título <span className="required">*</span>
          </label>
          <input id="wb-titulo" className="form-control" autoFocus
            placeholder="Servicios de Marketing Digital con IA"
            value={title} onChange={(e) => handleTitle(e.target.value)} />
        </div>
        <div className="form-group mb-3">
          <label htmlFor="wb-slug" className="text-black font-w600">Slug (URL)</label>
          <div className="input-group">
            <span className="input-group-text">/</span>
            <input id="wb-slug" className="form-control" placeholder="servicios-marketing-ia"
              value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
        </div>
        <div className="form-group mb-3">
          <label htmlFor="wb-dominio" className="text-black font-w600">Dominio personalizado (opcional)</label>
          <input id="wb-dominio" className="form-control" placeholder="landing.miempresa.com"
            value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} />
        </div>
        <div className="form-group mb-3">
          <span className="text-black font-w600 d-block mb-2">Tipo de página</span>
          <div className="row" role="group" aria-label="Tipo de página">
            {PAGE_TYPES.map((pt) => (
              <div className="col-4 mb-2" key={pt.type}>
                {/*
                  Ancho explícito, no `w-100`: `W3crmModal` monta en un portal
                  fuera de `.w3crm-scope`, y ahí Tailwind v4 interpreta `w-100`
                  como escala de espaciado (0.25rem × 100 = 400px) en vez de la
                  utilidad de Bootstrap. Medido: 400px dentro de un padre de 390.
                */}
                <button type="button" aria-pressed={type === pt.type}
                  style={{ width: "100%" }}
                  className={`btn btn-sm text-start ${type === pt.type ? "btn-primary" : "btn-primary light"}`}
                  onClick={() => setType(pt.type)}>
                  <span className="d-block fs-18">{pt.icon}</span>
                  <span className="d-block fw-bold fs-12">{pt.label}</span>
                  <span className="d-block fs-12 opacity-75">{pt.desc}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="text-end">
          <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Creando…" : "Crear página"}
          </button>
        </div>
      </form>
    </W3crmModal>
  );
}

// ── Dominio personalizado ────────────────────────────────────────────────────
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
    <W3crmModal titulo="Dominio personalizado" onClose={onClose} error={error} size="sm">
      <p className="fs-14 text-muted">
        Apunta tu dominio con un CNAME a <code className="text-primary">pages.nelvyon.com</code>
      </p>
      <form onSubmit={(e) => void save(e)}>
        <div className="form-group mb-3">
          <label htmlFor="wb-dominio-custom" className="text-black font-w600">Dominio</label>
          <input id="wb-dominio-custom" className="form-control" placeholder="landing.miempresa.com"
            value={domain} onChange={(e) => setDomain(e.target.value)} />
        </div>
        <div className="text-end">
          <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </W3crmModal>
  );
}

// ── Listado ──────────────────────────────────────────────────────────────────
export default function SaasWebBuilderPage() {
  const [pages, setPages] = useState<WebPage[]>([]);
  const [templates, setTemplates] = useState<FeaturedTemplateMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [domainPage, setDomainPage] = useState<WebPage | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pagesRes, tplRes] = await Promise.all([
        fetch("/api/saas/web-builder"),
        fetch("/api/saas/web-builder/templates"),
      ]);
      const data = (await pagesRes.json().catch(() => ({ pages: [] }))) as { pages: WebPage[] };
      // `pages` podía no ser array y reventaba `.map`/`.filter`/`.reduce`.
      setPages(Array.isArray(data.pages) ? data.pages : []);
      if (tplRes.ok) {
        const tpl = (await tplRes.json()) as { templates: FeaturedTemplateMeta[] };
        setTemplates(Array.isArray(tpl.templates) ? tpl.templates : []);
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

  async function deletePage(p: WebPage) {
    const r = await Alert.fire({
      title: `¿Eliminar la página "${txt(p.title)}"?`,
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!r.isConfirmed) return;
    setDeletingId(p.id);
    try {
      const res = await fetch(`/api/saas/web-builder/${p.id}`, { method: "DELETE" });
      if (res.ok) setPages(prev => prev.filter(x => x.id !== p.id));
    } finally {
      setDeletingId(null);
    }
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

  const totalVisitas = pages.reduce((s, p) => s + nviews(p.views), 0);

  return (
    <SaasW3crmShell>
      {/* "Web Builder" vive aquí y solo aquí dentro del contenido. */}
      <W3crmPageTitle mainTitle="Web Builder" parentTitle="Captación" pageTitle="Páginas" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile icon="🌐" label="Páginas" value={pages.length} /></div>
          <div className="col-xl-3 col-sm-6">
            <W3crmKpiTile icon="🚀" label="Publicadas" value={pages.filter(p => p.status === "published").length} accent />
          </div>
          <div className="col-xl-3 col-sm-6">
            <W3crmKpiTile icon="📝" label="Borradores" value={pages.filter(p => p.status === "draft").length} />
          </div>
          <div className="col-xl-3 col-sm-6">
            <W3crmKpiTile icon="👀" label="Visitas totales" value={totalVisitas.toLocaleString("es-ES")} />
          </div>

          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              Crea y publica páginas web sin código, directamente desde Nelvyon
            </p>

            {templates.length > 0 && (
              <W3crmContentBox titulo={`Plantillas destacadas (${templates.length})`} icono="fa-solid fa-star">
                <div className="row">
                  {templates.map((tpl) => (
                    <div className="col-xl-6" key={tpl.id}>
                      {/* Compartido con /saas/setup, sin migrar: no se toca. */}
                      <FeaturedEnvatoTemplateCard template={tpl} onImported={load} />
                    </div>
                  ))}
                </div>
              </W3crmContentBox>
            )}

            <W3crmContentBox
              titulo="Páginas web"
              icono="fa-solid fa-window-maximize"
              acciones={
                <button type="button" className="btn btn-primary btn-sm me-2" onClick={() => setShowNew(true)}>
                  + Nueva página
                </button>
              }
            >
              {loading ? (
                <W3crmCargando texto="Cargando páginas…" />
              ) : pages.length === 0 ? (
                <>
                  <W3crmEmptyState
                    title="Sin páginas propias aún"
                    description="Importa la plantilla premium oficial arriba o crea una página desde cero"
                  />
                  <div className="text-center">
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>
                      + Crear página en blanco
                    </button>
                  </div>
                </>
              ) : (
                <W3crmDataTable
                  filas={pages}
                  etiqueta="páginas"
                  wrapperId="wb_paginas_wrapper"
                  porPagina={10}
                  columnas={[
                    { titulo: "Página" }, { titulo: "Tipo" }, { titulo: "Visitas" },
                    { titulo: "Estado" }, { titulo: "Gestión", alFinal: true },
                  ]}
                  render={(p) => {
                    const cfg = tipoCfg(p.type);
                    const publicada = fecha(p.publishedAt);
                    return (
                      <tr key={p.id}>
                        <td>
                          <span className="me-2" aria-hidden="true">{cfg.icon}</span>
                          <span className="fw-bold">{txt(p.title) || "—"}</span>
                          <span className="d-block text-muted fs-12">/{txt(p.slug)}</span>
                          {p.customDomain ? (
                            <span className="d-block text-primary fs-12">{txt(p.customDomain)}</span>
                          ) : null}
                        </td>
                        <td className="text-muted fs-12">{cfg.label}</td>
                        <td className="text-muted fs-12">
                          <div>{miles(p.views)} visitas</div>
                          {publicada ? <div>publicado {publicada}</div> : null}
                        </td>
                        <td><span className={`badge ${estadoBadge(p.status)}`}>{estadoLabel(p.status)}</span></td>
                        <td className="text-end" style={{ minWidth: 240 }}>
                          <Link href={`/saas/web-builder/${p.id}`} className="btn btn-primary light btn-sm me-1">
                            ✏️ Editar
                          </Link>
                          <button type="button" className="btn btn-primary light btn-sm me-1"
                            onClick={() => void previewHtml(p.id)}>👁 Preview</button>
                          {p.status === "draft" && (
                            <button type="button" className="btn btn-primary light btn-sm me-1"
                              disabled={publishing === p.id} onClick={() => void publishPage(p.id)}>
                              {publishing === p.id ? "Publicando…" : "🚀 Publicar"}
                            </button>
                          )}
                          <button type="button" className="btn btn-primary light btn-sm me-1"
                            onClick={() => setDomainPage(p)}>🌐 Dominio</button>
                          <button type="button" className="btn btn-danger light btn-sm"
                            disabled={deletingId === p.id}
                            aria-label={`Eliminar página ${p.title}`}
                            onClick={() => void deletePage(p)}>
                            {deletingId === p.id ? "…" : "🗑"}
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

      {showNew && <NewPageModal onClose={() => setShowNew(false)} onSaved={load} />}
      {domainPage && <DomainModal page={domainPage} onClose={() => setDomainPage(null)} onSaved={load} />}
    </SaasW3crmShell>
  );
}
