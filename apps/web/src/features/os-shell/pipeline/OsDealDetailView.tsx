"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/core/api/types";
import { osClientsApi } from "@/features/os-shell/clients/api";
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
import { osProjectsApi } from "@/features/os-shell/projects/api";
import type { OsProject } from "@/features/os-shell/projects/types";

import { osDealsApi } from "./api";
import { dealStatusLabel, dealStatusTone } from "./dealStatus";
import { OsDealForm } from "./OsDealForm";
import type { OsDeal, OsDealWriteInput } from "./types";

export function OsDealDetailView({ dealId }: { dealId: number }) {
  const router = useRouter();
  const perms = useOsPermissions();
  const [deal, setDeal] = useState<OsDeal | null>(null);
  const [clients, setClients] = useState<OsClient[]>([]);
  const [projects, setProjects] = useState<OsProject[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<OsDealWriteInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, cRes, pRes] = await Promise.all([
        osDealsApi.getById(dealId),
        osClientsApi.list({ limit: 500 }),
        osProjectsApi.list({ limit: 500 }),
      ]);
      setDeal(d);
      setForm({
        title: d.title,
        status: d.status,
        client_id: d.client_id ?? null,
        project_id: d.project_id ?? null,
        estimated_value: d.estimated_value ?? null,
        assignee: d.assignee ?? null,
        notes: d.notes ?? null,
      });
      setClients(cRes.items ?? []);
      setProjects(pRes.items ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Oportunidad no encontrada");
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!form || !perms.canEdit) return;
    setSaving(true);
    try {
      const updated = await osDealsApi.update(dealId, form);
      setDeal(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!perms.canDelete || !confirm("¿Eliminar esta oportunidad?")) return;
    try {
      await osDealsApi.delete(dealId);
      router.push("/os/pipeline");
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

  if (!deal || !form) {
    return (
      <OsShellLayout>
        <OsErrorBanner message={error ?? "Sin datos todavía"} />
        <OsGhostButton href="/os/pipeline">Volver</OsGhostButton>
      </OsShellLayout>
    );
  }

  return (
    <OsShellLayout onRefresh={() => void load()} refreshing={loading}>
      <OsPageHeader
        title={deal.title}
        description={`Oportunidad #${deal.id} · os_deals`}
        actions={
          perms.canEdit && !editing ? (
            <OsGhostButton onClick={() => setEditing(true)}>Editar</OsGhostButton>
          ) : null
        }
      />
      {error ? <OsErrorBanner message={error} /> : null}
      <OsStatusBadge label={dealStatusLabel(deal.status)} tone={dealStatusTone(deal.status)} />

      {editing ? (
        <div className="mt-6 max-w-2xl rounded-xl border border-[#0084FF]/30 bg-[#0b1428] p-6">
          <OsDealForm
            value={form}
            onChange={setForm}
            clients={clients}
            projects={projects}
            disabled={saving}
          />
          <div className="mt-4 flex gap-2">
            <OsPrimaryButton onClick={() => void save()} disabled={saving}>
              Guardar
            </OsPrimaryButton>
            <OsGhostButton onClick={() => setEditing(false)}>Cancelar</OsGhostButton>
          </div>
        </div>
      ) : (
        <dl className="mt-6 grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-white/45">Valor</dt>
            <dd className="text-white">
              {deal.estimated_value != null ? `${deal.estimated_value} EUR` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-white/45">Responsable</dt>
            <dd className="text-white">{deal.assignee || "—"}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-white/45">Notas</dt>
            <dd className="text-white/80">{deal.notes || "—"}</dd>
          </div>
        </dl>
      )}

      <div className="mt-8 flex gap-2">
        <OsGhostButton href="/os/pipeline">← Pipeline</OsGhostButton>
        {perms.canDelete ? (
          <button
            type="button"
            className="text-sm text-red-400 hover:underline"
            onClick={() => void remove()}
          >
            Eliminar
          </button>
        ) : null}
      </div>
    </OsShellLayout>
  );
}
