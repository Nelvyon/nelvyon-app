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
import { useOsPermissions } from "@/features/os-shell/hooks/useOsPermissions";
import { osProjectsApi } from "@/features/os-shell/projects/api";
import type { OsProject } from "@/features/os-shell/projects/types";

import { osClientsLegacyApi } from "./legacyApi";
import type { OsLegacyClient } from "./types";

function deriveLegacyOp(projects: OsProject[]) {
  if (!projects.length) return { label: "Sin proyectos", tone: "neutral" as const };
  const active = projects.filter((p) => !["completed", "cancelled", "archived"].includes((p.status ?? "").toLowerCase())).length;
  if (active > 0) return { label: `${active} activo(s)`, tone: "success" as const };
  return { label: "Solo histórico", tone: "warning" as const };
}

export function OsClientDetailLegacyView({ clientId }: { clientId: number }) {
  const router = useRouter();
  const perms = useOsPermissions();
  const [client, setClient] = useState<OsLegacyClient | null>(null);
  const [projects, setProjects] = useState<OsProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const c = await osClientsLegacyApi.getById(clientId);
      setClient(c);
      const pRes = await osProjectsApi.list({ query: { client_id: clientId }, limit: 100 });
      setProjects(pRes.items ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Cliente no encontrado");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async () => {
    if (!perms.canDelete || !confirm("¿Eliminar cliente legacy?")) return;
    try {
      await osClientsLegacyApi.delete(clientId);
      router.push("/os/clientes");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al eliminar");
    }
  };

  if (loading) {
    return (
      <OsShellLayout>
        <OsLoadingBlock />
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

  const op = deriveLegacyOp(projects);

  return (
    <OsShellLayout onRefresh={() => void load()} refreshing={loading}>
      <OsPageHeader title={client.business_name} description={`Legacy ID ${client.id}`} />
      {error ? <OsErrorBanner message={error} /> : null}
      <OsStatusBadge label={op.label} tone={op.tone} />
      <div className="my-8">
        <OsRelatedOpsSection clientId={clientId} />
      </div>
      <OsDeliveriesSection clientId={clientId} />
      <h2 className="mb-3 mt-8 text-lg font-semibold text-white">Proyectos</h2>
      {projects.length === 0 ? (
        <p className="text-sm text-white/40">Sin proyectos</p>
      ) : (
        <OsTable>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2">
                  <Link href={`/os/proyectos/${p.id}`} className="text-[#0084FF]">
                    {p.name}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </OsTable>
      )}
      <div className="mt-8">
        <OsGhostButton href="/os/clientes">← Listado</OsGhostButton>
        {perms.canDelete ? (
          <button type="button" className="ml-4 text-sm text-red-400" onClick={() => void remove()}>
            Eliminar
          </button>
        ) : null}
      </div>
    </OsShellLayout>
  );
}
