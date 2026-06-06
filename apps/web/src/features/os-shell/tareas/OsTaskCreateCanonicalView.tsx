"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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
} from "@/features/os-shell/components/ui/OsUi";
import { useOsPermissions } from "@/features/os-shell/hooks/useOsPermissions";
import { osProjectsCanonicalApi } from "@/features/os-shell/projects/api";
import type { OsCanonicalProject } from "@/features/os-shell/projects/types";

import { osTasksCanonicalApi } from "./api";
import { emptyOsTaskCanonicalForm, OsTaskCanonicalForm } from "./OsTaskCanonicalForm";
import type { OsTaskCreateInput } from "./types";
import { validateTaskForm } from "./validateTaskForm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function OsTaskCreateCanonicalView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const perms = useOsPermissions();
  const presetClient = searchParams?.get("client_id")?.trim() ?? "";
  const presetProject = searchParams?.get("project_id")?.trim() ?? "";
  const [clients, setClients] = useState<OsClient[]>([]);
  const [projects, setProjects] = useState<OsCanonicalProject[]>([]);
  const [form, setForm] = useState<OsTaskCreateInput>(
    emptyOsTaskCanonicalForm({
      client_id: UUID_RE.test(presetClient) ? presetClient : undefined,
      project_id: UUID_RE.test(presetProject) ? presetProject : undefined,
    }),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      osClientsCanonicalApi.list({ skip: 0, limit: 200, status: "active" }),
      osProjectsCanonicalApi.list({ page: 1, page_size: 200 }),
    ])
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
    const validation = validateTaskForm(form);
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await osTasksCanonicalApi.create({
        ...form,
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        due_date: form.due_date || undefined,
        assignee: form.assignee?.trim() || undefined,
      });
      router.push(`/os/tareas/${created.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al crear");
      setSaving(false);
    }
  };

  return (
    <OsShellLayout>
      <OsPageHeader title="Nueva tarea" description="Alta en os_tasks (API canónica)" />
      {loading ? <OsLoadingBlock label="Cargando pickers…" /> : null}
      {error ? <OsErrorBanner message={error} /> : null}
      {saving ? <OsLoadingBlock label="Creando tarea…" /> : null}
      {!loading && !saving ? (
        <div className="max-w-2xl rounded-xl border border-white/10 bg-[#0b1428] p-6">
          <OsTaskCanonicalForm
            value={form}
            onChange={setForm}
            clients={clients}
            projects={projects}
            disabled={saving}
          />
          <div className="mt-6 flex gap-2">
            <OsPrimaryButton type="button" onClick={() => void submit()} disabled={saving}>
              Crear
            </OsPrimaryButton>
            <OsGhostButton href="/os/tareas">Cancelar</OsGhostButton>
          </div>
        </div>
      ) : null}
    </OsShellLayout>
  );
}
