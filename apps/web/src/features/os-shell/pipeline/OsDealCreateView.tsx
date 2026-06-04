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
import { osProjectsApi } from "@/features/os-shell/projects/api";
import type { OsProject } from "@/features/os-shell/projects/types";

import { osDealsApi } from "./api";
import { emptyOsDealForm, OsDealForm } from "./OsDealForm";

export function OsDealCreateView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const perms = useOsPermissions();
  const presetClient = Number(searchParams?.get("client_id") || 0);
  const presetProject = Number(searchParams?.get("project_id") || 0);
  const [clients, setClients] = useState<OsClient[]>([]);
  const [projects, setProjects] = useState<OsProject[]>([]);
  const [form, setForm] = useState(
    emptyOsDealForm({
      client_id: presetClient > 0 ? presetClient : undefined,
      project_id: presetProject > 0 ? presetProject : undefined,
    }),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([osClientsApi.list({ limit: 500 }), osProjectsApi.list({ limit: 500 })])
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
        <OsErrorBanner message="Tu rol no puede crear oportunidades (operator+)." />
      </OsShellLayout>
    );
  }

  const submit = async () => {
    if (!form.title.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await osDealsApi.create({ ...form, title: form.title.trim() });
      router.push(`/os/pipeline/${created.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al crear");
      setSaving(false);
    }
  };

  return (
    <OsShellLayout>
      <OsPageHeader title="Nueva oportunidad" description="Alta en os_deals" />
      {loading ? <OsLoadingBlock /> : null}
      {error ? <OsErrorBanner message={error} /> : null}
      {!loading ? (
        <div className="max-w-2xl rounded-xl border border-white/10 bg-[#0b1428] p-6">
          <OsDealForm
            value={form}
            onChange={setForm}
            clients={clients}
            projects={projects}
            disabled={saving}
          />
          <div className="mt-6 flex gap-2">
            <OsPrimaryButton onClick={() => void submit()} disabled={saving}>
              Crear
            </OsPrimaryButton>
            <OsGhostButton href="/os/pipeline">Cancelar</OsGhostButton>
          </div>
        </div>
      ) : null}
    </OsShellLayout>
  );
}
