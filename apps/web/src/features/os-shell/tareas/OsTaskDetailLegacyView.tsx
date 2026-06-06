"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/core/api/types";
import { osClientsLegacyApi } from "@/features/os-shell/clients/legacyApi";
import type { OsLegacyClient } from "@/features/os-shell/clients/types";
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
import { osProjectsLegacyApi } from "@/features/os-shell/projects/legacyApi";
import type { OsLegacyProject } from "@/features/os-shell/projects/types";

import { osTasksLegacyApi } from "./legacyApi";
import { taskStatusLabel, taskStatusTone } from "./taskStatus";
import { OsTaskForm } from "./OsTaskForm";
import type { OsLegacyTask, OsLegacyTaskWriteInput } from "./types";

export function OsTaskDetailLegacyView({ taskId }: { taskId: number }) {
  const router = useRouter();
  const perms = useOsPermissions();
  const [task, setTask] = useState<OsLegacyTask | null>(null);
  const [clients, setClients] = useState<OsLegacyClient[]>([]);
  const [projects, setProjects] = useState<OsLegacyProject[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<OsLegacyTaskWriteInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, cRes, pRes] = await Promise.all([
        osTasksLegacyApi.getById(taskId),
        osClientsLegacyApi.list({ limit: 500 }),
        osProjectsLegacyApi.list({ limit: 500 }),
      ]);
      setTask(t);
      setForm({
        title: t.title,
        description: t.description ?? null,
        status: t.status,
        priority: t.priority ?? "media",
        due_date: t.due_date ?? null,
        client_id: t.client_id ?? null,
        project_id: t.project_id ?? null,
        assignee: t.assignee ?? null,
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
    if (!form || !perms.canEdit) return;
    setSaving(true);
    try {
      const updated = await osTasksLegacyApi.update(taskId, form);
      setTask(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const markComplete = async () => {
    if (!perms.canEdit) return;
    try {
      const updated = await osTasksLegacyApi.update(taskId, { status: "completada" });
      setTask(updated);
      if (form) setForm({ ...form, status: "completada" });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error");
    }
  };

  const remove = async () => {
    if (!perms.canDelete || !confirm("¿Eliminar esta tarea?")) return;
    try {
      await osTasksLegacyApi.delete(taskId);
      router.push("/os/tareas");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo eliminar");
    }
  };

  if (loading) {
    return (
      <OsShellLayout>
        <OsLoadingBlock />
      </OsShellLayout>
    );
  }

  if (!task || !form) {
    return (
      <OsShellLayout>
        <OsErrorBanner message={error ?? "Sin datos todavía"} />
        <OsGhostButton href="/os/tareas">Volver</OsGhostButton>
      </OsShellLayout>
    );
  }

  return (
    <OsShellLayout onRefresh={() => void load()} refreshing={loading}>
      <OsPageHeader
        title={task.title}
        description={`Tarea #${task.id} · entities/os_tasks`}
        actions={
          <>
            {perms.canEdit && task.status !== "completada" ? (
              <OsPrimaryButton onClick={() => void markComplete()}>Completar</OsPrimaryButton>
            ) : null}
            {perms.canEdit && !editing ? (
              <OsGhostButton onClick={() => setEditing(true)}>Editar</OsGhostButton>
            ) : null}
          </>
        }
      />
      {error ? <OsErrorBanner message={error} /> : null}
      <OsStatusBadge label={taskStatusLabel(task.status)} tone={taskStatusTone(task.status)} />

      {editing ? (
        <div className="mt-6 max-w-2xl rounded-xl border border-[#0084FF]/30 bg-[#0b1428] p-6">
          <OsTaskForm value={form} onChange={setForm} clients={clients} projects={projects} disabled={saving} />
          <div className="mt-4 flex gap-2">
            <OsPrimaryButton onClick={() => void save()} disabled={saving}>
              Guardar
            </OsPrimaryButton>
            <OsGhostButton onClick={() => setEditing(false)}>Cancelar</OsGhostButton>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-white/70">{task.description || "Sin descripción"}</p>
      )}

      <div className="mt-8 flex gap-2">
        <OsGhostButton href="/os/tareas">← Tareas</OsGhostButton>
        {perms.canDelete ? (
          <button type="button" className="text-sm text-red-400 hover:underline" onClick={() => void remove()}>
            Eliminar
          </button>
        ) : null}
      </div>
    </OsShellLayout>
  );
}
