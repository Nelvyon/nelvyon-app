"use client";

/**
 * /saas/web-builder/[pageId] (editor) sobre W3CRM, con las piezas ya portadas.
 * Mapeo: los tres paneles del editor -> `W3crmContentBox` dentro de una fila
 * Bootstrap (`col-xl-3` / `col-xl-6` / `col-xl-3`), que apila en tablet y móvil
 * donde antes había tres columnas de ancho fijo; dominio, SEO e historial ->
 * `W3crmModal`. Sin componentes nuevos.
 *
 * Se migra a la vez que el listado a propósito: son el mismo producto y dejar
 * uno con W3CRM y el otro con la interfaz antigua partiría el módulo.
 *
 * CONTRATO — `saas-web-builder-depth.spec.ts`:
 *   - el body debe contener el título de la página (`E2E Test Page`): va en
 *     `mainTitle` y sin truncar.
 *   - el body nunca debe contener "Something went wrong": por eso ningún dato
 *     de la API llega crudo a `.map`, `.length`, `new Date` ni a un índice.
 *   - "Web Builder" del breadcrumb no colisiona con nada: los specs de este
 *     módulo comparan `body.textContent`, no usan locators estrictos.
 *
 * SANEADO: `sections` se valida como array antes de recorrerlo o indexarlo;
 * `content` puede llegar nulo y se normaliza a objeto antes de leer campos; un
 * tipo de sección fuera de catálogo ya no deja la fila sin icono ni etiqueta;
 * las fechas pasan por un guarda para no imprimir "Invalid Date"; y ninguna
 * respuesta se aplica al estado sin comprobar antes que trae una página.
 *
 * Lógica de NELVYON intacta: `GET`/`PATCH /api/saas/web-builder/{pageId}`
 * (secciones y SEO) y `POST /api/saas/web-builder` con TODAS sus acciones
 * —`save-version`, `publish`, `unpublish`, `add-section`, `delete-section`,
 * `duplicate-section`, `reorder-sections`, `list-versions`, `restore-version`,
 * `update` y `verify-domain`—, el `credentials: "same-origin"` de cada llamada,
 * el redirect a la lista cuando la página no existe, la vista previa en iframe
 * con su HTML construido en cliente, el copiado de la URL de CDN y los avisos
 * de 2 s.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState } from "@/features/saas-w3crm/components/W3crmUi";
import {
  W3crmCargando,
  W3crmContentBox,
  W3crmModal,
} from "@/features/saas-w3crm/components/W3crmContentBox";

// ── Types ──────────────────────────────────────────────────────────────────

type SectionType = "hero" | "text" | "features" | "cta" | "contact" | "image" | "video";
type WebPageStatus = "draft" | "published" | "archived";
type DomainStatus = "none" | "pending" | "verified" | "failed";
type SslStatus = "pending" | "active" | "failed";

interface PageSection {
  id: string;
  type: SectionType;
  content: Record<string, unknown>;
}
interface WebPage {
  id: string; title: string; slug: string; type: string; status: WebPageStatus;
  sections: PageSection[]; seoTitle: string | null; seoDescription: string | null;
  publishedHtml: string | null; cdnUrl: string | null;
  views: number; publishedAt: string | null; customDomain: string | null;
  domainStatus: DomainStatus; sslStatus: SslStatus;
}
interface WebPageVersion {
  id: string; version: number; sections: PageSection[]; createdAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const SECTION_TYPES: { type: SectionType; label: string; icon: string }[] = [
  { type: "hero", label: "Hero", icon: "🏠" },
  { type: "text", label: "Texto", icon: "📝" },
  { type: "features", label: "Features", icon: "⚡" },
  { type: "cta", label: "CTA", icon: "🎯" },
  { type: "contact", label: "Contacto", icon: "📞" },
  { type: "image", label: "Imagen", icon: "🖼️" },
  { type: "video", label: "Video", icon: "🎥" },
];

/** El `!` de `SECTION_TYPES.find(...)!` dejaba sin icono los tipos desconocidos. */
function secCfg(type: unknown) {
  return SECTION_TYPES.find((t) => t.type === type) ?? {
    type: "text" as SectionType, label: String(type ?? "—"), icon: "📄",
  };
}
/** `sections` podía no ser array y reventaba `.map`, `.length` y el índice 0. */
function secciones(p: WebPage | null): PageSection[] {
  return p && Array.isArray(p.sections) ? p.sections : [];
}
/** `content` podía llegar nulo y `c[key]` lanzaba antes de pintar nada. */
function contenido(s: PageSection | null): Record<string, unknown> {
  return s && s.content && typeof s.content === "object" ? s.content : {};
}
/** Ninguna respuesta se aplica al estado sin traer página. */
function pagOk(d: unknown): WebPage | null {
  const p = (d as { page?: WebPage } | null)?.page;
  return p && typeof p === "object" && typeof p.id === "string" ? p : null;
}
function txt(v: unknown): string { return typeof v === "string" ? v : ""; }
function fechaHora(v: unknown): string {
  if (typeof v !== "string" || !v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es");
}

// ── Section Props Editor ───────────────────────────────────────────────────

function SectionPropsEditor({ section, onChange }: {
  section: PageSection;
  onChange(content: Record<string, unknown>): void;
}) {
  const c = contenido(section);

  function field(key: string, label: string, type: "text" | "textarea" = "text") {
    const val = String(c[key] ?? "");
    const id = `wb-prop-${key}`;
    return (
      <div className="form-group mb-3" key={key}>
        <label htmlFor={id} className="text-black font-w600 fs-12 text-uppercase">{label}</label>
        {type === "textarea" ? (
          <textarea id={id} rows={3} className="form-control" value={val}
            onChange={e => onChange({ ...c, [key]: e.target.value })} />
        ) : (
          <input id={id} type="text" className="form-control" value={val}
            onChange={e => onChange({ ...c, [key]: e.target.value })} />
        )}
      </div>
    );
  }

  switch (section.type) {
    case "hero": return (
      <>
        {field("headline", "Headline")}
        {field("subtitle", "Subtítulo")}
        {field("ctaLabel", "CTA Label")}
        {field("ctaUrl", "CTA URL")}
      </>
    );
    case "text": return (
      <>
        {field("heading", "Encabezado")}
        {field("body", "Cuerpo de texto", "textarea")}
      </>
    );
    case "features": return (
      <>
        {field("heading", "Encabezado")}
        <div className="form-group mb-3">
          <label htmlFor="wb-prop-items" className="text-black font-w600 fs-12 text-uppercase">Items (JSON array)</label>
          <textarea id="wb-prop-items" rows={6} className="form-control font-mono fs-12"
            value={JSON.stringify(c.items ?? [], null, 2)}
            onChange={e => {
              try { onChange({ ...c, items: JSON.parse(e.target.value) as unknown }); } catch { /* ignore */ }
            }} />
          <p className="fs-12 text-muted mt-1 mb-0">Formato: [{"{"}icon,title,desc{"}"}]</p>
        </div>
      </>
    );
    case "cta": return (
      <>
        {field("heading", "Encabezado")}
        {field("body", "Cuerpo", "textarea")}
        {field("ctaLabel", "CTA Label")}
        {field("ctaUrl", "CTA URL")}
      </>
    );
    case "contact": return (
      <>
        {field("heading", "Encabezado")}
        {field("ctaLabel", "Botón label")}
      </>
    );
    case "image": return (
      <>
        {field("src", "URL imagen")}
        {field("alt", "Alt text")}
        {field("caption", "Caption")}
      </>
    );
    case "video": return field("src", "URL video");
    default: return <p className="fs-12 text-muted mb-0">Sin props configurables.</p>;
  }
}

// ── Domain Modal ───────────────────────────────────────────────────────────

function DomainModal({ page, pageId, onClose, onUpdated }: {
  page: WebPage; pageId: string; onClose(): void; onUpdated(p: WebPage): void;
}) {
  const [domain, setDomain] = useState(page.customDomain ?? "");
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; domainStatus: string; error?: string } | null>(null);

  async function saveDomain() {
    setSaving(true);
    try {
      const res = await fetch("/api/saas/web-builder", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", id: pageId, custom_domain: domain.trim() || null }),
      });
      const p = pagOk(await res.json().catch(() => null));
      if (p) onUpdated(p);
    } finally { setSaving(false); }
  }

  async function verifyDns() {
    setVerifying(true); setStatus(null);
    try {
      const res = await fetch("/api/saas/web-builder", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify-domain", id: pageId }),
      });
      const data = (await res.json().catch(() => null)) as { ok: boolean; domainStatus: string; error?: string } | null;
      setStatus(data);
      if (data?.ok) {
        // Refresh page data
        const r2 = await fetch(`/api/saas/web-builder/${pageId}`, { credentials: "same-origin" });
        const p2 = pagOk(await r2.json().catch(() => null));
        if (p2) onUpdated(p2);
      }
    } finally { setVerifying(false); }
  }

  const domainTono = page.domainStatus === "verified" ? "text-success"
    : page.domainStatus === "failed" ? "text-danger"
    : page.domainStatus === "pending" ? "text-warning" : "text-muted";

  return (
    <W3crmModal titulo="Dominio personalizado" onClose={onClose} size="sm">
      <div className="form-group mb-3">
        <label htmlFor="wb-ed-dominio" className="text-black font-w600">Dominio custom</label>
        <input id="wb-ed-dominio" className="form-control" placeholder="miweb.com"
          value={domain} onChange={e => setDomain(e.target.value)} />
      </div>
      <div className="d-flex flex-wrap gap-2 mb-3">
        <button type="button" className="btn btn-primary light btn-sm" disabled={saving}
          onClick={() => void saveDomain()}>
          {saving ? "Guardando…" : "Guardar dominio"}
        </button>
        {page.customDomain && (
          <button type="button" className="btn btn-primary btn-sm" disabled={verifying}
            onClick={() => void verifyDns()}>
            {verifying ? "Verificando…" : "Verificar DNS"}
          </button>
        )}
      </div>
      {status && (
        <div className={`alert py-2 fs-14 ${status.ok ? "alert-success" : "alert-danger"}`} role="status">
          {status.ok ? "✓ DNS verificado — SSL activo" : `✗ ${status.error ?? "Verificación fallida"}`}
        </div>
      )}
      <div className="card border mb-0">
        <div className="card-body py-3">
          <p className="fw-bold fs-12 mb-1">Instrucciones DNS</p>
          <p className="text-muted fs-12 mb-1">Añade un registro CNAME en tu DNS:</p>
          <p className="text-muted fs-12 font-mono mb-2">CNAME → pages.nelvyon.com</p>
          <span className="text-muted fs-12 me-2">Estado:</span>
          <span className={`fw-bold fs-12 ${domainTono}`}>{txt(page.domainStatus) || "—"}</span>
          {page.sslStatus === "active" && <span className="text-success fs-12 ms-2">🔒 SSL activo</span>}
        </div>
      </div>
    </W3crmModal>
  );
}

