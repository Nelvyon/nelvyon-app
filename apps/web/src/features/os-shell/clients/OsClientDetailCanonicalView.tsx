"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError } from "@/core/api/types";
import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";
import { OsDeliveriesSection } from "@/features/os-shell/components/OsDeliveriesSection";
import { OsRelatedOpsSection } from "@/features/os-shell/components/OsRelatedOpsSection";
import {
  OsErrorBanner,
  OsGhostButton,
  OsLoadingBlock,
  OsPageHeader,
  OsPrimaryButton,
  OsStatusBadge,
  OsTable,
} from "@/features/os-shell/components/ui/OsUi";
import {
  deliverableStatusLabel,
  deliverableStatusTone,
} from "@/features/os-shell/deliverables/deliverableStatus";
import { useOsPermissions } from "@/features/os-shell/hooks/useOsPermissions";

import { osClientsCanonicalApi } from "./api";
import { fetchLinkedProjects, fetchRecentDeliverables } from "./clientEnrichment";
import { clientStatusLabel, clientStatusTone } from "./clientStatus";
import { computeClientMetrics, deriveClientOperationalLabel } from "./metrics";
import { OsClientForm } from "./OsClientForm";
import type { OsClient, OsClientUpdateInput } from "./types";
import type { OsDeliverable } from "@/features/os-shell/deliverables/types";

