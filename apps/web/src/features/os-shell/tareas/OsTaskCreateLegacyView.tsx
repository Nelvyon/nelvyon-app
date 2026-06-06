"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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
} from "@/features/os-shell/components/ui/OsUi";
import { useOsPermissions } from "@/features/os-shell/hooks/useOsPermissions";
import { osProjectsLegacyApi } from "@/features/os-shell/projects/legacyApi";
import type { OsLegacyProject } from "@/features/os-shell/projects/types";

import { osTasksLegacyApi } from "./legacyApi";
import { emptyOsTaskForm, OsTaskForm } from "./OsTaskForm";
import type { OsLegacyTaskWriteInput } from "./types";

export function OsTaskCreateLegacyView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const perms = useOsPermissions();
  const presetClient = Number(searchParams?.get("client_id") || 0);
  const presetProject = Number(searchParams?.get("project_id") || 0);
  const [clients, setClients] = useState<OsLegacyClient[]>([]);
  const [projects, setProjects] = useState<OsLegacyProject[]>([]);
  const [form, setForm] = useState<OsLegacyTaskWriteInput>(
    emptyOsTaskForm({
      client_id: presetClient > 0 ? presetClient : undefined,
      project_id: presetProject > 0 ? presetProject : undefined,
    }),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([osClientsLegacyApi.list({ limit: 500 }), osProjectsLegacyApi.list({ limit: 500 })])
      .then(([c, p]) => {
        setClients(c.items ?? []);
        setProjects(p.items ?? []);
      })
      .catch(() => setError("No se pudieron cargar clientes/proyectos"))
      .finally(() => setLoading(false));
  }, []);

  if (!perms.canCreate) {
    return (
      <OsShellLayout>
        <OsErrorBanner message="Tu rol no puede crear tareas (operator+)." />
      </OsShellLayout>
    );
  }

  const submit = async () => {
    if (!form.title.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await osTasksLegacyApi.create({ ...form, title: form.title.trim() });
      router.push(`/os/tareas/${created.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al crear");
      setSaving(false);
    }
  };

  return (
    <OsShellLayout>
      <OsPageHeader title="Nueva tarea" description="Alta en entities/os_tasks (legacy)" />
      {loading ? <OsLoadingBlock /> : null}
      {error ? <OsErrorBanner message={error} /> : null}
      {!loading ? (
        <div className="max-w-2xl rounded-xl border border-white/10 bg-[#0b1428] p-6">
          <OsTaskForm value={form} onChange={setForm} clients={clients} projects={projects} disabled={saving} />
          <div className="mt-6 flex gap-2">
            <OsPrimaryButton onClick={() => void submit()} disabled={saving}>
              Crear
            </OsPrimaryButton>
            <OsGhostButton href="/os/tareas">Cancelar</OsGhostButton>
          </div>
        </div>
      ) : null}
    </OsShellLayout>
  );
}
