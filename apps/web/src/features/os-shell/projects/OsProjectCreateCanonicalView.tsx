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

import { osProjectsCanonicalApi } from "./api";
import { emptyOsProjectCanonicalForm, OsProjectCanonicalForm } from "./OsProjectCanonicalForm";
import type { OsProjectCreateInput } from "./types";
import { validateProjectForm } from "./validateProjectForm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function OsProjectCreateCanonicalView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const perms = useOsPermissions();
  const presetClient = searchParams?.get("client_id")?.trim() ?? "";
  const [clients, setClients] = useState<OsClient[]>([]);
  const [form, setForm] = useState<OsProjectCreateInput>(
    emptyOsProjectCanonicalForm(UUID_RE.test(presetClient) ? presetClient : ""),
  );
  const [loadingClients, setLoadingClients] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    osClientsCanonicalApi
      .list({ skip: 0, limit: 200, status: "active" })
      .then((r) => setClients(r.items ?? []))
      .catch(() => setError("No se pudieron cargar clientes os_clients"))
      .finally(() => setLoadingClients(false));
  }, []);

  useEffect(() => {
    if (UUID_RE.test(presetClient)) {
      setForm((f) => ({ ...f, client_id: presetClient }));
    }
  }, [presetClient]);

  if (!perms.canCreate) {
    return (
      <OsShellLayout>
        <OsErrorBanner message="Tu rol no puede crear proyectos OS (se requiere operator+)." />
      </OsShellLayout>
    );
  }

  const submit = async () => {
    const validation = validateProjectForm(form);
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: OsProjectCreateInput = {
        ...form,
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        start_date: form.start_date || undefined,
        due_date: form.due_date || undefined,
        budget: form.budget === "" || form.budget == null ? undefined : Number(form.budget),
      };
      const created = await osProjectsCanonicalApi.create(body);
      router.push(`/os/proyectos/${created.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo crear el proyecto");
      setSaving(false);
    }
  };

  return (
    <OsShellLayout>
      <OsPageHeader title="Nuevo proyecto" description="Alta en os_projects (API canónica)" />
      {loadingClients ? <OsLoadingBlock label="Cargando clientes…" /> : null}
      {clients.length === 0 && !loadingClients ? (
        <OsErrorBanner message="Sin clientes activos en os_clients. Crea un cliente antes de un proyecto." />
      ) : null}
      {error ? <OsErrorBanner message={error} /> : null}
      {saving ? <OsLoadingBlock label="Creando proyecto…" /> : null}
      {!saving ? (
        <>
          <OsProjectCanonicalForm
            value={form}
            onChange={setForm}
            clients={clients}
            disabled={saving}
            showStatus={false}
          />
          <div className="mt-6 flex gap-2">
            <OsPrimaryButton type="button" onClick={() => void submit()} disabled={saving || clients.length === 0}>
              Crear proyecto
            </OsPrimaryButton>
            <OsGhostButton href="/os/proyectos">Cancelar</OsGhostButton>
          </div>
        </>
      ) : null}
    </OsShellLayout>
  );
}
