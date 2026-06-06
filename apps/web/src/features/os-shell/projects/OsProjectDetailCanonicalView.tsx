"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError } from "@/core/api/types";
import { osClientsCanonicalApi } from "@/features/os-shell/clients/api";
import type { OsClient } from "@/features/os-shell/clients/types";
import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";
import {
  deliverableStatusLabel,
  deliverableStatusTone,
} from "@/features/os-shell/deliverables/deliverableStatus";
import {
  OsErrorBanner,
  OsGhostButton,
  OsLoadingBlock,
  OsPageHeader,
  OsPrimaryButton,
  OsStatusBadge,
  OsTable,
} from "@/features/os-shell/components/ui/OsUi";
import { useOsPermissions } from "@/features/os-shell/hooks/useOsPermissions";

import { osProjectsCanonicalApi } from "./api";
import { fetchLinkedDeliverables, fetchLinkedTasks, legacyProjectIdFromMetadata } from "./projectEnrichment";
import { emptyOsProjectCanonicalForm, OsProjectCanonicalForm } from "./OsProjectCanonicalForm";
import { projectPriorityLabel, projectPriorityTone, projectStatusLabel, projectStatusTone } from "./projectStatus";
import type { OsCanonicalProject, OsProjectLinkedTask, OsProjectUpdateInput } from "./types";
import type { OsDeliverable } from "@/features/os-shell/deliverables/types";

