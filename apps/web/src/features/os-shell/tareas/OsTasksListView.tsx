"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";

import { ApiError } from "@/core/api/types";
import { osClientsApi } from "@/features/os-shell/clients/legacyApi";
import type { OsClientPickerRow } from "@/features/os-shell/clients/types";
import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";
import {
  OsEmptyState,
  OsErrorBanner,
  OsField,
  OsLoadingBlock,
  OsPageHeader,
  OsPrimaryButton,
  OsSelect,
  OsStatusBadge,
  OsTable,
} from "@/features/os-shell/components/ui/OsUi";
import { OS_TASK_PRIORITY_OPTIONS, OS_TASK_STATUS_OPTIONS } from "@/features/os-shell/constants";
import { useOsPermissions } from "@/features/os-shell/hooks/useOsPermissions";
import { osProjectsApi } from "@/features/os-shell/projects/api";
import type { OsProject } from "@/features/os-shell/projects/types";

import { osTasksApi } from "./api";
import { isTaskOverdue, taskPriorityTone, taskStatusLabel, taskStatusTone } from "./taskStatus";
import type { OsTask } from "./types";

export function OsTasksListView() {
  const perms = useOsPermissions();
  const [tasks, setTasks] = useState<OsTask[]>([]);
  const [clients, setClients] = useState<OsClientPickerRow[]>([]);
  const [projects, setProjects] = useState<OsProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string | number> = {};
      if (statusFilter) query.status = statusFilter;
      if (priorityFilter) query.priority = priorityFilter;
      const [tRes, cRes, pRes] = await Promise.all([
        osTasksApi.list({ limit: 500, query, sort: "-id" }),
        osClientsApi.list({ limit: 500 }),
        osProjectsApi.list({ limit: 500 }),
      ]);
      setTasks(tRes.items ?? []);
      setClients(cRes.items ?? []);
      setProjects(pRes.items ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error cargando tareas");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c.business_name])), [clients]);
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);

  const markComplete = async (task: OsTask) => {
    if (!perms.canEdit) return;
    try {
      await osTasksApi.update(task.id, { status: "completada" });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: "completada" } : t)),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo completar");
    }
  };

  return (
    <OsShellLayout onRefresh={() => void load()} refreshing={loading}>
      <OsPageHeader
        title="Tareas operativas"
        description="Fuente: os_tasks. Sin mocks ni activities SaaS."
        actions={
          perms.canCreate ? (
            <OsPrimaryButton href="/os/tareas/nuevo">
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva tarea
            </OsPrimaryButton>
          ) : null
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <OsField label="Estado">
          <OsSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {OS_TASK_STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </OsSelect>
        </OsField>
        <OsField label="Prioridad">
          <OsSelect value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            {OS_TASK_PRIORITY_OPTIONS.map((o) => (
              <option key={o.value || "allp"} value={o.value}>
                {o.label}
              </option>
            ))}
          </OsSelect>
        </OsField>
      </div>

      {error ? <OsErrorBanner message={error} /> : null}
      {loading ? <OsLoadingBlock /> : null}
      {!loading && tasks.length === 0 ? (
        <OsEmptyState
          title="Sin datos todavía"
          description="Crea tareas internas vinculadas a clientes o proyectos cuando haga falta."
          action={
            perms.canCreate ? (
              <OsPrimaryButton href="/os/tareas/nuevo">Nueva tarea</OsPrimaryButton>
            ) : null
          }
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
              const overdue =
                t.status !== "completada" && isTaskOverdue(t.due_date ?? undefined);
              return (
                <tr key={t.id} className="border-b border-white/5">
                  <td className="px-4 py-2">
                    <Link href={`/os/tareas/${t.id}`} className="font-medium text-white hover:text-[#0084FF]">
                      {t.title}
                    </Link>
                    {t.assignee ? (
                      <p className="text-xs text-white/40">{t.assignee}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-2">
                    <OsStatusBadge label={taskStatusLabel(t.status)} tone={taskStatusTone(t.status)} />
                  </td>
                  <td className="px-4 py-2">
                    <OsStatusBadge
                      label={t.priority ?? "media"}
                      tone={taskPriorityTone(t.priority ?? "media")}
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
                    {t.client_id ? clientMap.get(t.client_id) ?? `#${t.client_id}` : "—"}
                    {t.project_id ? ` · ${projectMap.get(t.project_id) ?? `#${t.project_id}`}` : ""}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {perms.canEdit && t.status !== "completada" ? (
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
    </OsShellLayout>
  );
}
