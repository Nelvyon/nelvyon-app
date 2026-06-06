"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";

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
import { osProjectsCanonicalApi } from "@/features/os-shell/projects/api";
import type { OsCanonicalProject } from "@/features/os-shell/projects/types";

import { osTasksCanonicalApi } from "./api";
import {
  isTaskOverdue,
  OS_CANONICAL_TASK_PRIORITY_OPTIONS,
  OS_CANONICAL_TASK_STATUS_OPTIONS,
  taskPriorityLabel,
  taskPriorityTone,
  taskStatusLabel,
  taskStatusTone,
} from "./taskStatus";
import type { OsCanonicalTask } from "./types";

const PAGE_SIZE = 20;

export function OsTasksListCanonicalView() {
  const perms = useOsPermissions();
  const [tasks, setTasks] = useState<OsCanonicalTask[]>([]);
  const [clients, setClients] = useState<OsClient[]>([]);
  const [projects, setProjects] = useState<OsCanonicalProject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, statusFilter, priorityFilter, clientFilter, projectFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tRes, cRes, pRes] = await Promise.all([
        osTasksCanonicalApi.list({
          page,
          page_size: PAGE_SIZE,
          q: searchDebounced || undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          client_id: clientFilter || undefined,
          project_id: projectFilter || undefined,
        }),
        osClientsCanonicalApi.list({ skip: 0, limit: 200, status: "active" }),
        osProjectsCanonicalApi.list({ page: 1, page_size: 200 }),
      ]);
      setTasks(tRes.items ?? []);
      setTotal(tRes.total ?? 0);
      setClients(cRes.items ?? []);
      setProjects(pRes.items ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error cargando tareas");
    } finally {
      setLoading(false);
    }
  }, [page, searchDebounced, statusFilter, priorityFilter, clientFilter, projectFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c.business_name])), [clients]);
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const markComplete = async (task: OsCanonicalTask) => {
    if (!perms.canEdit) return;
    try {
      await osTasksCanonicalApi.update(task.id, { status: "completed" });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: "completed" } : t)),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo completar");
    }
  };

  return (
    <OsShellLayout onRefresh={() => void load()} refreshing={loading}>
      <OsPageHeader
        title="Tareas operativas"
        description="Fuente: os_tasks · API canónica /api/v1/os/tasks"
        actions={
          perms.canCreate ? (
            <OsPrimaryButton href="/os/tareas/nuevo">
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva tarea
            </OsPrimaryButton>
          ) : null
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-5">
        <OsField label="Buscar">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-white/40" />
            <OsInput
              className="pl-9"
              placeholder="Título, descripción…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </OsField>
        <OsField label="Estado">
          <OsSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {OS_CANONICAL_TASK_STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </OsSelect>
        </OsField>
        <OsField label="Prioridad">
          <OsSelect value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            {OS_CANONICAL_TASK_PRIORITY_OPTIONS.map((o) => (
              <option key={o.value || "allp"} value={o.value}>
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
        <OsField label="Proyecto">
          <OsSelect value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="">Todos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </OsSelect>
        </OsField>
      </div>

      {error ? <OsErrorBanner message={error} /> : null}
      {loading ? <OsLoadingBlock label="Cargando tareas…" /> : null}
      {!loading && tasks.length === 0 ? (
        <OsEmptyState
          title="Sin tareas"
          description="Crea tareas canónicas vinculadas a clientes o proyectos."
          action={perms.canCreate ? <OsPrimaryButton href="/os/tareas/nuevo">Nueva tarea</OsPrimaryButton> : null}
        />
      ) : null}

      {!loading && tasks.length > 0 ? (
        <OsTable>
          <thead>
            <tr className="border-b border-white/10 text-xs text-white/45">
              <th className="px-4 py-2">Tarea</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Prioridad</th>
              <th className="px-4 py-2">Límite</th>
              <th className="px-4 py-2">Vínculo</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const overdue = isTaskOverdue(t.due_date ?? undefined, t.status);
              return (
                <tr key={t.id} className="border-b border-white/5">
                  <td className="px-4 py-2">
                    <Link href={`/os/tareas/${t.id}`} className="font-medium text-white hover:text-[#0084FF]">
                      {t.title}
                    </Link>
                    {t.assignee ? <p className="text-xs text-white/40">{t.assignee}</p> : null}
                  </td>
                  <td className="px-4 py-2">
                    <OsStatusBadge label={taskStatusLabel(t.status)} tone={taskStatusTone(t.status)} />
                  </td>
                  <td className="px-4 py-2">
                    <OsStatusBadge
                      label={taskPriorityLabel(t.priority)}
                      tone={taskPriorityTone(t.priority)}
                    />
                  </td>
                  <td className="px-4 py-2 text-white/70">
                    {t.due_date ? (
                      <span className={overdue ? "text-red-300" : undefined}>{t.due_date.slice(0, 10)}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-white/50">
                    {t.client_id ? clientMap.get(t.client_id) ?? `${t.client_id.slice(0, 8)}…` : "—"}
                    {t.project_id ? ` · ${projectMap.get(t.project_id) ?? `${t.project_id.slice(0, 8)}…`}` : ""}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {perms.canEdit && t.status !== "completed" && t.status !== "archived" ? (
                      <button
                        type="button"
                        title="Marcar completada"
                        className="inline-flex text-emerald-400 hover:text-emerald-300"
                        onClick={() => void markComplete(t)}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </OsTable>
      ) : null}

      {!loading && total > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-white/50">
          <span>
            {tasks.length} en página · {total} total · os_tasks
          </span>
          <div className="flex items-center gap-2">
            <OsGhostButton type="button" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </OsGhostButton>
            <span>
              Página {page} / {totalPages}
            </span>
            <OsGhostButton type="button" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </OsGhostButton>
          </div>
        </div>
      ) : null}
    </OsShellLayout>
  );
}
