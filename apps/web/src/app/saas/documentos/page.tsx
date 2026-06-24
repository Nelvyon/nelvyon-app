"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type DocStatus = "draft" | "sent" | "viewed" | "signed" | "declined" | "expired";
type DocType = "proposal" | "contract" | "estimate" | "nda";

interface Document {
  id: string;
  name: string;
  type: DocType;
  status: DocStatus;
  clientName: string;
  clientEmail: string;
  value: number | null;
  sentAt: string | null;
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

const TYPE_LABEL: Record<DocType, string> = {
  proposal: "Propuesta", contract: "Contrato", estimate: "Presupuesto", nda: "NDA",
};

const TEMPLATES = [
  { id: "t1", name: "Propuesta de servicios", type: "proposal", sections: ["Resumen ejecutivo", "Servicios incluidos", "Cronograma", "Inversión", "Condiciones"] },
  { id: "t2", name: "Contrato de prestación de servicios", type: "contract", sections: ["Partes", "Objeto del contrato", "Duración", "Precio y forma de pago", "Propiedad intelectual", "Confidencialidad"] },
  { id: "t3", name: "Presupuesto detallado", type: "estimate", sections: ["Alcance del trabajo", "Desglose de costes", "Condiciones de pago", "Validez"] },
  { id: "t4", name: "Acuerdo de confidencialidad", type: "nda", sections: ["Definición de información confidencial", "Obligaciones de las partes", "Excepciones", "Duración"] },
];

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function SaasDocumentosPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"docs" | "templates">("docs");
  const [filterStatus, setFilterStatus] = useState<DocStatus | "all">("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/documents");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = (await res.json()) as { documents?: Document[] };
      setDocs(d.documents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar documentos");
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = docs.filter(d => {
    if (filterStatus !== "all" && d.status !== filterStatus) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.clientName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: docs.length,
    signed: docs.filter(d => d.status === "signed").length,
    pending: docs.filter(d => ["sent", "viewed"].includes(d.status)).length,
    valueTotal: docs.filter(d => d.status === "signed").reduce((s, d) => s + (d.value ?? 0), 0),
  };

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="documentos" />}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader title="Documentos & Contratos" subtitle="Crea propuestas, contratos y presupuestos con firma digital integrada" />
              <NelvyonDsButton>+ Nuevo documento</NelvyonDsButton>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Documentos", value: stats.total },
                { label: "Firmados", value: stats.signed },
                { label: "Pendientes firma", value: stats.pending },
                { label: "Valor firmado", value: `€${stats.valueTotal.toLocaleString("es-ES")}` },
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
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar documento o cliente…"
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
                    <NelvyonDsButton className="mt-5">+ Nuevo documento</NelvyonDsButton>
                  </NelvyonDsCard>
                ) : (
                  <NelvyonDsCard className="overflow-hidden p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/20">
                          {["Documento", "Cliente", "Tipo", "Estado", "Valor", "Enviado", "Firmado"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                          ))}
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filtered.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
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
                              <td className="px-4 py-3">
                                <p className="text-sm text-foreground">{d.clientName}</p>
                                <p className="text-xs text-muted-foreground">{d.clientEmail}</p>
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">{TYPE_LABEL[d.type]}</td>
                              <td className="px-4 py-3"><NelvyonDsBadge tone={sc.tone}>{sc.icon} {sc.label}</NelvyonDsBadge></td>
                              <td className="px-4 py-3 text-sm font-medium text-foreground">{d.value ? `€${d.value.toLocaleString("es-ES")}` : "—"}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmt(d.sentAt)}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmt(d.signedAt)}</td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1">
                                  <NelvyonDsButton variant="ghost" className="text-xs px-2">✎ Editar</NelvyonDsButton>
                                  {d.status === "draft" && <NelvyonDsButton className="text-xs px-2">↗ Enviar</NelvyonDsButton>}
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
                        <p className="text-xs text-muted-foreground capitalize">{TYPE_LABEL[t.type as DocType]}</p>
                      </div>
                      <NelvyonDsButton className="text-xs">Usar plantilla</NelvyonDsButton>
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
    </SaasShellLayout>
  );
}
