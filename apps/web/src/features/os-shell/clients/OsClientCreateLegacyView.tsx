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

import { osClientsLegacyApi } from "./legacyApi";
import type { OsLegacyClientWriteInput } from "./types";

export function OsClientCreateLegacyView() {
  const router = useRouter();
  const perms = useOsPermissions();
  const [form, setForm] = useState<OsLegacyClientWriteInput>({ business_name: "", sector: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!perms.canCreate) {
    return (
      <OsShellLayout>
        <OsErrorBanner message="Sin permiso para crear clientes." />
      </OsShellLayout>
    );
  }

  const submit = async () => {
    if (!form.business_name.trim() || !form.sector.trim()) {
      setError("Nombre y sector obligatorios.");
      return;
    }
    setSaving(true);
    try {
      const created = await osClientsLegacyApi.create(form);
      router.push(`/os/clientes/${created.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al crear");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OsShellLayout>
      <OsPageHeader title="Nuevo cliente (legacy)" description="nelvyon_clients" />
      {error ? <OsErrorBanner message={error} /> : null}
      <div className="grid gap-3 max-w-md">
        <input
          className="rounded border border-white/20 bg-[#07122a] px-3 py-2 text-white"
          placeholder="Nombre *"
          value={form.business_name}
          onChange={(e) => setForm({ ...form, business_name: e.target.value })}
        />
        <input
          className="rounded border border-white/20 bg-[#07122a] px-3 py-2 text-white"
          placeholder="Sector *"
          value={form.sector}
          onChange={(e) => setForm({ ...form, sector: e.target.value })}
        />
      </div>
      <div className="mt-6 flex gap-2">
        <OsPrimaryButton type="button" onClick={() => void submit()} disabled={saving}>
          Crear
        </OsPrimaryButton>
        <OsGhostButton href="/os/clientes">Cancelar</OsGhostButton>
      </div>
    </OsShellLayout>
  );
}