// ── SEO Modal ──────────────────────────────────────────────────────────────

function SeoModal({ page, pageId, onClose, onUpdated }: {
  page: WebPage; pageId: string; onClose(): void; onUpdated(p: WebPage): void;
}) {
  const [form, setForm] = useState({ seoTitle: page.seoTitle ?? "", seoDescription: page.seoDescription ?? "" });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/saas/web-builder/${pageId}`, {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seo_title: form.seoTitle || null, seo_description: form.seoDescription || null }),
      });
      const p = pagOk(await res.json().catch(() => null));
      if (p) onUpdated(p);
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <W3crmModal titulo="SEO" onClose={onClose} size="sm">
      <div className="form-group mb-3">
        <label htmlFor="wb-seo-titulo" className="text-black font-w600 fs-12 text-uppercase">SEO Title</label>
        <input id="wb-seo-titulo" className="form-control" placeholder={txt(page.title)}
          value={form.seoTitle} onChange={e => setForm(f => ({ ...f, seoTitle: e.target.value }))} />
        <p className="fs-12 text-muted mt-1 mb-0">{form.seoTitle.length}/60 chars</p>
      </div>
      <div className="form-group mb-3">
        <label htmlFor="wb-seo-desc" className="text-black font-w600 fs-12 text-uppercase">Meta description</label>
        <textarea id="wb-seo-desc" rows={3} className="form-control" placeholder="Descripción para buscadores…"
          value={form.seoDescription} onChange={e => setForm(f => ({ ...f, seoDescription: e.target.value }))} />
        <p className="fs-12 text-muted mt-1 mb-0">{form.seoDescription.length}/160 chars</p>
      </div>
      <div className="text-end">
        <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
          {saving ? "Guardando…" : "Guardar SEO"}
        </button>
      </div>
    </W3crmModal>
  );
}

// ── History Modal ──────────────────────────────────────────────────────────

function HistoryModal({ pageId, onClose, onRestored }: {
  pageId: string; onClose(): void; onRestored(p: WebPage): void;
}) {
  const [versions, setVersions] = useState<WebPageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/saas/web-builder", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list-versions", id: pageId }),
    }).then(r => r.json() as Promise<{ versions: WebPageVersion[] }>)
      .then(d => setVersions(Array.isArray(d?.versions) ? d.versions : []))
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [pageId]);

  async function restore(versionId: string) {
    setRestoring(versionId);
    try {
      const res = await fetch("/api/saas/web-builder", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore-version", id: pageId, version_id: versionId }),
      });
      const p = pagOk(await res.json().catch(() => null));
      if (p) onRestored(p);
      onClose();
    } finally { setRestoring(null); }
  }

  return (
    <W3crmModal titulo="Historial de versiones" onClose={onClose} size="sm">
      {loading ? (
        <W3crmCargando texto="Cargando versiones…" />
      ) : versions.length === 0 ? (
        <W3crmEmptyState title="Sin versiones guardadas." />
      ) : (
        <ul className="list-group list-group-flush" style={{ maxHeight: 320, overflowY: "auto" }}>
          {versions.map(v => (
            <li key={v.id} className="list-group-item d-flex align-items-center justify-content-between px-0">
              <div>
                <p className="fw-bold mb-0">v{txt(String(v.version)) || "—"}</p>
                <span className="d-block text-muted fs-12">{fechaHora(v.createdAt)}</span>
                <span className="d-block text-muted fs-12">
                  {Array.isArray(v.sections) ? v.sections.length : 0} secciones
                </span>
              </div>
              <button type="button" className="btn btn-primary light btn-sm"
                disabled={restoring === v.id} onClick={() => void restore(v.id)}>
                {restoring === v.id ? "…" : "Restaurar"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </W3crmModal>
  );
}

// ── Main Editor ────────────────────────────────────────────────────────────

export default function WebBuilderEditorPage() {
  const params = useParams<{ pageId: string }>();
  const pageId = params?.pageId ?? "";
  const router = useRouter();

  const [page, setPage] = useState<WebPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<PageSection | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [copyOk, setCopyOk] = useState(false);
  const [showDomain, setShowDomain] = useState(false);
  const [showSeo, setShowSeo] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/saas/web-builder/${pageId}`, { credentials: "same-origin" });
      if (!res.ok) { router.push("/saas/web-builder"); return; }
      const p = pagOk(await res.json().catch(() => null));
      setPage(p);
      setSelectedSection(secciones(p)[0] ?? null);
    } finally { setLoading(false); }
  }, [pageId, router]);

  useEffect(() => { void load(); }, [load]);

  // Live preview update
  useEffect(() => {
    if (!page || !iframeRef.current) return;
    const iframe = iframeRef.current;
    const html = buildPreviewHtml(page);
    setPreviewHtml(html);
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (doc) { doc.open(); doc.write(html); doc.close(); }
  }, [page]);

  async function savePageSections() {
    if (!page) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/saas/web-builder/${pageId}`, {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: page.sections }),
      });
      const p = pagOk(await res.json().catch(() => null));
      if (p) setPage(p);
      setSavedAt(new Date());
    } finally { setSaving(false); }
  }

  async function saveSectionAndSnapshot() {
    if (!page) return;
    await savePageSections();
    // Save version snapshot
    await fetch("/api/saas/web-builder", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save-version", id: pageId }),
    });
  }

  async function publishPage() {
    if (!page) return;
    // Save first
    await savePageSections();
    setPublishing(true);
    try {
      const res = await fetch("/api/saas/web-builder", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", id: pageId }),
      });
      const p = pagOk(await res.json().catch(() => null));
      if (p) setPage(p);
    } finally { setPublishing(false); }
  }

  async function unpublishPage() {
    const res = await fetch("/api/saas/web-builder", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unpublish", id: pageId }),
    });
    const p = pagOk(await res.json().catch(() => null));
    if (p) setPage(p);
  }

  async function addSection(type: SectionType) {
    const res = await fetch("/api/saas/web-builder", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-section", id: pageId, section_type: type }),
    });
    const p = pagOk(await res.json().catch(() => null));
    if (!p) return;
    setPage(p);
    const lista = secciones(p);
    const newSection = lista[lista.length - 1];
    if (newSection) setSelectedSection(newSection);
  }

  async function deleteSection(sectionId: string) {
    const res = await fetch("/api/saas/web-builder", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-section", id: pageId, section_id: sectionId }),
    });
    const p = pagOk(await res.json().catch(() => null));
    if (!p) return;
    setPage(p);
    if (selectedSection?.id === sectionId) setSelectedSection(secciones(p)[0] ?? null);
  }

  async function duplicateSection(sectionId: string) {
    const res = await fetch("/api/saas/web-builder", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate-section", id: pageId, section_id: sectionId }),
    });
    const p = pagOk(await res.json().catch(() => null));
    if (p) setPage(p);
  }

  async function moveSection(sectionId: string, dir: "up" | "down") {
    if (!page) return;
    const lista = secciones(page);
    const idx = lista.findIndex(s => s.id === sectionId);
    if (idx === -1) return;
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= lista.length) return;
    const newOrder = [...lista];
    const tmp = newOrder[idx]!; newOrder[idx] = newOrder[targetIdx]!; newOrder[targetIdx] = tmp;
    const orderedIds = newOrder.map(s => s.id);
    const res = await fetch("/api/saas/web-builder", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorder-sections", id: pageId, ordered_ids: orderedIds }),
    });
    const p = pagOk(await res.json().catch(() => null));
    if (p) setPage(p);
  }

  function updateSelectedSectionContent(content: Record<string, unknown>) {
    if (!page || !selectedSection) return;
    const updatedSections = secciones(page).map(s =>
      s.id === selectedSection.id ? { ...s, content } : s,
    );
    const updatedSection = { ...selectedSection, content };
    setSelectedSection(updatedSection);
    setPage(p => p ? { ...p, sections: updatedSections } : p);
  }

  function copyCdnUrl() {
    if (!page?.cdnUrl) return;
    // `clipboard` puede no existir sin permiso.
    void navigator.clipboard?.writeText(page.cdnUrl).then(() => {
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 2000);
    });
  }

  if (loading) {
    return (
      <SaasW3crmShell>
        <W3crmPageTitle mainTitle="Editor" parentTitle="Web Builder" pageTitle="Cargando" />
        <div className="container-fluid">
          <W3crmCargando texto="Cargando editor…" />
        </div>
      </SaasW3crmShell>
    );
  }

  if (!page) {
    return (
      <SaasW3crmShell>
        <W3crmPageTitle mainTitle="Editor" parentTitle="Web Builder" pageTitle="Sin página" />
        <div className="container-fluid">
          <W3crmContentBox titulo="Editor de página" icono="fa-solid fa-window-maximize">
            <W3crmEmptyState
              title="No se ha podido cargar la página"
              description="Vuelve al listado y ábrela de nuevo."
            />
            <div className="text-center">
              <button type="button" className="btn btn-primary btn-sm"
                onClick={() => router.push("/saas/web-builder")}>← Web Builder</button>
            </div>
          </W3crmContentBox>
        </div>
      </SaasW3crmShell>
    );
  }

  const isPublished = page.status === "published";
  const lista = secciones(page);

  return (
    <SaasW3crmShell>
      {/* El título de la página, sin truncar: es texto-contrato. */}
      <W3crmPageTitle mainTitle={txt(page.title) || "Editor"} parentTitle="Web Builder" pageTitle="Editor" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-12">
            {/* Toolbar */}
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              <button type="button" className="btn btn-primary light btn-sm"
                onClick={() => router.push("/saas/web-builder")}>← Web Builder</button>
              <span className={`badge ${isPublished ? "badge-success" : "badge-secondary"}`}>
                {isPublished ? "Publicado" : "Borrador"}
              </span>
              <span className="ms-auto d-flex flex-wrap align-items-center gap-1">
                <button type="button" className="btn btn-primary light btn-sm" onClick={() => setShowSeo(true)}>SEO</button>
                <button type="button" className="btn btn-primary light btn-sm" onClick={() => setShowHistory(true)}>Historial</button>
                <button type="button" className="btn btn-primary light btn-sm" onClick={() => setShowDomain(true)}>Dominio</button>
                <button type="button" className="btn btn-primary light btn-sm" disabled={saving}
                  onClick={() => void saveSectionAndSnapshot()}>
                  {saving ? "Guardando…" : "Guardar"}
                </button>
                {savedAt && <span className="text-success fs-12 ms-1">✓ {savedAt.toLocaleTimeString("es")}</span>}
                {isPublished ? (
                  <>
                    <button type="button" className="btn btn-primary light btn-sm" onClick={() => void unpublishPage()}>Pausar</button>
                    <button type="button" className="btn btn-primary light btn-sm" onClick={copyCdnUrl}>
                      {copyOk ? "✓ Copiado" : "Copiar URL"}
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn btn-primary btn-sm" disabled={publishing}
                    onClick={() => void publishPage()}>
                    {publishing ? "Publicando…" : "Publicar"}
                  </button>
                )}
              </span>
            </div>

            {page.cdnUrl && isPublished && (
              <div className="alert alert-primary py-2" role="note">
                <span className="fs-12 me-1">URL pública:</span>
                <a href={page.cdnUrl} target="_blank" rel="noopener noreferrer" className="fs-12 text-break">
                  {page.cdnUrl}
                </a>
              </div>
            )}
          </div>

          {/* Izquierda: secciones */}
          <div className="col-xl-3 col-lg-4">
            <W3crmContentBox titulo={`Secciones (${lista.length})`} icono="fa-solid fa-layer-group">
              {lista.length === 0 ? (
                <W3crmEmptyState title="Sin secciones" description="Añade la primera desde la lista de abajo." />
              ) : (
                <ul className="list-group list-group-flush mb-3">
                  {lista.map((s, i) => {
                    const cfg = secCfg(s.type);
                    const isSelected = selectedSection?.id === s.id;
                    return (
                      <li key={s.id}
                        className={`list-group-item d-flex align-items-center gap-1 px-0 ${isSelected ? "bg-light" : ""}`}>
                        <button type="button"
                          className="btn btn-link p-0 text-start text-decoration-none flex-grow-1"
                          aria-pressed={isSelected}
                          onClick={() => setSelectedSection(s)}>
                          <span className="me-2" aria-hidden="true">{cfg.icon}</span>
                          <span className="fw-bold fs-12">{i + 1}. {cfg.label}</span>
                        </button>
                        <button type="button" className="btn btn-primary light btn-sm" disabled={i === 0}
                          aria-label={`Subir ${cfg.label}`} onClick={() => void moveSection(s.id, "up")}>↑</button>
                        <button type="button" className="btn btn-primary light btn-sm" disabled={i === lista.length - 1}
                          aria-label={`Bajar ${cfg.label}`} onClick={() => void moveSection(s.id, "down")}>↓</button>
                        <button type="button" className="btn btn-primary light btn-sm"
                          aria-label={`Duplicar ${cfg.label}`} onClick={() => void duplicateSection(s.id)}>⧉</button>
                        <button type="button" className="btn btn-danger light btn-sm"
                          aria-label={`Eliminar ${cfg.label}`} onClick={() => void deleteSection(s.id)}>✕</button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="fs-12 text-muted mb-1">Añadir sección</p>
              <div className="d-flex flex-wrap gap-1">
                {SECTION_TYPES.map(t => (
                  <button key={t.type} type="button" className="btn btn-primary light btn-sm"
                    onClick={() => void addSection(t.type)}>
                    <span aria-hidden="true">{t.icon}</span> {t.label}
                  </button>
                ))}
              </div>
            </W3crmContentBox>
          </div>

          {/* Centro: vista previa en vivo */}
          <div className="col-xl-6 col-lg-8">
            <W3crmContentBox titulo="Vista previa" icono="fa-solid fa-eye" bodyClassName="card-body p-0">
              <div className="position-relative" style={{ height: "60vh", minHeight: 360 }}>
                <iframe
                  ref={iframeRef}
                  title="Preview"
                  className="w-100 h-100 border-0"
                  sandbox="allow-same-origin"
                />
                {!previewHtml && (
                  <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center">
                    <p className="text-muted fs-14 mb-0">Sin secciones — añade una en el panel izquierdo</p>
                  </div>
                )}
              </div>
            </W3crmContentBox>
          </div>

          {/* Derecha: propiedades */}
          <div className="col-xl-3 col-lg-12">
            <W3crmContentBox
              titulo={selectedSection ? `Propiedades · ${secCfg(selectedSection.type).label}` : "Propiedades"}
              icono="fa-solid fa-sliders"
            >
              {selectedSection ? (
                <>
                  <SectionPropsEditor
                    section={selectedSection}
                    onChange={updateSelectedSectionContent}
                  />
                  <div className="text-end pt-2 border-top">
                    <button type="button" className="btn btn-primary btn-sm" disabled={saving}
                      onClick={() => void savePageSections()}>
                      {saving ? "Guardando…" : "Aplicar cambios"}
                    </button>
                  </div>
                </>
              ) : (
                <W3crmEmptyState title="Selecciona una sección para editar sus propiedades." />
              )}
            </W3crmContentBox>
          </div>
        </div>
      </div>

      {showDomain && (
        <DomainModal page={page} pageId={pageId} onClose={() => setShowDomain(false)}
          onUpdated={p => { setPage(p); setShowDomain(false); }} />
      )}
      {showSeo && (
        <SeoModal page={page} pageId={pageId} onClose={() => setShowSeo(false)}
          onUpdated={p => { setPage(p); setShowSeo(false); }} />
      )}
      {showHistory && (
        <HistoryModal pageId={pageId} onClose={() => setShowHistory(false)}
          onRestored={p => { setPage(p); setSelectedSection(secciones(p)[0] ?? null); }} />
      )}
    </SaasW3crmShell>
  );
}

// ── Preview HTML builder (client-side, mirrors server renderHtml) ───────────

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildPreviewHtml(page: WebPage): string {
  const lista = secciones(page);
  if (!lista.length) return "";
  const sectionHtml = lista.map(s => {
    const c = contenido(s);
    switch (s.type) {
      case "hero":
        return `<section style="padding:60px 20px;text-align:center;background:#0a0a0a;color:#fff">
          <h1 style="font-size:2rem;font-weight:700;margin:0 0 14px">${esc(String(c.headline ?? ""))}</h1>
          ${c.subtitle ? `<p style="color:#aaa;margin:0 0 20px">${esc(String(c.subtitle))}</p>` : ""}
          ${c.ctaLabel ? `<a href="${esc(String(c.ctaUrl ?? "#"))}" style="display:inline-block;padding:12px 28px;background:#0084ff;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">${esc(String(c.ctaLabel))}</a>` : ""}
        </section>`;
      case "text":
        return `<section style="max-width:680px;margin:36px auto;padding:0 20px;color:#eee">
          ${c.heading ? `<h2 style="color:#fff;margin:0 0 12px;font-size:1.4rem">${esc(String(c.heading))}</h2>` : ""}
          <p style="color:#ccc;line-height:1.7">${esc(String(c.body ?? ""))}</p>
        </section>`;
      case "features":
        return `<section style="max-width:900px;margin:36px auto;padding:0 20px">
          ${c.heading ? `<h2 style="text-align:center;color:#fff;font-size:1.4rem;margin:0 0 24px">${esc(String(c.heading))}</h2>` : ""}
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px">
            ${Array.isArray(c.items) ? (c.items as Record<string, unknown>[]).map(it => `<div style="background:#111;border:1px solid #222;border-radius:10px;padding:18px">
              <div style="font-size:1.4rem;margin-bottom:8px">${esc(String(it?.icon ?? ""))}</div>
              <p style="color:#fff;font-weight:600;margin:0 0 4px;font-size:0.9rem">${esc(String(it?.title ?? ""))}</p>
              <p style="color:#aaa;font-size:0.8rem;margin:0">${esc(String(it?.desc ?? ""))}</p>
            </div>`).join("") : ""}
          </div>
        </section>`;
      case "cta":
        return `<section style="text-align:center;padding:60px 20px;background:#0a0a1a">
          ${c.heading ? `<h2 style="color:#fff;font-size:1.6rem;margin:0 0 12px">${esc(String(c.heading))}</h2>` : ""}
          ${c.body ? `<p style="color:#aaa;margin:0 0 24px">${esc(String(c.body))}</p>` : ""}
          ${c.ctaLabel ? `<a href="${esc(String(c.ctaUrl ?? "#"))}" style="display:inline-block;padding:13px 32px;background:#0084ff;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">${esc(String(c.ctaLabel))}</a>` : ""}
        </section>`;
      default:
        return `<section style="padding:20px;color:#aaa;text-align:center;font-size:0.875rem">[${esc(String(s.type))}]</section>`;
    }
  }).join("\n");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}</style></head><body>${sectionHtml}</body></html>`;
}
