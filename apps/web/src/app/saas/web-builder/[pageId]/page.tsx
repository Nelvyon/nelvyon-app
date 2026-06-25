"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { NelvyonDsBadge, NelvyonDsButton } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

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

const inputCls = "w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#0084ff]/60";
const labelCls = "block text-[10px] uppercase tracking-wider text-white/30 mb-1";

// ── Section Props Editor ───────────────────────────────────────────────────

function SectionPropsEditor({ section, onChange }: {
  section: PageSection;
  onChange(content: Record<string, unknown>): void;
}) {
  const c = section.content;

  function field(key: string, label: string, type: "text" | "textarea" = "text") {
    const val = String(c[key] ?? "");
    return (
      <div key={key}>
        <label className={labelCls}>{label}</label>
        {type === "textarea" ? (
          <textarea rows={3} className={inputCls + " resize-y"} value={val}
            onChange={e => onChange({ ...c, [key]: e.target.value })} />
        ) : (
          <input type="text" className={inputCls} value={val}
            onChange={e => onChange({ ...c, [key]: e.target.value })} />
        )}
      </div>
    );
  }

  switch (section.type) {
    case "hero": return (
      <div className="space-y-3">
        {field("headline", "Headline")}
        {field("subtitle", "Subtítulo")}
        {field("ctaLabel", "CTA Label")}
        {field("ctaUrl", "CTA URL")}
      </div>
    );
    case "text": return (
      <div className="space-y-3">
        {field("heading", "Encabezado")}
        {field("body", "Cuerpo de texto", "textarea")}
      </div>
    );
    case "features": return (
      <div className="space-y-3">
        {field("heading", "Encabezado")}
        <div>
          <label className={labelCls}>Items (JSON array)</label>
          <textarea rows={6} className={inputCls + " resize-y font-mono text-xs"}
            value={JSON.stringify(c.items ?? [], null, 2)}
            onChange={e => {
              try { onChange({ ...c, items: JSON.parse(e.target.value) as unknown }); } catch { /* ignore */ }
            }} />
          <p className="text-[10px] text-white/20 mt-1">Formato: [{"{"}icon,title,desc{"}"}]</p>
        </div>
      </div>
    );
    case "cta": return (
      <div className="space-y-3">
        {field("heading", "Encabezado")}
        {field("body", "Cuerpo", "textarea")}
        {field("ctaLabel", "CTA Label")}
        {field("ctaUrl", "CTA URL")}
      </div>
    );
    case "contact": return (
      <div className="space-y-3">
        {field("heading", "Encabezado")}
        {field("ctaLabel", "Botón label")}
      </div>
    );
    case "image": return (
      <div className="space-y-3">
        {field("src", "URL imagen")}
        {field("alt", "Alt text")}
        {field("caption", "Caption")}
      </div>
    );
    case "video": return (
      <div className="space-y-3">
        {field("src", "URL video")}
      </div>
    );
    default: return <p className="text-xs text-white/30">Sin props configurables.</p>;
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
      const data = (await res.json()) as { page: WebPage };
      onUpdated(data.page);
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
      const data = (await res.json()) as { ok: boolean; domainStatus: string; error?: string };
      setStatus(data);
      if (data.ok) {
        // Refresh page data
        const r2 = await fetch(`/api/saas/web-builder/${pageId}`, { credentials: "same-origin" });
        const d2 = (await r2.json()) as { page: WebPage };
        onUpdated(d2.page);
      }
    } finally { setVerifying(false); }
  }

  const domainStatusColor = page.domainStatus === "verified" ? "text-emerald-400"
    : page.domainStatus === "failed" ? "text-red-400"
    : page.domainStatus === "pending" ? "text-yellow-400" : "text-white/30";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#020817] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-base font-semibold text-white">Dominio personalizado</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">✕</button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className={labelCls}>Dominio custom</label>
            <input value={domain} onChange={e => setDomain(e.target.value)}
              placeholder="miweb.com" className={inputCls} />
          </div>
          <div className="flex gap-2">
            <NelvyonDsButton variant="secondary" onClick={() => void saveDomain()} disabled={saving}>
              {saving ? "Guardando…" : "Guardar dominio"}
            </NelvyonDsButton>
            {page.customDomain && (
              <NelvyonDsButton onClick={() => void verifyDns()} disabled={verifying}>
                {verifying ? "Verificando…" : "Verificar DNS"}
              </NelvyonDsButton>
            )}
          </div>
          {status && (
            <div className={`rounded-lg px-3 py-2 text-sm ${status.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
              {status.ok ? "✓ DNS verificado — SSL activo" : `✗ ${status.error ?? "Verificación fallida"}`}
            </div>
          )}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-xs space-y-1">
            <p className="font-semibold text-white/50">Instrucciones DNS</p>
            <p className="text-white/40">Añade un registro CNAME en tu DNS:</p>
            <p className="font-mono text-white/70">CNAME → pages.nelvyon.com</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-white/30">Estado:</span>
              <span className={`font-semibold ${domainStatusColor}`}>{page.domainStatus}</span>
              {page.sslStatus === "active" && <span className="text-xs text-emerald-400">🔒 SSL activo</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
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
      const data = (await res.json()) as { page: WebPage };
      onUpdated(data.page);
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#020817] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-base font-semibold text-white">SEO</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">✕</button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className={labelCls}>SEO Title</label>
            <input value={form.seoTitle} onChange={e => setForm(f => ({ ...f, seoTitle: e.target.value }))} className={inputCls} placeholder={page.title} />
            <p className="text-[10px] text-white/20 mt-1">{form.seoTitle.length}/60 chars</p>
          </div>
          <div>
            <label className={labelCls}>Meta description</label>
            <textarea rows={3} value={form.seoDescription} onChange={e => setForm(f => ({ ...f, seoDescription: e.target.value }))} className={inputCls + " resize-none"} placeholder="Descripción para buscadores…" />
            <p className="text-[10px] text-white/20 mt-1">{form.seoDescription.length}/160 chars</p>
          </div>
          <div className="flex gap-2 pt-1">
            <NelvyonDsButton variant="secondary" onClick={onClose}>Cancelar</NelvyonDsButton>
            <NelvyonDsButton onClick={() => void save()} disabled={saving}>{saving ? "Guardando…" : "Guardar SEO"}</NelvyonDsButton>
          </div>
        </div>
      </div>
    </div>
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
      .then(d => setVersions(d.versions ?? []))
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
      const data = (await res.json()) as { page: WebPage };
      onRestored(data.page);
      onClose();
    } finally { setRestoring(null); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#020817] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-base font-semibold text-white">Historial de versiones</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">✕</button>
        </div>
        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {loading && <p className="text-xs text-white/40">Cargando…</p>}
          {!loading && !versions.length && <p className="text-xs text-white/40">Sin versiones guardadas.</p>}
          {versions.map(v => (
            <div key={v.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] px-3 py-2">
              <div>
                <p className="text-sm font-medium text-white">v{v.version}</p>
                <p className="text-[10px] text-white/30">{new Date(v.createdAt).toLocaleString("es")}</p>
                <p className="text-[10px] text-white/20">{v.sections.length} secciones</p>
              </div>
              <NelvyonDsButton variant="secondary" onClick={() => void restore(v.id)} disabled={restoring === v.id}>
                {restoring === v.id ? "…" : "Restaurar"}
              </NelvyonDsButton>
            </div>
          ))}
        </div>
      </div>
    </div>
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
      const data = (await res.json()) as { page: WebPage };
      setPage(data.page);
      setSelectedSection(data.page.sections[0] ?? null);
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
      const data = (await res.json()) as { page: WebPage };
      setPage(data.page);
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
      const data = (await res.json()) as { page: WebPage };
      setPage(data.page);
    } finally { setPublishing(false); }
  }

  async function unpublishPage() {
    const res = await fetch("/api/saas/web-builder", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unpublish", id: pageId }),
    });
    const data = (await res.json()) as { page: WebPage };
    setPage(data.page);
  }

  async function addSection(type: SectionType) {
    const res = await fetch("/api/saas/web-builder", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-section", id: pageId, section_type: type }),
    });
    const data = (await res.json()) as { page: WebPage };
    setPage(data.page);
    const newSection = data.page.sections[data.page.sections.length - 1];
    if (newSection) setSelectedSection(newSection);
  }

  async function deleteSection(sectionId: string) {
    const res = await fetch("/api/saas/web-builder", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-section", id: pageId, section_id: sectionId }),
    });
    const data = (await res.json()) as { page: WebPage };
    setPage(data.page);
    if (selectedSection?.id === sectionId) setSelectedSection(data.page.sections[0] ?? null);
  }

  async function duplicateSection(sectionId: string) {
    const res = await fetch("/api/saas/web-builder", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate-section", id: pageId, section_id: sectionId }),
    });
    const data = (await res.json()) as { page: WebPage };
    setPage(data.page);
  }

  async function moveSection(sectionId: string, dir: "up" | "down") {
    if (!page) return;
    const idx = page.sections.findIndex(s => s.id === sectionId);
    if (idx === -1) return;
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= page.sections.length) return;
    const newOrder = [...page.sections];
    const tmp = newOrder[idx]!; newOrder[idx] = newOrder[targetIdx]!; newOrder[targetIdx] = tmp;
    const orderedIds = newOrder.map(s => s.id);
    const res = await fetch("/api/saas/web-builder", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorder-sections", id: pageId, ordered_ids: orderedIds }),
    });
    const data = (await res.json()) as { page: WebPage };
    setPage(data.page);
  }

  function updateSelectedSectionContent(content: Record<string, unknown>) {
    if (!page || !selectedSection) return;
    const updatedSections = page.sections.map(s =>
      s.id === selectedSection.id ? { ...s, content } : s,
    );
    const updatedSection = { ...selectedSection, content };
    setSelectedSection(updatedSection);
    setPage(p => p ? { ...p, sections: updatedSections } : p);
  }

  function copyCdnUrl() {
    if (!page?.cdnUrl) return;
    void navigator.clipboard.writeText(page.cdnUrl).then(() => {
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 2000);
    });
  }

  if (loading) {
    return (
      <SaasShellLayout sidebar={<SaasSidebar activeId="web-builder" />}>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0084ff] border-t-transparent" />
        </div>
      </SaasShellLayout>
    );
  }

  if (!page) return null;

  const isPublished = page.status === "published";

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="web-builder" />}>
      <div className="flex h-[calc(100vh-4rem)] flex-col">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] bg-[#020817] px-4 py-2">
          <button onClick={() => router.push("/saas/web-builder")} className="text-sm text-white/40 hover:text-white">← Web Builder</button>
          <span className="text-white font-semibold text-sm truncate max-w-[200px]">{page.title}</span>
          <NelvyonDsBadge tone={isPublished ? "success" : "neutral"}>
            {isPublished ? "Publicado" : "Borrador"}
          </NelvyonDsBadge>
          <div className="flex-1" />
          <div className="flex flex-wrap gap-1.5">
            <NelvyonDsButton variant="secondary" onClick={() => setShowSeo(true)}>SEO</NelvyonDsButton>
            <NelvyonDsButton variant="secondary" onClick={() => setShowHistory(true)}>Historial</NelvyonDsButton>
            <NelvyonDsButton variant="secondary" onClick={() => setShowDomain(true)}>Dominio</NelvyonDsButton>
            <NelvyonDsButton variant="secondary" onClick={() => void saveSectionAndSnapshot()} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </NelvyonDsButton>
            {savedAt && <span className="self-center text-[10px] text-white/30">✓ {savedAt.toLocaleTimeString("es")}</span>}
            {isPublished ? (
              <>
                <NelvyonDsButton variant="secondary" onClick={() => void unpublishPage()}>Pausar</NelvyonDsButton>
                <NelvyonDsButton variant="secondary" onClick={copyCdnUrl}>
                  {copyOk ? "✓ Copiado" : "Copiar URL"}
                </NelvyonDsButton>
              </>
            ) : (
              <NelvyonDsButton onClick={() => void publishPage()} disabled={publishing}>
                {publishing ? "Publicando…" : "Publicar"}
              </NelvyonDsButton>
            )}
          </div>
        </div>

        {page.cdnUrl && isPublished && (
          <div className="border-b border-white/[0.04] bg-white/[0.01] px-4 py-1.5">
            <span className="text-[10px] text-white/25">URL pública: </span>
            <a href={page.cdnUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#0084ff] hover:underline break-all">
              {page.cdnUrl}
            </a>
          </div>
        )}

        {/* 3-column editor */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: sections panel */}
          <aside className="w-56 flex-shrink-0 border-r border-white/[0.06] overflow-y-auto bg-[#020817]">
            <div className="p-3">
              <p className="text-[10px] uppercase tracking-wider text-white/25 mb-2">Secciones ({page.sections.length})</p>
              <div className="space-y-1">
                {page.sections.map((s, i) => {
                  const cfg = SECTION_TYPES.find(t => t.type === s.type)!;
                  const isSelected = selectedSection?.id === s.id;
                  return (
                    <div key={s.id}
                      className={`group flex items-center gap-1.5 rounded-lg px-2 py-2 cursor-pointer transition-colors ${isSelected ? "bg-[#0084ff]/15 border border-[#0084ff]/30" : "border border-white/[0.04] hover:bg-white/[0.04]"}`}
                      onClick={() => setSelectedSection(s)}>
                      <span className="text-sm">{cfg?.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{i + 1}. {cfg?.label}</p>
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={e => { e.stopPropagation(); void moveSection(s.id, "up"); }}
                          disabled={i === 0} className="text-white/30 hover:text-white disabled:opacity-20 text-[10px] px-0.5">↑</button>
                        <button onClick={e => { e.stopPropagation(); void moveSection(s.id, "down"); }}
                          disabled={i === page.sections.length - 1} className="text-white/30 hover:text-white disabled:opacity-20 text-[10px] px-0.5">↓</button>
                        <button onClick={e => { e.stopPropagation(); void duplicateSection(s.id); }}
                          className="text-white/30 hover:text-white text-[10px] px-0.5">⧉</button>
                        <button onClick={e => { e.stopPropagation(); void deleteSection(s.id); }}
                          className="text-red-400/50 hover:text-red-400 text-[10px] px-0.5">✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Add section */}
              <div className="mt-3 space-y-1">
                <p className="text-[10px] text-white/20 mb-1">Añadir sección</p>
                {SECTION_TYPES.map(t => (
                  <button key={t.type} onClick={() => void addSection(t.type)}
                    className="w-full flex items-center gap-1.5 rounded-md border border-white/[0.04] px-2 py-1 text-[10px] text-white/40 hover:border-[#0084ff]/30 hover:text-white/70 transition-colors text-left">
                    <span>{t.icon}</span> {t.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Center: live preview iframe */}
          <div className="flex-1 overflow-hidden bg-[#0a0a0a] relative">
            <iframe
              ref={iframeRef}
              title="Preview"
              className="w-full h-full border-0"
              sandbox="allow-same-origin"
            />
            {!previewHtml && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white/20 text-sm">Sin secciones — añade una en el panel izquierdo</p>
              </div>
            )}
          </div>

          {/* Right: props panel */}
          <aside className="w-64 flex-shrink-0 border-l border-white/[0.06] overflow-y-auto bg-[#020817] p-4">
            {selectedSection ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{SECTION_TYPES.find(t => t.type === selectedSection.type)?.icon}</span>
                  <p className="text-sm font-semibold text-white">
                    {SECTION_TYPES.find(t => t.type === selectedSection.type)?.label}
                  </p>
                </div>
                <SectionPropsEditor
                  section={selectedSection}
                  onChange={updateSelectedSectionContent}
                />
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <NelvyonDsButton onClick={() => void savePageSections()} disabled={saving}>
                    {saving ? "Guardando…" : "Aplicar cambios"}
                  </NelvyonDsButton>
                </div>
              </>
            ) : (
              <p className="text-xs text-white/30">Selecciona una sección para editar sus propiedades.</p>
            )}
          </aside>
        </div>
      </div>

      {showDomain && page && (
        <DomainModal page={page} pageId={pageId} onClose={() => setShowDomain(false)}
          onUpdated={p => { setPage(p); setShowDomain(false); }} />
      )}
      {showSeo && page && (
        <SeoModal page={page} pageId={pageId} onClose={() => setShowSeo(false)}
          onUpdated={p => { setPage(p); setShowSeo(false); }} />
      )}
      {showHistory && (
        <HistoryModal pageId={pageId} onClose={() => setShowHistory(false)}
          onRestored={p => { setPage(p); setSelectedSection(p.sections[0] ?? null); }} />
      )}
    </SaasShellLayout>
  );
}

// ── Preview HTML builder (client-side, mirrors server renderHtml) ───────────

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildPreviewHtml(page: WebPage): string {
  if (!page.sections.length) return "";
  const sectionHtml = page.sections.map(s => {
    const c = s.content;
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
              <div style="font-size:1.4rem;margin-bottom:8px">${esc(String(it.icon ?? ""))}</div>
              <p style="color:#fff;font-weight:600;margin:0 0 4px;font-size:0.9rem">${esc(String(it.title ?? ""))}</p>
              <p style="color:#aaa;font-size:0.8rem;margin:0">${esc(String(it.desc ?? ""))}</p>
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
        return `<section style="padding:20px;color:#aaa;text-align:center;font-size:0.875rem">[${s.type}]</section>`;
    }
  }).join("\n");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}</style></head><body>${sectionHtml}</body></html>`;
}
