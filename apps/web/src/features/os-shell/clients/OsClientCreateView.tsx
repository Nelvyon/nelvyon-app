"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError } from "@/core/api/types";
import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";
import {
  OsErrorBanner,
  OsGhostButton,
  OsPageHeader,
  OsPrimaryButton,
} from "@/features/os-shell/components/ui/OsUi";
import { useOsPermissions } from "@/features/os-shell/hooks/useOsPermissions";

import { osClientsApi } from "./api";
import { emptyOsClientForm, OsClientForm } from "./OsClientForm";
import type { OsClientWriteInput } from "./types";

export function OsClientCreateView() {
  const router = useRouter();
  const perms = useOsPermissions();
  const [form, setForm] = useState<OsClientWriteInput>(emptyOsClientForm);
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
    if (!form.business_name.trim() || !form.sector.trim()) {
      setError("Nombre y sector son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await osClientsApi.create({
        ...form,
        business_name: form.business_name.trim(),
        sector: form.sector.trim(),
      });
      router.push(`/os/clientes/${created.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo crear el cliente");
      setSaving(false);
    }
  };

  return (
    <OsShellLayout>
      <OsPageHeader title="Nuevo cliente" description="Alta en nelvyon_clients" />
      {error ? <OsErrorBanner message={error} /> : null}
      <OsClientForm value={form} onChange={setForm} disabled={saving} />
      <div className="mt-6 flex gap-2">
        <OsPrimaryButton onClick={() => void submit()} disabled={saving}>
          {saving ? "Guardando…" : "Crear cliente"}
        </OsPrimaryButton>
        <OsGhostButton href="/os/clientes">Cancelar</OsGhostButton>
      </div>
    </OsShellLayout>
  );
}
