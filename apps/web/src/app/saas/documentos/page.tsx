"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type DocStatus = "draft" | "sent" | "viewed" | "signed" | "declined" | "expired";
type ApiDocType = "document" | "contract" | "proposal" | "nda";

interface Document {
  id: string;
  name: string;
  type: ApiDocType;
  status: DocStatus;
  contactId: string | null;
  signedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<DocStatus, { label: string; tone: "primary" | "success" | "warning" | "danger"; icon: string }> = {
  draft: { label: "Borrador", tone: "primary", icon: "✎" },
  sent: { label: "Enviado", tone: "warning", icon: "↗" },
  viewed: { label: "Visto", tone: "primary", icon: "◉" },
  signed: { label: "Firmado", tone: "success", icon: "✓" },
  declined: { label: "Rechazado", tone: "danger", icon: "✕" },
  expired: { label: "Expirado", tone: "danger", icon: "⏰" },
};

const TYPE_LABEL: Record<ApiDocType, string> = {
  document: "Documento",
  proposal: "Propuesta",
  contract: "Contrato",
  nda: "NDA",
};

const TEMPLATES = [
  { id: "t1", name: "Propuesta de servicios", type: "proposal" as ApiDocType, sections: ["Resumen ejecutivo", "Servicios incluidos", "Cronograma", "Inversión", "Condiciones"] },
  { id: "t2", name: "Contrato de prestación de servicios", type: "contract" as ApiDocType, sections: ["Partes", "Objeto del contrato", "Duración", "Precio y forma de pago", "Propiedad intelectual", "Confidencialidad"] },
  { id: "t3", name: "Presupuesto detallado", type: "document" as ApiDocType, sections: ["Alcance del trabajo", "Desglose de costes", "Condiciones de pago", "Validez"] },
  { id: "t4", name: "Acuerdo de confidencialidad", type: "nda" as ApiDocType, sections: ["Definición de información confidencial", "Obligaciones de las partes", "Excepciones", "Duración"] },
];

function mapDocument(raw: Record<string, unknown>): Document {
  return {
    id: String(raw.id),
    name: String(raw.name),
    type: String(raw.type) as ApiDocType,
    status: String(raw.status) as DocStatus,
    contactId: raw.contactId != null ? String(raw.contactId) : null,
    signedAt: raw.signedAt != null ? String(raw.signedAt) : null,
    expiresAt: raw.expiresAt != null ? String(raw.expiresAt) : null,
    createdAt: String(raw.createdAt),
  };
}

function shortId(id: string | null): string {
  if (!id) return "Sin contacto";
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function CreateDocumentModal({
  onClose,
  onCreated,
  initialName = "",
  initialType = "document" as ApiDocType,
  templateId,
}: {
  onClose: () => void;
  onCreated: () => void;
  initialName?: string;
  initialType?: ApiDocType;
  templateId?: string;
}) {
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<ApiDocType>(initialType);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          ...(templateId ? { templateId } : {}),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Error ${res.status}`);
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear documento");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Nuevo documento</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={save} className="space-y-4 p-6">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Propuesta Q3 2026"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as ApiDocType)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              {(Object.keys(TYPE_LABEL) as ApiDocType[]).map(t => (
                <option key={t} value={t}>{TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving || !name.trim()} className="flex-1">
              {saving ? "Creando…" : "Crear documento"}
            </NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditDocumentModal({ doc, onClose, onSaved }: { doc: Document; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(doc.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", id: doc.id, name: name.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Error ${res.status}`);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar documento");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Editar documento</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={save} className="space-y-4 p-6">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nombre del documento"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div className="rounded-lg border border-border bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
            Tipo: {TYPE_LABEL[doc.type] ?? doc.type} · Estado: {STATUS_CONFIG[doc.status].label}
          </div>
          <div className="flex gap-3 pt-2">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving || !name.trim()} className="flex-1">
              {saving ? "Guardando…" : "Guardar cambios"}
            </NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SaasDocumentosPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"docs" | "templates">("docs");
  const [filterStatus, setFilterStatus] = useState<DocStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [modalPrefill, setModalPrefill] = useState<{ name: string; type: ApiDocType; templateId?: string } | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/documents");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = (await res.json()) as { documents?: Record<string, unknown>[] };
      setDocs((d.documents ?? []).map(mapDocument));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar documentos");
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openCreateModal(prefill?: { name: string; type: ApiDocType; templateId?: string }) {
    setModalPrefill(prefill ?? null);
    setShowModal(true);
  }

