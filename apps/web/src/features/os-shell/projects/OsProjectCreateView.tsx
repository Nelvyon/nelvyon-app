"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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
} from "@/features/os-shell/components/ui/OsUi";
import { useOsPermissions } from "@/features/os-shell/hooks/useOsPermissions";

import { osProjectsApi } from "./api";
import { emptyOsProjectForm, OsProjectForm } from "./OsProjectForm";
import type { OsProjectWriteInput } from "./types";

export function OsProjectCreateView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const perms = useOsPermissions();
  const presetClient = Number(searchParams?.get("client_id") || 0);
  const [clients, setClients] = useState<OsClient[]>([]);
  const [form, setForm] = useState<OsProjectWriteInput>(emptyOsProjectForm(presetClient));
  const [loadingClients, setLoadingClients] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    osClientsApi
      .list({ limit: 500 })
      .then((r) => setClients(r.items ?? []))
      .catch(() => setError("No se pudieron cargar clientes"))
      .finally(() => setLoadingClients(false));
  }, []);

  useEffect(() => {
    if (presetClient > 0) {
      setForm((f) => ({ ...f, client_id: presetClient }));
    }
  }, [presetClient]);

  if (!perms.canCreate) {
    return (
      <OsShellLayout>
        <OsErrorBanner message="Tu rol no puede crear proyectos (operator+)." />
      </OsShellLayout>
    );
  }

  const submit = async () => {
    if (!form.client_id || !form.name.trim()) {
      setError("Cliente y nombre son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await osProjectsApi.create({
        ...form,
        name: form.name.trim(),
      });
      router.push(`/os/proyectos/${created.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al crear");
      setSaving(false);
    }
  };

  return (
    <OsShellLayout>
      <OsPageHeader title="Nuevo proyecto" description="Alta en nelvyon_projects" />
      {loadingClients ? <OsLoadingBlock label="Cargando clientes…" /> : null}
      {clients.length === 0 && !loadingClients ? (
        <OsErrorBanner message="Sin clientes en el workspace. Crea un cliente antes de un proyecto." />
      ) : null}
      {error ? <OsErrorBanner message={error} /> : null}
      <OsProjectForm value={form} onChange={setForm} clients={clients} disabled={saving} />
      <div className="mt-6 flex gap-2">
        <OsPrimaryButton onClick={() => void submit()} disabled={saving || clients.length === 0}>
          Crear proyecto
        </OsPrimaryButton>
        <OsGhostButton href="/os/proyectos">Cancelar</OsGhostButton>
      </div>
    </OsShellLayout>
  );
}
