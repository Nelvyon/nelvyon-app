"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/core/api/types";
import { osClientsCanonicalApi } from "@/features/os-shell/clients/api";
import type { OsClient } from "@/features/os-shell/clients/types";
import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";
import {
  OsErrorBanner,
  OsGhostButton,
  OsLoadingBlock,
  OsPageHeader,
  OsPrimaryButton,
  OsStatusBadge,
} from "@/features/os-shell/components/ui/OsUi";
import { useOsPermissions } from "@/features/os-shell/hooks/useOsPermissions";
import { osProjectsCanonicalApi } from "@/features/os-shell/projects/api";
import type { OsCanonicalProject } from "@/features/os-shell/projects/types";

import { osTasksCanonicalApi } from "./api";
import { emptyOsTaskCanonicalForm, OsTaskCanonicalForm } from "./OsTaskCanonicalForm";
import { taskPriorityLabel, taskPriorityTone, taskStatusLabel, taskStatusTone } from "./taskStatus";
import type { OsCanonicalTask, OsTaskUpdateInput } from "./types";

export function OsTaskDetailCanonicalView({ taskId }: { taskId: string }) {
  const router = useRouter();
  const perms = useOsPermissions();
  const [task, setTask] = useState<OsCanonicalTask | null>(null);
  const [clients, setClients] = useState<OsClient[]>([]);
  const [projects, setProjects] = useState<OsCanonicalProject[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<OsTaskUpdateInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, cRes, pRes] = await Promise.all([
        osTasksCanonicalApi.getById(taskId),
        osClientsCanonicalApi.list({ skip: 0, limit: 200, status: "active" }),
        osProjectsCanonicalApi.list({ page: 1, page_size: 200 }),
      ]);
      setTask(t);
      setForm({
        title: t.title,
        description: t.description ?? "",
        status: t.status,
        priority: t.priority,
        due_date: t.due_date ?? "",
        client_id: t.client_id ?? undefined,
        project_id: t.project_id ?? undefined,
        assignee: t.assignee ?? "",
      });
      setClients(cRes.items ?? []);
      setProjects(pRes.items ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Tarea no encontrada");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!form || !task || !perms.canEdit) return;
    setSaving(true);
    try {
      const updated = await osTasksCanonicalApi.update(task.id, {
        ...form,
        title: form.title?.trim(),
        description: form.description?.trim() || undefined,
        due_date: form.due_date || undefined,
        assignee: form.assignee?.trim() || undefined,
      });
      setTask(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const markComplete = async () => {
    if (!task || !perms.canEdit) return;
    try {
      const updated = await osTasksCanonicalApi.update(task.id, { status: "completed" });
      setTask(updated);
      if (form) setForm({ ...form, status: "completed" });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error");
    }
  };

  const archive = async () => {
    if (!task || !perms.canDelete) return;
    if (!confirm("¿Archivar esta tarea? (soft delete)")) return;
    try {
      await osTasksCanonicalApi.archive(task.id);
      router.push("/os/tareas");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo archivar");
    }
  };

  if (loading) {
    return (
      <OsShellLayout>
        <OsLoadingBlock label="Cargando tarea…" />
      </OsShellLayout>
    );
  }

  if (!task || !form) {
    return (
      <OsShellLayout>
        <OsErrorBanner message={error ?? "Sin datos"} />
        <OsGhostButton href="/os/tareas">Volver</OsGhostButton>
      </OsShellLayout>
    );
  }

  const client = task.client_id ? clients.find((c) => c.id === task.client_id) : undefined;
  const project = task.project_id ? projects.find((p) => p.id === task.project_id) : undefined;

  return (
    <OsShellLayout onRefresh={() => void load()} refreshing={loading}>
      <OsPageHeader
        title={task.title}
        description={`${task.id.slice(0, 8)}… · os_tasks`}
        actions={
          <>
            {perms.canEdit && task.status !== "completed" && task.status !== "archived" ? (
              <OsPrimaryButton type="button" onClick={() => void markComplete()}>
                Completar
              </OsPrimaryButton>
            ) : null}
            {perms.canEdit && !editing && task.status !== "archived" ? (
              <OsGhostButton type="button" onClick={() => setEditing(true)}>
                Editar
              </OsGhostButton>
            ) : null}
          </>
        }
      />
      {error ? <OsErrorBanner message={error} /> : null}
      <div className="mb-4 flex flex-wrap gap-2">
        <OsStatusBadge label={taskStatusLabel(task.status)} tone={taskStatusTone(task.status)} />
        <OsStatusBadge label={taskPriorityLabel(task.priority)} tone={taskPriorityTone(task.priority)} />
        {client ? (
          <Link href={`/os/clientes/${client.id}`} className="text-sm text-[#0084FF] hover:underline">
            {client.business_name}
          </Link>
        ) : null}
        {project ? (
          <Link href={`/os/proyectos/${project.id}`} className="text-sm text-[#0084FF] hover:underline">
            {project.name}
          </Link>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-6 max-w-2xl rounded-xl border border-[#0084FF]/30 bg-[#0b1428] p-6">
          <OsTaskCanonicalForm
            value={{ ...emptyOsTaskCanonicalForm(), ...form, title: form.title ?? "" }}
            onChange={setForm}
            clients={clients}
            projects={projects}
            disabled={saving}
          />
          <div className="mt-4 flex gap-2">
            <OsPrimaryButton type="button" onClick={() => void save()} disabled={saving}>
              Guardar
            </OsPrimaryButton>
            <OsGhostButton type="button" onClick={() => setEditing(false)}>
              Cancelar
            </OsGhostButton>
          </div>
        </div>
      ) : (
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-white/45">Descripción</dt>
            <dd className="text-white/80">{task.description || "—"}</dd>
          </div>
          <div>
            <dt className="text-white/45">Asignado</dt>
            <dd className="text-white">{task.assignee || "—"}</dd>
          </div>
          <div>
            <dt className="text-white/45">Fecha límite</dt>
            <dd className="text-white">{task.due_date?.slice(0, 10) || "—"}</dd>
          </div>
          <div>
            <dt className="text-white/45">Completada</dt>
            <dd className="text-white">{task.completed_at?.slice(0, 10) || "—"}</dd>
          </div>
        </dl>
      )}

      <div className="mt-8 flex gap-2">
        <OsGhostButton href="/os/tareas">← Tareas</OsGhostButton>
        {perms.canDelete && task.status !== "archived" ? (
          <button type="button" className="text-sm text-red-400 hover:underline" onClick={() => void archive()}>
            Archivar tarea
          </button>
        ) : null}
      </div>
    </OsShellLayout>
  );
}
