"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

import { ApiError } from "@/core/api/types";
import { OS_PROJECT_STATUS_OPTIONS } from "@/features/os-shell/constants";
import { osClientsApi } from "@/features/os-shell/clients/api";
import type { OsClient } from "@/features/os-shell/clients/types";
import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";
import {
  OsEmptyState,
  OsErrorBanner,
  OsField,
  OsInput,
  OsLoadingBlock,
  OsPageHeader,
  OsPrimaryButton,
  OsSelect,
  OsStatusBadge,
  OsTable,
} from "@/features/os-shell/components/ui/OsUi";
import { useOsPermissions } from "@/features/os-shell/hooks/useOsPermissions";

import { osProjectsApi } from "./api";
import type { OsProject } from "./types";

export function OsProjectsListView() {
  const perms = useOsPermissions();
  const [projects, setProjects] = useState<OsProject[]>([]);
  const [clients, setClients] = useState<OsClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string | number> = {};
      if (statusFilter) query.status = statusFilter;
      if (clientFilter) query.client_id = Number(clientFilter);
      const [pRes, cRes] = await Promise.all([
        osProjectsApi.list({ limit: 500, query, sort: "-id" }),
        osClientsApi.list({ limit: 500 }),
      ]);
      setProjects(pRes.items ?? []);
      setClients(cRes.items ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error cargando proyectos");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, clientFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c.business_name])), [clients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.project_type.toLowerCase().includes(q) ||
        (clientMap.get(p.client_id) ?? "").toLowerCase().includes(q),
    );
  }, [projects, search, clientMap]);

  return (
    <OsShellLayout onRefresh={() => void load()} refreshing={loading}>
      <OsPageHeader
        title="Proyectos"
        description="Fuente: nelvyon_projects. Entregas en nelvyon_outputs."
        actions={
          perms.canCreate ? (
            <OsPrimaryButton href="/os/proyectos/nuevo">
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo proyecto
            </OsPrimaryButton>
          ) : null
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <OsField label="Buscar">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-white/40" />
            <OsInput
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre, tipo, cliente…"
            />
          </div>
        </OsField>
        <OsField label="Estado (API)">
          <OsSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {OS_PROJECT_STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </OsSelect>
        </OsField>
        <OsField label="Cliente (API)">
          <OsSelect value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
            <option value="">Todos</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.business_name}
              </option>
            ))}
          </OsSelect>
        </OsField>
      </div>

      {error ? <OsErrorBanner message={error} /> : null}
      {loading ? <OsLoadingBlock /> : null}
      {!loading && !error && filtered.length === 0 ? (
        <OsEmptyState
          action={perms.canCreate ? <OsPrimaryButton href="/os/proyectos/nuevo">Crear proyecto</OsPrimaryButton> : null}
        />
      ) : null}
      {!loading && !error && filtered.length > 0 ? (
        <OsTable>
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase text-white/45">
              <th className="px-4 py-3">Proyecto</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Progreso</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                <td className="px-4 py-3 text-white/65">{clientMap.get(p.client_id) ?? `#${p.client_id}`}</td>
                <td className="px-4 py-3 text-white/55">{p.project_type}</td>
                <td className="px-4 py-3">
                  <OsStatusBadge label={p.status || "—"} tone="info" />
                </td>
                <td className="px-4 py-3 text-white/50">{p.progress ?? "—"}%</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/os/proyectos/${p.id}`} className="text-sm text-[#0084FF] hover:underline">
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </OsTable>
      ) : null}
    </OsShellLayout>
  );
}
