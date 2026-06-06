"use client";

import { useCallback, useEffect, useState } from "react";

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
import { osDeliverablesApi } from "@/features/os-shell/deliverables/api";
import {
  fetchCanonicalClients,
  fetchCanonicalProjects,
} from "@/features/os-shell/deliverables/canonicalPickers";
import {
  deliverableStatusLabel,
  deliverableStatusTone,
} from "@/features/os-shell/deliverables/deliverableStatus";
import { OsDeliverableForm } from "@/features/os-shell/deliverables/OsDeliverableForm";
import { OsDeliverableWorkflowActions } from "@/features/os-shell/deliverables/OsDeliverableWorkflowActions";
import type {
  OsCanonicalClient,
  OsCanonicalProject,
  OsDeliverable,
  OsDeliverableClientReview,
  OsDeliverableUpdateInput,
  OsDeliverableVersion,
} from "@/features/os-shell/deliverables/types";

export function OsDeliverableDetailView({ deliverableId }: { deliverableId: string }) {
  const perms = useOsPermissions();
  const [row, setRow] = useState<OsDeliverable | null>(null);
  const [versions, setVersions] = useState<OsDeliverableVersion[]>([]);
  const [reviews, setReviews] = useState<OsDeliverableClientReview[]>([]);
  const [clients, setClients] = useState<OsCanonicalClient[]>([]);
  const [projects, setProjects] = useState<OsCanonicalProject[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<OsDeliverableUpdateInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, ver, rev, cList] = await Promise.all([
        osDeliverablesApi.getById(deliverableId),
        osDeliverablesApi.listVersions(deliverableId),
        osDeliverablesApi.listClientReviews(deliverableId),
        fetchCanonicalClients(),
      ]);
      setRow(d);
      setForm({
        client_id: d.client_id,
        project_id: d.project_id,
        title: d.title,
        description: d.description ?? "",
        type: d.type ?? "",
        visibility: d.visibility,
        file_url: d.file_url ?? "",
        review_notes: d.review_notes ?? "",
      });
      setVersions(ver.items ?? []);
      setReviews((rev.items ?? []) as OsDeliverableClientReview[]);
      setClients(cList);
      setProjects(await fetchCanonicalProjects(d.client_id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Entregable no encontrado");
    } finally {
      setLoading(false);
    }
  }, [deliverableId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!form || !row || !perms.canEdit) return;
    setSaving(true);
    try {
      const updated = await osDeliverablesApi.update(row.id, form);
      setRow(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const onWorkflowUpdated = (updated: OsDeliverable) => {
    setRow(updated);
    void load();
  };

  if (loading) {
    return (
      <OsShellLayout>
        <OsLoadingBlock label="Cargando entregable…" />
      </OsShellLayout>
    );
  }

  if (!row) {
    return (
      <OsShellLayout>
        <OsErrorBanner message={error ?? "No encontrado"} />
        <OsGhostButton href="/os/entregables">← Volver</OsGhostButton>
      </OsShellLayout>
    );
  }

  const clientFeedback = row.metadata?.client_feedback as string | undefined;

  return (
    <OsShellLayout onRefresh={() => void load()} refreshing={loading}>
      <OsPageHeader
        title={row.title}
        description={`ID ${row.id} · v${row.version}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <OsGhostButton href="/os/entregables">← Lista</OsGhostButton>
            {perms.canEdit && row.status === "draft" ? (
              <OsPrimaryButton type="button" onClick={() => setEditing((v) => !v)}>
                {editing ? "Cancelar edición" : "Editar"}
              </OsPrimaryButton>
            ) : null}
          </div>
        }
      />

      {error ? <OsErrorBanner message={error} /> : null}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <OsStatusBadge label={deliverableStatusLabel(row.status)} tone={deliverableStatusTone(row.status)} />
        <span className="text-sm text-white/50">Visibilidad: {row.visibility}</span>
        {row.published_at ? (
          <span className="text-sm text-white/50">Publicado {new Date(row.published_at).toLocaleString()}</span>
        ) : null}
      </div>

      {editing && form ? (
        <div className="mb-8 space-y-4">
          <OsDeliverableForm value={form} onChange={setForm} clients={clients} projects={projects} />
          <OsPrimaryButton type="button" disabled={saving} onClick={() => void save()}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </OsPrimaryButton>
        </div>
      ) : (
        <dl className="mb-8 grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-white/45">Descripción</dt>
            <dd className="text-white/80">{row.description || "—"}</dd>
          </div>
          <div>
            <dt className="text-white/45">Archivo</dt>
            <dd>
              {row.file_url ? (
                <a href={row.file_url} className="text-[#0084FF] hover:underline" target="_blank" rel="noreferrer">
                  Abrir
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          {row.review_notes ? (
            <div className="md:col-span-2">
              <dt className="text-white/45">Notas internas</dt>
              <dd className="text-white/80">{row.review_notes}</dd>
            </div>
          ) : null}
          {clientFeedback ? (
            <div className="md:col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <dt className="text-amber-200">Feedback cliente</dt>
              <dd className="mt-1 text-white/90">{clientFeedback}</dd>
            </div>
          ) : null}
        </dl>
      )}

      {perms.canEdit ? (
        <OsDeliverableWorkflowActions deliverable={row} onUpdated={onWorkflowUpdated} disabled={editing} />
      ) : null}

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-white">Historial de versiones</h2>
        {versions.length === 0 ? (
          <p className="text-sm text-white/40">Sin snapshots (se crean al usar «Crear revisión»).</p>
        ) : (
          <OsTable>
            <thead>
              <tr className="border-b border-white/10 text-xs text-white/45">
                <th className="px-4 py-2">Ver.</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Archivo</th>
                <th className="px-4 py-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className="border-b border-white/5">
                  <td className="px-4 py-2">v{v.version}</td>
                  <td className="px-4 py-2">{deliverableStatusLabel(v.status)}</td>
                  <td className="px-4 py-2 text-white/55">{v.file_url ? "Sí" : "—"}</td>
                  <td className="px-4 py-2 text-white/50">
                    {v.created_at ? new Date(v.created_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </OsTable>
        )}
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-white">Revisiones cliente (portal)</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-white/40">Sin revisiones portal registradas.</p>
        ) : (
          <OsTable>
            <thead>
              <tr className="border-b border-white/10 text-xs text-white/45">
                <th className="px-4 py-2">Decisión</th>
                <th className="px-4 py-2">Feedback</th>
                <th className="px-4 py-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} className="border-b border-white/5">
                  <td className="px-4 py-2 capitalize">{r.decision}</td>
                  <td className="px-4 py-2 text-white/80">{r.feedback || "—"}</td>
                  <td className="px-4 py-2 text-white/50">
                    {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </OsTable>
        )}
      </section>
    </OsShellLayout>
  );
}