export function OsClientDetailCanonicalView({ clientId }: { clientId: string }) {
  const router = useRouter();
  const perms = useOsPermissions();
  const [client, setClient] = useState<OsClient | null>(null);
  const [projects, setProjects] = useState<Awaited<ReturnType<typeof fetchLinkedProjects>>>([]);
  const [deliverables, setDeliverables] = useState<OsDeliverable[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<OsClientUpdateInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const c = await osClientsCanonicalApi.getById(clientId);
      setClient(c);
      setForm({
        business_name: c.business_name,
        sector: c.sector ?? "",
        status: c.status,
        country: c.country ?? "",
        city: c.city ?? "",
        contact_name: c.contact_name ?? "",
        contact_email: c.contact_email ?? "",
        website_url: c.website_url ?? "",
        value_proposition: c.value_proposition ?? "",
        objectives: c.objectives ?? "",
        services: c.services ?? "",
        market: c.market ?? "",
        language: c.language ?? "es",
      });
      const [projs, dels] = await Promise.all([
        fetchLinkedProjects(clientId),
        fetchRecentDeliverables(clientId),
      ]);
      setProjects(projs);
      setDeliverables(dels);
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
    if (!form || !client || !perms.canEdit) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await osClientsCanonicalApi.update(client.id, form);
      setClient(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (!client || !perms.canDelete) return;
    if (!confirm("¿Archivar este cliente? (soft delete — status=archived)")) return;
    try {
      await osClientsCanonicalApi.archive(client.id);
      router.push("/os/clientes");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo archivar");
    }
  };

  if (loading) {
    return (
      <OsShellLayout>
        <OsLoadingBlock label="Cargando cliente…" />
      </OsShellLayout>
    );
  }

  if (!client) {
    return (
      <OsShellLayout>
        <OsErrorBanner message={error ?? "Sin datos"} />
        <OsGhostButton href="/os/clientes">Volver</OsGhostButton>
      </OsShellLayout>
    );
  }

  const metrics = computeClientMetrics(projects, deliverables.length);
  const op = deriveClientOperationalLabel(projects);
  const legacyId = client.legacy_nelvyon_client_id ?? undefined;

  return (
    <OsShellLayout onRefresh={() => void load()} refreshing={loading}>
      <OsPageHeader
        title={client.business_name}
        description={`${client.id.slice(0, 8)}… · ${client.sector || "Sin sector"}`}
        actions={
          <>
            {perms.canEdit && !editing && client.status === "active" ? (
              <OsGhostButton type="button" onClick={() => setEditing(true)}>
                Editar
              </OsGhostButton>
            ) : null}
            {perms.canCreate ? (
              <>
                {legacyId ? (
                  <>
                    <OsGhostButton href={`/os/pipeline/nuevo?client_id=${legacyId}`}>Nueva oportunidad</OsGhostButton>
                    <OsGhostButton href={`/os/tareas/nuevo?client_id=${legacyId}`}>Nueva tarea</OsGhostButton>
                    <OsPrimaryButton href={`/os/proyectos/nuevo?client_id=${legacyId}`}>Nuevo proyecto</OsPrimaryButton>
                  </>
                ) : (
                  <OsGhostButton href={`/os/entregables/nuevo?client_id=${client.id}`}>Nuevo entregable</OsGhostButton>
                )}
              </>
            ) : null}
          </>
        }
      />

      {error ? <OsErrorBanner message={error} /> : null}

      <div className="mb-6 flex flex-wrap gap-2">
        <OsStatusBadge label={clientStatusLabel(client.status)} tone={clientStatusTone(client.status)} />
        <OsStatusBadge label={op.label} tone={op.tone} />
      </div>

      {editing && form ? (
        <div className="mb-8 rounded-xl border border-[#0084FF]/30 bg-[#0b1428] p-6">
          <OsClientForm value={form} onChange={setForm} disabled={saving} showStatus />
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
            <dt className="text-white/45">Contacto</dt>
            <dd className="text-white">{client.contact_name || "—"}</dd>
          </div>
          <div>
            <dt className="text-white/45">Email</dt>
            <dd className="text-white">{client.contact_email || "—"}</dd>
          </div>
          <div>
            <dt className="text-white/45">Web</dt>
            <dd className="text-white">{client.website_url || "—"}</dd>
          </div>
          <div>
            <dt className="text-white/45">Ubicación</dt>
            <dd className="text-white">{[client.city, client.country].filter(Boolean).join(", ") || "—"}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-white/45">Propuesta de valor</dt>
            <dd className="text-white/80">{client.value_proposition || "—"}</dd>
          </div>
        </dl>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#0b1428] p-4">
          <p className="text-xs text-white/45">Proyectos (os_projects)</p>
          <p className="mt-1 text-xl font-semibold text-white">{metrics.projectsTotal}</p>
          <p className="text-xs text-white/40">{metrics.projectsActive} activos</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0b1428] p-4">
          <p className="text-xs text-white/45">Entregables recientes</p>
          <p className="mt-1 text-xl font-semibold text-white">{metrics.deliverablesTotal}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0b1428] p-4">
          <p className="text-xs text-white/45">Legacy ID</p>
          <p className="mt-1 text-sm text-white/70">{legacyId ?? "—"}</p>
        </div>
      </div>

      {legacyId ? (
        <div className="mb-10">
          <OsRelatedOpsSection clientId={legacyId} />
        </div>
      ) : null}

      {legacyId ? (
        <div className="mb-10">
          <OsDeliveriesSection clientId={legacyId} />
        </div>
      ) : (
        <section className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Entregables recientes</h2>
            <OsGhostButton href={`/os/entregables?client_id=${client.id}`}>Ver todos →</OsGhostButton>
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
      )}

      <h2 className="mb-3 text-lg font-semibold text-white">Proyectos vinculados</h2>
      {projects.length === 0 ? (
        <p className="text-sm text-white/40">Sin proyectos en os_projects para este cliente.</p>
      ) : (
        <OsTable>
          <thead>
            <tr className="border-b border-white/10 text-xs text-white/45">
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-white/5">
                <td className="px-4 py-2 text-white">{p.name}</td>
                <td className="px-4 py-2">
                  <OsStatusBadge label={p.status || "—"} tone="neutral" />
                </td>
                <td className="px-4 py-2 text-right text-white/40 text-xs">{p.id.slice(0, 8)}…</td>
              </tr>
            ))}
          </tbody>
        </OsTable>
      )}

      <div className="mt-8 flex gap-2">
        <OsGhostButton href="/os/clientes">← Listado</OsGhostButton>
        {perms.canDelete && client.status === "active" ? (
          <button type="button" className="text-sm text-red-400 hover:underline" onClick={() => void archive()}>
            Archivar cliente
          </button>
        ) : null}
      </div>
    </OsShellLayout>
  );
}
