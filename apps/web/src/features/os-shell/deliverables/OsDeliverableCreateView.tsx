"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { ApiError } from "@/core/api/types";
import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";
import {
  OsErrorBanner,
  OsGhostButton,
  OsLoadingBlock,
  OsPageHeader,
  OsPrimaryButton,
} from "@/features/os-shell/components/ui/OsUi";
import { useOsPermissions } from "@/features/os-shell/hooks/useOsPermissions";
import { osDeliverablesApi } from "@/features/os-shell/deliverables/api";
import {
  fetchCanonicalClients,
  fetchCanonicalProjects,
} from "@/features/os-shell/deliverables/canonicalPickers";
import { emptyDeliverableForm, OsDeliverableForm } from "@/features/os-shell/deliverables/OsDeliverableForm";
import type { OsCanonicalClient, OsCanonicalProject, OsDeliverableCreateInput } from "@/features/os-shell/deliverables/types";

function CreateInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const perms = useOsPermissions();
  const [clients, setClients] = useState<OsCanonicalClient[]>([]);
  const [projects, setProjects] = useState<OsCanonicalProject[]>([]);
  const [form, setForm] = useState<OsDeliverableCreateInput>(
    emptyDeliverableForm({
      client_id: searchParams?.get("client_id") ?? "",
      project_id: searchParams?.get("project_id") ?? "",
    }),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCanonicalClients()
      .then(setClients)
      .catch(() => setError("No se pudieron cargar clientes OS"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!form.client_id) {
      setProjects([]);
      return;
    }
    void fetchCanonicalProjects(form.client_id).then(setProjects);
  }, [form.client_id]);

  const save = async () => {
    if (!perms.canCreate) return;
    if (!form.client_id || !form.project_id || !form.title.trim()) {
      setError("Cliente, proyecto y título son obligatorios");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await osDeliverablesApi.create({
        ...form,
        title: form.title.trim(),
      });
      router.push(`/os/entregables/${created.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al crear");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OsShellLayout>
      <OsPageHeader
        title="Nuevo entregable"
        description="Alta en os_deliverables (API canónica OS)."
        actions={<OsGhostButton href="/os/entregables">← Lista</OsGhostButton>}
      />
      {error ? <OsErrorBanner message={error} /> : null}
      {loading ? <OsLoadingBlock /> : null}
      {!loading ? (
        <>
          <OsDeliverableForm
            value={form}
            onChange={(next) => setForm(next as OsDeliverableCreateInput)}
            clients={clients}
            projects={projects}
          />
          <div className="mt-6 flex gap-2">
            <OsPrimaryButton type="button" disabled={saving || !perms.canCreate} onClick={() => void save()}>
              {saving ? "Guardando…" : "Crear entregable"}
            </OsPrimaryButton>
            <OsGhostButton href="/os/entregables">Cancelar</OsGhostButton>
          </div>
        </>
      ) : null}
    </OsShellLayout>
  );
}

export function OsDeliverableCreateView() {
  return (
    <Suspense fallback={<OsLoadingBlock label="Cargando formulario…" />}>
      <CreateInner />
    </Suspense>
  );
}
