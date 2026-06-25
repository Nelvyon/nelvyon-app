"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

interface AuditEntry {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  module: string;
  resourceId: string | null;
  resourceType: string | null;
  ipAddress: string | null;
  createdAt: string;
}

type ActionTone = "success" | "primary" | "danger" | "warning" | "neutral";

const ACTION_TONE: Record<string, ActionTone> = {
  create: "success", update: "primary", delete: "danger",
  login: "success", export: "warning", view: "neutral",
  send: "success", publish: "success", purge: "danger",
};
const ACTION_LABEL: Record<string, string> = {
  create: "Creación", update: "Edición", delete: "Eliminación",
  login: "Acceso", export: "Exportación", view: "Vista",
  send: "Envío", publish: "Publicación", purge: "Purga",
};

const MODULES = ["", "crm", "campanias", "workflows", "pipeline", "affiliates", "loyalty", "billing", "settings", "sso", "api-keys"];
const PAGE_SIZE = 50;

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function SaasAuditoriaPage() {
  const [entries, setEntries]       = useState<AuditEntry[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [filterModule, setFilterModule] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [from, setFrom]             = useState("");
  const [to, setTo]                 = useState("");

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    p.set("limit",  String(PAGE_SIZE));
    p.set("offset", String((page - 1) * PAGE_SIZE));
    if (filterModule) p.set("module",        filterModule);
    if (filterAction) p.set("action_filter", filterAction);
    if (from) p.set("from", new Date(from).toISOString());
    if (to)   p.set("to",   new Date(to + "T23:59:59").toISOString());
    return p;
  }, [page, filterModule, filterAction, from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/saas/audit?${buildParams()}`, { credentials: "same-origin" });
      if (res.ok) {
        const d = (await res.json()) as { entries?: AuditEntry[]; total?: number };
        setEntries(d.entries ?? []);
        setTotal(d.total ?? 0);
      } else {
        setEntries([]);
        setTotal(0);
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => { void load(); }, [load]);

  function applyFilters() {
    setPage(1);
    void load();
  }

  async function exportCsv() {
    const p = buildParams();
    p.set("format", "csv");
    const res = await fetch(`/api/saas/audit?${p}`, { credentials: "same-origin" });
    if (!res.ok) return;
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `audit-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const stats = {
    total,
    creates: entries.filter(e => e.action === "create").length,
    deletes: entries.filter(e => e.action === "delete").length,
    modules: new Set(entries.map(e => e.module)).size,
  };

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="auditoria" />}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <NelvyonDsSectionHeader
          title="Registros de Auditoría"
          subtitle="Historial completo de acciones, cambios y accesos en tu cuenta"
        />
        <div className="flex gap-2">
          <NelvyonDsButton variant="ghost" onClick={() => void load()}>↺ Actualizar</NelvyonDsButton>
          <NelvyonDsButton variant="secondary" onClick={() => void exportCsv()}>⬇ Exportar CSV</NelvyonDsButton>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total (página)", value: total, icon: "📋" },
          { label: "Creaciones", value: stats.creates, icon: "✚" },
          { label: "Eliminaciones", value: stats.deletes, icon: "✕" },
          { label: "Módulos activos", value: stats.modules, icon: "📦" },
        ].map(s => (
          <NelvyonDsCard key={s.label} className="p-4">
            <p className="text-lg">{s.icon}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </NelvyonDsCard>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterModule}
          onChange={e => setFilterModule(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">Todos los módulos</option>
          {MODULES.filter(Boolean).map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">Todas las acciones</option>
          {Object.keys(ACTION_LABEL).map(a => (
            <option key={a} value={a}>{ACTION_LABEL[a]}</option>
          ))}
        </select>
        <input
          type="date" value={from} onChange={e => setFrom(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          title="Desde"
        />
        <input
          type="date" value={to} onChange={e => setTo(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          title="Hasta"
        />
        <NelvyonDsButton variant="primary" onClick={applyFilters}>Filtrar</NelvyonDsButton>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/30" />
        ))}</div>
      ) : entries.length === 0 ? (
        <NelvyonDsCard className="p-16 text-center">
          <p className="text-4xl">📋</p>
          <p className="mt-4 text-lg font-semibold text-foreground">Sin eventos</p>
          <p className="mt-2 text-sm text-muted-foreground">No hay registros que coincidan con los filtros</p>
        </NelvyonDsCard>
      ) : (
        <NelvyonDsCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Acción</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Módulo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Recurso</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map(e => {
                  const tone = ACTION_TONE[e.action] ?? "neutral";
                  const label = ACTION_LABEL[e.action] ?? e.action;
                  return (
                    <tr key={e.id} className="hover:bg-muted/10 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{fmt(e.createdAt)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{e.userEmail ?? e.userId ?? "—"}</td>
                      <td className="px-4 py-3">
                        <NelvyonDsBadge tone={tone}>{label}</NelvyonDsBadge>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{e.module}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-48 truncate">
                        {e.resourceType ? `${e.resourceType}:${e.resourceId ?? ""}` : e.resourceId ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{e.ipAddress ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">{total} eventos totales · página {page} de {totalPages}</p>
            <div className="flex gap-2">
              <NelvyonDsButton variant="ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                ← Anterior
              </NelvyonDsButton>
              <NelvyonDsButton variant="ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                Siguiente →
              </NelvyonDsButton>
            </div>
          </div>
        </NelvyonDsCard>
      )}
    </SaasShellLayout>
  );
}