  async function sendDocument(id: string) {
    setSendingId(id);
    setActionError(null);
    try {
      const res = await fetch("/api/saas/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", id, status: "sent" }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Error ${res.status}`);
      }
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al enviar documento");
    } finally {
      setSendingId(null);
    }
  }

  async function deleteDocument(id: string) {
    setDeletingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/saas/documents?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Error ${res.status}`);
      }
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al eliminar documento");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = docs.filter(d => {
    if (filterStatus !== "all" && d.status !== filterStatus) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: docs.length,
    signed: docs.filter(d => d.status === "signed").length,
    pending: docs.filter(d => ["sent", "viewed"].includes(d.status)).length,
    expired: docs.filter(d => d.status === "expired").length,
  };

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="documentos" />}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader
                title="Documentos & Contratos"
                subtitle="Gestiona propuestas, contratos y documentos con seguimiento de estado interno. La firma electrónica externa aún no está disponible."
              />
              <NelvyonDsButton onClick={() => openCreateModal()}>+ Nuevo documento</NelvyonDsButton>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Documentos", value: stats.total },
                { label: "Firmados", value: stats.signed },
                { label: "Pendientes firma", value: stats.pending },
                { label: "Expirados", value: stats.expired },
              ].map(({ label, value }) => (
                <NelvyonDsCard key={label} className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
                </NelvyonDsCard>
              ))}
            </div>

            {error && (
              <NelvyonDsCard className="p-4 border-red-500/30 bg-red-500/5">
                <p className="text-sm text-red-400">{error}</p>
                <button onClick={() => void load()} className="mt-2 text-xs text-primary hover:underline">Reintentar</button>
              </NelvyonDsCard>
            )}

            {actionError && (
              <NelvyonDsCard className="p-4 border-red-500/30 bg-red-500/5">
                <p className="text-sm text-red-400">{actionError}</p>
                <button onClick={() => setActionError(null)} className="mt-2 text-xs text-primary hover:underline">Cerrar</button>
              </NelvyonDsCard>
            )}

            <div className="flex gap-2">
              {(["docs", "templates"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"}`}>
                  {t === "docs" ? `Mis documentos (${docs.length})` : "Plantillas"}
                </button>
              ))}
            </div>

            {tab === "docs" ? (
              <>
                <div className="flex flex-wrap gap-3">
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar documento…"
                    className="h-9 flex-1 min-w-48 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" />
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as DocStatus | "all")}
                    className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none">
                    <option value="all">Todos los estados</option>
                    {(Object.keys(STATUS_CONFIG) as DocStatus[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                </div>
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/30" />)}
                  </div>
                ) : docs.length === 0 && !error ? (
                  <NelvyonDsCard className="p-16 text-center">
                    <p className="text-4xl">📄</p>
                    <p className="mt-4 font-semibold text-foreground">Sin documentos todavía</p>
                    <p className="mt-2 text-sm text-muted-foreground">Crea tu primera propuesta, contrato o presupuesto</p>
                    <NelvyonDsButton className="mt-5" onClick={() => openCreateModal()}>+ Nuevo documento</NelvyonDsButton>
                  </NelvyonDsCard>
                ) : (
                  <NelvyonDsCard className="overflow-hidden p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/20">
                          {["Documento", "Contacto", "Tipo", "Estado", "Creado", "Firmado"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                          ))}
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filtered.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                              Sin resultados para los filtros aplicados
                            </td>
                          </tr>
                        ) : filtered.map(d => {
                          const sc = STATUS_CONFIG[d.status];
                          return (
                            <tr key={d.id} className="hover:bg-muted/10 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-medium text-foreground truncate max-w-48">{d.name}</p>
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground font-mono" title={d.contactId ?? undefined}>
                                {shortId(d.contactId)}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">{TYPE_LABEL[d.type] ?? d.type}</td>
                              <td className="px-4 py-3"><NelvyonDsBadge tone={sc.tone}>{sc.icon} {sc.label}</NelvyonDsBadge></td>
                              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmt(d.createdAt)}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmt(d.signedAt)}</td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1">
                                  <NelvyonDsButton
                                    variant="ghost"
                                    className="text-xs px-2"
                                    onClick={() => { setEditingDoc(d); setShowEditModal(true); }}
                                  >
                                    ✎ Editar
                                  </NelvyonDsButton>
                                  {d.status === "draft" && (
                                    <>
                                      <NelvyonDsButton
                                        className="text-xs px-2"
                                        disabled={sendingId === d.id}
                                        onClick={() => void sendDocument(d.id)}
                                        title="Marca el documento como enviado (seguimiento interno)"
                                      >
                                        {sendingId === d.id ? "Enviando…" : "↗ Enviar"}
                                      </NelvyonDsButton>
                                      <NelvyonDsButton
                                        variant="ghost"
                                        className="text-xs px-2 text-red-400"
                                        disabled={deletingId === d.id}
                                        onClick={() => {
                                          if (window.confirm("¿Eliminar este borrador?")) void deleteDocument(d.id);
                                        }}
                                      >
                                        {deletingId === d.id ? "…" : "Eliminar"}
                                      </NelvyonDsButton>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </NelvyonDsCard>
                )}
              </>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {TEMPLATES.map(t => (
                  <NelvyonDsCard key={t.id} className="p-5 hover:border-primary/30 transition-colors">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{TYPE_LABEL[t.type]}</p>
                      </div>
                      <NelvyonDsButton
                        className="text-xs"
                        onClick={() => openCreateModal({ name: t.name, type: t.type, templateId: t.id })}
                      >
                        Usar plantilla
                      </NelvyonDsButton>
                    </div>
                    <div className="space-y-1">
                      {t.sections.map((s, i) => (
                        <div key={s} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="text-primary">{i + 1}.</span> {s}
                        </div>
                      ))}
                    </div>
                  </NelvyonDsCard>
                ))}
              </div>
            )}

      {showModal && (
        <CreateDocumentModal
          onClose={() => { setShowModal(false); setModalPrefill(null); }}
          onCreated={() => { void load(); setTab("docs"); }}
          initialName={modalPrefill?.name ?? ""}
          initialType={modalPrefill?.type ?? "document"}
          templateId={modalPrefill?.templateId}
        />
      )}
      {showEditModal && editingDoc && (
        <EditDocumentModal
          doc={editingDoc}
          onClose={() => { setShowEditModal(false); setEditingDoc(null); }}
          onSaved={() => void load()}
        />
      )}
    </SaasShellLayout>
  );
}
