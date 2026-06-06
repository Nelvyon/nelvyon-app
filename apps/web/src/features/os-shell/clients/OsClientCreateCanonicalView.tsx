"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

import { osClientsCanonicalApi } from "./api";
import { emptyOsClientForm, OsClientForm } from "./OsClientForm";
import type { OsClientCreateInput } from "./types";
import { validateClientForm } from "./validateClientForm";

export function OsClientCreateCanonicalView() {
  const router = useRouter();
  const perms = useOsPermissions();
  const [form, setForm] = useState<OsClientCreateInput>(emptyOsClientForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!perms.canCreate) {
    return (
      <OsShellLayout>
        <OsErrorBanner message="Tu rol no puede crear clientes OS (se requiere operator+)." />
      </OsShellLayout>
    );
  }

  const submit = async () => {
    const validation = validateClientForm(form);
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await osClientsCanonicalApi.create({
        ...form,
        business_name: form.business_name.trim(),
        contact_email: form.contact_email?.trim() || undefined,
      });
      router.push(`/os/clientes/${created.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo crear el cliente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OsShellLayout>
      <OsPageHeader title="Nuevo cliente" description="Alta en os_clients (API canónica)" />
      {error ? <OsErrorBanner message={error} /> : null}
      {saving ? <OsLoadingBlock label="Creando cliente…" /> : null}
      {!saving ? (
        <>
          <OsClientForm
            value={form}
            onChange={(next) => setForm(next as OsClientCreateInput)}
            disabled={saving}
          />
          <div className="mt-6 flex gap-2">
            <OsPrimaryButton type="button" onClick={() => void submit()} disabled={saving}>
              Crear cliente
            </OsPrimaryButton>
            <OsGhostButton href="/os/clientes">Cancelar</OsGhostButton>
          </div>
        </>
      ) : null}
    </OsShellLayout>
  );
}