export function OsProjectDetailCanonicalView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const perms = useOsPermissions();
  const [project, setProject] = useState<OsCanonicalProject | null>(null);
  const [client, setClient] = useState<OsClient | null>(null);
  const [clients, setClients] = useState<OsClient[]>([]);
  const [tasks, setTasks] = useState<OsProjectLinkedTask[]>([]);
  const [deliverables, setDeliverables] = useState<OsDeliverable[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<OsProjectUpdateInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await osProjectsCanonicalApi.getById(projectId);
      setProject(p);
      setForm({
        client_id: p.client_id,
        name: p.name,
        description: p.description ?? "",
        status: p.status,
        priority: p.priority,
        start_date: p.start_date ?? "",
        due_date: p.due_date ?? "",
        budget: p.budget ?? "",
      });
      const [cList, cOne, linkedTasks, linkedDels] = await Promise.all([
        osClientsCanonicalApi.list({ skip: 0, limit: 200, status: "active" }),
        osClientsCanonicalApi.getById(p.client_id).catch(() => null),
        fetchLinkedTasks(projectId),
        fetchLinkedDeliverables(projectId),
      ]);
      setClients(cList.items ?? []);
      setClient(cOne);
      setTasks(linkedTasks);
      setDeliverables(linkedDels);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Proyecto no encontrado");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!form || !project || !perms.canEdit) return;
    setSaving(true);
    setError(null);
    try {
      const body: OsProjectUpdateInput = {
        ...form,
        name: form.name?.trim(),
        description: form.description?.trim() || undefined,
        start_date: form.start_date || undefined,
        due_date: form.due_date || undefined,
        budget: form.budget === "" || form.budget == null ? undefined : Number(form.budget),
      };
      const updated = await osProjectsCanonicalApi.update(project.id, body);
      setProject(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (!project || !perms.canDelete) return;
    if (!confirm("¿Archivar este proyecto? (soft delete — status=archived)")) return;
    try {
      await osProjectsCanonicalApi.archive(project.id);
      router.push("/os/proyectos");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo archivar");
    }
  };

  if (loading) {
    return (
      <OsShellLayout>
        <OsLoadingBlock label="Cargando proyecto…" />
      </OsShellLayout>
    );
  }

  if (!project) {
    return (
      <OsShellLayout>
        <OsErrorBanner message={error ?? "Sin datos"} />
        <OsGhostButton href="/os/proyectos">Volver</OsGhostButton>
      </OsShellLayout>
    );
  }

  const legacyProjectId = legacyProjectIdFromMetadata(project.metadata);
  const legacyClientId = client?.legacy_nelvyon_client_id ?? undefined;

  return (
    <OsShellLayout onRefresh={() => void load()} refreshing={loading}>
      <OsPageHeader
        title={project.name}
        description={`${project.id.slice(0, 8)}… · ${client?.business_name ?? "Cliente OS"}`}
        actions={
          <>
            {perms.canCreate ? (
              <>
                {legacyProjectId && legacyClientId ? (
                  <>
                    <OsGhostButton
                      href={`/os/pipeline/nuevo?project_id=${legacyProjectId}&client_id=${legacyClientId}`}
                    >
                      Nueva oportunidad
                    </OsGhostButton>
                    <OsGhostButton
                      href={`/os/tareas/nuevo?project_id=${legacyProjectId}&client_id=${legacyClientId}`}
                    >
                      Nueva tarea
                    </OsGhostButton>
                  </>
                ) : (
                  <OsPrimaryButton href={`/os/entregables/nuevo?project_id=${project.id}&client_id=${project.client_id}`}>
                    Nuevo entregable
                  </OsPrimaryButton>
                )}
              </>
            ) : null}
            {perms.canEdit && !editing && project.status !== "archived" ? (
              <OsGhostButton type="button" onClick={() => setEditing(true)}>
                Editar
              </OsGhostButton>
            ) : null}
          </>
        }
      />

      {error ? <OsErrorBanner message={error} /> : null}

      <div className="mb-6 flex flex-wrap gap-2">
        <OsStatusBadge label={projectStatusLabel(project.status)} tone={projectStatusTone(project.status)} />
        <OsStatusBadge
          label={projectPriorityLabel(project.priority)}
          tone={projectPriorityTone(project.priority)}
        />
        {client ? (
          <Link href={`/os/clientes/${client.id}`} className="text-sm text-[#0084FF] hover:underline">
            Ver cliente
          </Link>
        ) : null}
      </div>

      {editing && form ? (
        <div className="mb-8 rounded-xl border border-[#0084FF]/30 bg-[#0b1428] p-6">
          <OsProjectCanonicalForm
            value={{ ...emptyOsProjectCanonicalForm(), ...form, name: form.name ?? "" }}
            onChange={setForm}
            clients={clients}
            disabled={saving}
          />
          <div className="mt-4 flex gap-2">
            <OsPrimaryButton type="button" onClick={() => void save()} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </OsPrimaryButton>
            <OsGhostButton type="button" onClick={() => setEditing(false)}>
              Cancelar
            </OsGhostButton>
          </div>
        </div>
      ) : (
        <dl className="mb-8 grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-white/45">Descripción</dt>
            <dd className="text-white/80">{project.description || "—"}</dd>
          </div>
          <div>
            <dt className="text-white/45">Presupuesto</dt>
            <dd className="text-white">{project.budget != null ? String(project.budget) : "—"}</dd>
          </div>
          <div>
            <dt className="text-white/45">Fecha inicio</dt>
            <dd className="text-white">{project.start_date || "—"}</dd>
          </div>
          <div>
            <dt className="text-white/45">Fecha límite</dt>
            <dd className="text-white">{project.due_date || "—"}</dd>
          </div>
          <div>
            <dt className="text-white/45">Legacy project ID</dt>
            <dd className="text-white/70">{legacyProjectId ?? "—"}</dd>
          </div>
        </dl>
      )}

      <h2 className="mb-3 text-lg font-semibold text-white">Tareas vinculadas (os_tasks)</h2>
      {tasks.length === 0 ? (
        <p className="mb-8 text-sm text-white/40">Sin tareas canónicas para este proyecto.</p>
      ) : (
        <OsTable>
          <thead>
            <tr className="border-b border-white/10 text-xs text-white/45">
              <th className="px-4 py-2">Título</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Prioridad</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-b border-white/5">
                <td className="px-4 py-2 text-white">{t.title}</td>
                <td className="px-4 py-2">
                  <OsStatusBadge label={t.status} tone="neutral" />
                </td>
                <td className="px-4 py-2 text-white/55">{t.priority ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </OsTable>
      )}

      <section className="mb-10 mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Entregables vinculados (os_deliverables)</h2>
          <OsGhostButton href={`/os/entregables?project_id=${project.id}`}>Ver todos →</OsGhostButton>
        </div>
        {deliverables.length === 0 ? (
          <p className="text-sm text-white/40">Sin entregables canónicos.</p>
        ) : (
          <OsTable>
            <thead>
              <tr className="border-b border-white/10 text-xs text-white/45">
                <th className="px-4 py-2">Título</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {deliverables.map((d) => (
                <tr key={d.id} className="border-b border-white/5">
                  <td className="px-4 py-2 text-white">{d.title}</td>
                  <td className="px-4 py-2">
                    <OsStatusBadge
                      label={deliverableStatusLabel(d.status)}
                      tone={deliverableStatusTone(d.status)}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/os/entregables/${d.id}`} className="text-[#0084FF] hover:underline">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </OsTable>
        )}
      </section>

      <div className="mt-8 flex gap-2">
        <OsGhostButton href="/os/proyectos">← Listado</OsGhostButton>
        {perms.canDelete && project.status !== "archived" ? (
          <button type="button" className="text-sm text-red-400 hover:underline" onClick={() => void archive()}>
            Archivar proyecto
          </button>
        ) : null}
      </div>
    </OsShellLayout>
  );
}
