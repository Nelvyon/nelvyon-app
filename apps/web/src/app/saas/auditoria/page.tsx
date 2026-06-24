"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type AuditAction = "create" | "update" | "delete" | "login" | "export" | "view" | "send" | "publish";

interface AuditEntry {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: AuditAction;
  module: string;
  resourceId: string | null;
  resourceLabel: string | null;
  metadata: Record<string, unknown>;
  ip: string | null;
  createdAt: string;
}

const ACTION_TONE: Record<AuditAction, "success" | "primary" | "danger" | "warning"> = {
  create: "success", update: "primary", delete: "danger",
  login: "success", export: "warning", view: "primary",
  send: "success", publish: "success",
};

const ACTION_LABEL: Record<AuditAction, string> = {
  create: "Creación", update: "Edición", delete: "Eliminación",
  login: "Acceso", export: "Exportación", view: "Vista",
  send: "Envío", publish: "Publicación",
};

const ACTION_ICON: Record<AuditAction, string> = {
  create: "✚", update: "✎", delete: "✕",
  login: "→", export: "↓", view: "◉",
  send: "↗", publish: "⬆",
};

const MODULES = ["Todos", "CRM", "Campañas", "Workflows", "Pipeline", "Formularios", "Agentes", "Billing", "Configuración", "Afiliados"];

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}


export default function SaasAuditoriaPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState("Todos");
  const [filterAction, setFilterAction] = useState<AuditAction | "all">("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/audit?limit=100");
      if (res.ok) {
        const d = (await res.json()) as { entries?: AuditEntry[] };
        setEntries(d.entries ?? []);
      } else {
        setEntries([]);
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = entries.filter(e => {
    if (filterModule !== "Todos" && e.module !== filterModule) return false;
    if (filterAction !== "all" && e.action !== filterAction) return false;
    if (search && !JSON.stringify(e).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: entries.length,
    creates: entries.filter(e => e.action === "create").length,
    deletes: entries.filter(e => e.action === "delete").length,
    users: new Set(entries.map(e => e.userId)).size,
  };

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="auditoria" />}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader
                title="Registros de Auditoría"
                subtitle="Historial completo de acciones, cambios y accesos en tu cuenta"
              />
              <NelvyonDsButton variant="ghost" onClick={() => void load()}>↺ Actualizar</NelvyonDsButton>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Eventos totales", value: stats.total, icon: "📋" },
                { label: "Creaciones", value: stats.creates, icon: "✚" },
                { label: "Eliminaciones", value: stats.deletes, icon: "✕" },
                { label: "Usuarios activos", value: stats.users, icon: "👤" },
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
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por usuario, módulo, recurso..."
                className="h-9 flex-1 min-w-48 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
              <select
                value={filterModule}
                onChange={e => setFilterModule(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                {MODULES.map(m => <option key={m}>{m}</option>)}
              </select>
              <select
                value={filterAction}
                onChange={e => setFilterAction(e.target.value as AuditAction | "all")}
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="all">Todas las acciones</option>
                {(Object.keys(ACTION_LABEL) as AuditAction[]).map(a => (
                  <option key={a} value={a}>{ACTION_LABEL[a]}</option>
                ))}
              </select>
            </div>

            {/* Table */}
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/30" />)}</div>
            ) : filtered.length === 0 ? (
              <NelvyonDsCard className="p-16 text-center">
                <p className="text-4xl">📋</p>
                <p className="mt-4 text-lg font-semibold text-foreground">Sin eventos</p>
                <p className="mt-2 text-sm text-muted-foreground">No hay registros que coincidan con los filtros actuales</p>
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
                      {filtered.map(e => (
                        <tr key={e.id} className="hover:bg-muted/10 transition-colors">
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{fmt(e.createdAt)}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{e.userName}</p>
                            <p className="text-xs text-muted-foreground">{e.userEmail}</p>
                          </td>
                          <td className="px-4 py-3">
                            <NelvyonDsBadge tone={ACTION_TONE[e.action]}>
                              {ACTION_ICON[e.action]} {ACTION_LABEL[e.action]}
                            </NelvyonDsBadge>
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">{e.module}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground max-w-48 truncate">
                            {e.resourceLabel ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{e.ip ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-border px-4 py-3">
                  <p className="text-xs text-muted-foreground">{filtered.length} eventos · últimos 90 días</p>
                </div>
              </NelvyonDsCard>
            )}
    </SaasShellLayout>
  );
}
