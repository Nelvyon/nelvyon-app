"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError } from "@/core/api/types";
import { osClientsLegacyApi } from "@/features/os-shell/clients/legacyApi";
import type { OsLegacyClient } from "@/features/os-shell/clients/types";
import { OsDeliveriesSection } from "@/features/os-shell/components/OsDeliveriesSection";
import { OsRelatedOpsSection } from "@/features/os-shell/components/OsRelatedOpsSection";
import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";
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

import { osProjectsLegacyApi } from "./legacyApi";
import { OsProjectForm } from "./OsProjectForm";
import type { OsCampaign, OsLegacyProject, OsLegacyProjectWriteInput } from "./types";

/** Legacy fallback detail (nelvyon_projects). */
export function OsProjectDetailLegacyView({ projectId }: { projectId: number }) {
  const router = useRouter();
  const perms = useOsPermissions();
  const [project, setProject] = useState<OsLegacyProject | null>(null);
  const [client, setClient] = useState<OsLegacyClient | null>(null);
  const [clients, setClients] = useState<OsLegacyClient[]>([]);
  const [campaigns, setCampaigns] = useState<OsCampaign[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<OsLegacyProjectWriteInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await osProjectsLegacyApi.getById(projectId);
      setProject(p);
      setForm({
        client_id: p.client_id,
        name: p.name,
        project_type: p.project_type,
        status: p.status ?? "draft",
        progress: p.progress ?? 0,
        brief: p.brief ?? "",
        deadline: p.deadline ?? "",
        priority: p.priority ?? "",
      });
      const [cList, cOne, camp] = await Promise.all([
        osClientsLegacyApi.list({ limit: 500 }),
        osClientsLegacyApi.getById(p.client_id).catch(() => null),
        osProjectsLegacyApi.listCampaignsForProject(projectId),
      ]);
      setClients(cList.items ?? []);
      setClient(cOne);
      setCampaigns(camp.items ?? []);
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
    if (!form || !perms.canEdit) return;
    setSaving(true);
    try {
      const updated = await osProjectsLegacyApi.update(projectId, form);
      setProject(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!perms.canDelete || !confirm("¿Eliminar este proyecto?")) return;
    try {
      await osProjectsLegacyApi.delete(projectId);
      router.push("/os/proyectos");
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

  if (!project) {
    return (
      <OsShellLayout>
        <OsErrorBanner message={error ?? "Sin datos todavía"} />
        <OsGhostButton href="/os/proyectos">Volver</OsGhostButton>
      </OsShellLayout>
    );
  }

  return (
    <OsShellLayout onRefresh={() => void load()} refreshing={loading}>
      <OsPageHeader
        title={project.name}
        description={
          client
            ? `${client.business_name} · ${project.project_type}`
            : `Cliente #${project.client_id}`
        }
        actions={
          <>
            {perms.canCreate ? (
              <>
                <OsGhostButton
                  href={`/os/pipeline/nuevo?project_id=${projectId}&client_id=${project.client_id}`}
                >
                  Nueva oportunidad
                </OsGhostButton>
                <OsGhostButton
                  href={`/os/tareas/nuevo?project_id=${projectId}&client_id=${project.client_id}`}
                >
                  Nueva tarea
                </OsGhostButton>
              </>
            ) : null}
            {perms.canEdit && !editing ? (
              <OsGhostButton onClick={() => setEditing(true)}>Editar</OsGhostButton>
            ) : null}
          </>
        }
      />
      {error ? <OsErrorBanner message={error} /> : null}
      <div className="mb-4 flex flex-wrap gap-2">
        <OsStatusBadge label={project.status || "sin estado"} tone="info" />
        {client ? (
          <Link href={`/os/clientes/${client.id}`} className="text-sm text-[#0084FF] hover:underline">
            Ver cliente
          </Link>
        ) : null}
      </div>

      {editing && form ? (
        <div className="mb-8 rounded-xl border border-[#0084FF]/30 bg-[#0b1428] p-6">
          <OsProjectForm value={form} onChange={setForm} clients={clients} disabled={saving} />
          <div className="mt-4 flex gap-2">
            <OsPrimaryButton onClick={() => void save()} disabled={saving}>
              Guardar
            </OsPrimaryButton>
            <OsGhostButton onClick={() => setEditing(false)}>Cancelar</OsGhostButton>
          </div>
        </div>
      ) : null}

      {!editing ? (
        <p className="mb-6 text-sm text-white/60">{project.brief || "Sin brief"}</p>
      ) : null}

      <div className="mb-10">
        <OsRelatedOpsSection clientId={project.client_id} projectId={projectId} />
      </div>

      <div className="mb-8">
        <OsDeliveriesSection clientId={project.client_id} projectId={projectId} />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-white">Campañas (nelvyon_campaigns)</h2>
      {campaigns.length === 0 ? (
        <p className="text-sm text-white/40">Sin datos todavía</p>
      ) : (
        <OsTable>
          <thead>
            <tr className="border-b border-white/10 text-xs text-white/45">
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Plataforma</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b border-white/5">
                <td className="px-4 py-2 text-white">{c.name || c.campaign_type}</td>
                <td className="px-4 py-2 text-white/55">{c.platform}</td>
                <td className="px-4 py-2">
                  <OsStatusBadge label={c.status || "—"} tone="neutral" />
                </td>
              </tr>
            ))}
          </tbody>
        </OsTable>
      )}

      <div className="mt-8 flex gap-2">
        <OsGhostButton href="/os/proyectos">← Listado</OsGhostButton>
        {perms.canDelete ? (
          <button type="button" className="text-sm text-red-400 hover:underline" onClick={() => void remove()}>
            Eliminar proyecto
          </button>
        ) : null}
      </div>
    </OsShellLayout>
  );
}
