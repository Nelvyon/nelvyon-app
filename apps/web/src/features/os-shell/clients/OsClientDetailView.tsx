"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError } from "@/core/api/types";
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
import { osProjectsApi } from "@/features/os-shell/projects/api";
import type { OsProject } from "@/features/os-shell/projects/types";

import { OsRelatedOpsSection } from "@/features/os-shell/components/OsRelatedOpsSection";

import { osClientsApi } from "./api";
import { computeClientMetrics, deriveClientOperationalLabel } from "./metrics";
import { OsClientForm } from "./OsClientForm";
import type { OsClient, OsClientWriteInput } from "./types";

export function OsClientDetailView({ clientId }: { clientId: number }) {
  const router = useRouter();
  const perms = useOsPermissions();
  const [client, setClient] = useState<OsClient | null>(null);
  const [projects, setProjects] = useState<OsProject[]>([]);
  const [outputsCount, setOutputsCount] = useState(0);
  const [campaignsCount, setCampaignsCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<OsClientWriteInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const c = await osClientsApi.getById(clientId);
      setClient(c);
      setForm({
        business_name: c.business_name,
        sector: c.sector,
        country: c.country ?? "",
        city: c.city ?? "",
        website_url: c.website_url ?? "",
        value_proposition: c.value_proposition ?? "",
        objectives: c.objectives ?? "",
        market: c.market ?? "",
        language: c.language ?? "",
      });
      const pRes = await osProjectsApi.list({ query: { client_id: clientId }, limit: 100 });
      const projs = pRes.items ?? [];
      setProjects(projs);
      let outN = 0;
      let campN = 0;
      for (const p of projs.slice(0, 20)) {
        const [o, camp] = await Promise.allSettled([
          osProjectsApi.listOutputsForProject(p.id, 100),
          osProjectsApi.listCampaignsForProject(p.id, 100),
        ]);
        if (o.status === "fulfilled") outN += o.value.total ?? o.value.items?.length ?? 0;
        if (camp.status === "fulfilled") campN += camp.value.total ?? camp.value.items?.length ?? 0;
      }
      setOutputsCount(outN);
      setCampaignsCount(campN);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Cliente no encontrado");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!form || !perms.canEdit) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await osClientsApi.update(clientId, form);
      setClient(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!perms.canDelete || !confirm("¿Eliminar este cliente? Los proyectos vinculados pueden quedar huérfanos.")) {
      return;
    }
    try {
      await osClientsApi.delete(clientId);
      router.push("/os/clientes");
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

  if (!client) {
    return (
      <OsShellLayout>
        <OsErrorBanner message={error ?? "Sin datos todavía"} />
        <OsGhostButton href="/os/clientes">Volver</OsGhostButton>
      </OsShellLayout>
    );
  }

  const metrics = computeClientMetrics(projects, outputsCount, campaignsCount);
  const op = deriveClientOperationalLabel(projects);

  return (
    <OsShellLayout onRefresh={() => void load()} refreshing={loading}>
      <OsPageHeader
        title={client.business_name}
        description={`ID ${client.id} · ${client.sector}`}
        actions={
          <>
            {perms.canEdit && !editing ? (
              <OsGhostButton onClick={() => setEditing(true)}>Editar</OsGhostButton>
            ) : null}
            {perms.canCreate ? (
              <>
                <OsGhostButton href={`/os/pipeline/nuevo?client_id=${client.id}`}>
                  Nueva oportunidad
                </OsGhostButton>
                <OsGhostButton href={`/os/tareas/nuevo?client_id=${client.id}`}>
                  Nueva tarea
                </OsGhostButton>
                <OsPrimaryButton href={`/os/proyectos/nuevo?client_id=${client.id}`}>
                  Nuevo proyecto
                </OsPrimaryButton>
              </>
            ) : null}
          </>
        }
      />
      {error ? <OsErrorBanner message={error} /> : null}
      <div className="mb-6">
        <OsStatusBadge label={op.label} tone={op.tone} />
      </div>

      {editing && form ? (
        <div className="mb-8 rounded-xl border border-[#0084FF]/30 bg-[#0b1428] p-6">
          <OsClientForm value={form} onChange={setForm} disabled={saving} />
          <div className="mt-4 flex gap-2">
            <OsPrimaryButton onClick={() => void save()} disabled={saving}>
              Guardar
            </OsPrimaryButton>
            <OsGhostButton onClick={() => setEditing(false)}>Cancelar</OsGhostButton>
          </div>
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-[#0b1428] p-4">
          <p className="text-xs text-white/45">Proyectos</p>
          <p className="mt-1 text-xl font-semibold text-white">{metrics.projectsTotal}</p>
          <p className="text-xs text-white/40">{metrics.projectsActive} activos</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0b1428] p-4">
          <p className="text-xs text-white/45">Entregas (muestra)</p>
          <p className="mt-1 text-xl font-semibold text-white">
            {outputsCount > 0 ? outputsCount : "Sin datos todavía"}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0b1428] p-4">
          <p className="text-xs text-white/45">Campañas (muestra)</p>
          <p className="mt-1 text-xl font-semibold text-white">
            {campaignsCount > 0 ? campaignsCount : "Sin datos todavía"}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0b1428] p-4">
          <p className="text-xs text-white/45">Notas</p>
          <p className="mt-1 text-sm text-white/70 line-clamp-3">
            {client.objectives?.trim() || "Sin datos todavía"}
          </p>
        </div>
      </div>

      {!editing ? (
        <dl className="mb-8 grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-white/45">Web</dt>
            <dd className="text-white">{client.website_url || "—"}</dd>
          </div>
          <div>
            <dt className="text-white/45">Ubicación</dt>
            <dd className="text-white">
              {[client.city, client.country].filter(Boolean).join(", ") || "—"}
            </dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-white/45">Propuesta de valor</dt>
            <dd className="text-white/80">{client.value_proposition || "—"}</dd>
          </div>
        </dl>
      ) : null}

      <div className="mb-10">
        <OsRelatedOpsSection clientId={clientId} />
      </div>

      <h2 className="mb-3 text-lg font-semibold text-white">Proyectos vinculados</h2>
      {projects.length === 0 ? (
        <p className="text-sm text-white/40">Sin datos todavía</p>
      ) : (
        <OsTable>
          <thead>
            <tr className="border-b border-white/10 text-xs text-white/45">
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-white/5">
                <td className="px-4 py-2 text-white">{p.name}</td>
                <td className="px-4 py-2 text-white/60">{p.project_type}</td>
                <td className="px-4 py-2">
                  <OsStatusBadge label={p.status || "—"} tone="neutral" />
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/os/proyectos/${p.id}`} className="text-[#0084FF] hover:underline">
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </OsTable>
      )}

      <div className="mt-8 flex gap-2">
        <OsGhostButton href="/os/clientes">← Listado</OsGhostButton>
        {perms.canDelete ? (
          <button
            type="button"
            className="text-sm text-red-400 hover:underline"
            onClick={() => void remove()}
          >
            Eliminar cliente
          </button>
        ) : null}
      </div>
    </OsShellLayout>
  );
}
