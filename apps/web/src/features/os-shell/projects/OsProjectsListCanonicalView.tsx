"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";

import { ApiError } from "@/core/api/types";
import { osClientsCanonicalApi } from "@/features/os-shell/clients/api";
import type { OsClient } from "@/features/os-shell/clients/types";
import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";
import {
  OsEmptyState,
  OsErrorBanner,
  OsField,
  OsGhostButton,
  OsInput,
  OsLoadingBlock,
  OsPageHeader,
  OsPrimaryButton,
  OsSelect,
  OsStatusBadge,
  OsTable,
} from "@/features/os-shell/components/ui/OsUi";
import { useOsPermissions } from "@/features/os-shell/hooks/useOsPermissions";

import { osProjectsCanonicalApi } from "./api";
import {
  OS_CANONICAL_PROJECT_PRIORITY_OPTIONS,
  OS_CANONICAL_PROJECT_STATUS_OPTIONS,
  projectPriorityLabel,
  projectPriorityTone,
  projectStatusLabel,
  projectStatusTone,
} from "./projectStatus";
import type { OsCanonicalProject } from "./types";

const PAGE_SIZE = 20;

export function OsProjectsListCanonicalView() {
  const perms = useOsPermissions();
  const [projects, setProjects] = useState<OsCanonicalProject[]>([]);
  const [clients, setClients] = useState<OsClient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, statusFilter, priorityFilter, clientFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, cRes] = await Promise.all([
        osProjectsCanonicalApi.list({
          page,
          page_size: PAGE_SIZE,
          q: searchDebounced || undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          client_id: clientFilter || undefined,
        }),
        osClientsCanonicalApi.list({ skip: 0, limit: 200, status: "active" }),
      ]);
      setProjects(pRes.items ?? []);
      setTotal(pRes.total ?? 0);
      setClients(cRes.items ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error cargando proyectos");
    } finally {
      setLoading(false);
    }
  }, [page, searchDebounced, statusFilter, priorityFilter, clientFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c.business_name])), [clients]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <OsShellLayout onRefresh={() => void load()} refreshing={loading}>
      <OsPageHeader
        title="Proyectos"
        description="Fuente: os_projects · API canónica /api/v1/os/projects"
        actions={
          perms.canCreate ? (
            <OsPrimaryButton href="/os/proyectos/nuevo">
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo proyecto
            </OsPrimaryButton>
          ) : null
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <OsField label="Buscar">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-white/40" />
            <OsInput
              className="pl-9"
              placeholder="Nombre, descripción…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </OsField>
        <OsField label="Estado">
          <OsSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {OS_CANONICAL_PROJECT_STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </OsSelect>
        </OsField>
        <OsField label="Prioridad">
          <OsSelect value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            {OS_CANONICAL_PROJECT_PRIORITY_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </OsSelect>
        </OsField>
        <OsField label="Cliente">
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
      {loading ? <OsLoadingBlock label="Cargando proyectos…" /> : null}
      {!loading && !error && projects.length === 0 ? (
        <OsEmptyState
          title="Sin proyectos"
          description="Crea el primer proyecto canónico para este workspace."
          action={
            perms.canCreate ? (
              <OsPrimaryButton href="/os/proyectos/nuevo">Crear proyecto</OsPrimaryButton>
            ) : null
          }
        />
      ) : null}
      {!loading && !error && projects.length > 0 ? (
        <OsTable>
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/45">
              <th className="px-4 py-3 font-medium">Proyecto</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Prioridad</th>
              <th className="px-4 py-3 font-medium">Fecha límite</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                <td className="px-4 py-3 text-white/65">
                  {clientMap.get(p.client_id) ?? `${p.client_id.slice(0, 8)}…`}
                </td>
                <td className="px-4 py-3">
                  <OsStatusBadge
                    label={projectStatusLabel(p.status)}
                    tone={projectStatusTone(p.status)}
                  />
                </td>
                <td className="px-4 py-3">
                  <OsStatusBadge
                    label={projectPriorityLabel(p.priority)}
                    tone={projectPriorityTone(p.priority)}
                  />
                </td>
                <td className="px-4 py-3 text-white/50">{p.due_date || "—"}</td>
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

      {!loading && total > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-white/50">
          <span>
            {projects.length} en página · {total} total · os_projects
          </span>
          <div className="flex items-center gap-2">
            <OsGhostButton
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </OsGhostButton>
            <span>
              Página {page} / {totalPages}
            </span>
            <OsGhostButton
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </OsGhostButton>
          </div>
        </div>
      ) : null}
    </OsShellLayout>
  );
}
