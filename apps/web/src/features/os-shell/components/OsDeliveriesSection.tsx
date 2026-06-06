"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/core/api/types";
import {
  OsErrorBanner,
  OsGhostButton,
  OsLoadingBlock,
  OsStatusBadge,
  OsTable,
} from "@/features/os-shell/components/ui/OsUi";
import { osDeliverablesApi } from "@/features/os-shell/deliverables/api";
import {
  resolveCanonicalClientId,
  resolveCanonicalProjectId,
} from "@/features/os-shell/deliverables/canonicalPickers";
import {
  deliverableStatusLabel,
  deliverableStatusTone,
} from "@/features/os-shell/deliverables/deliverableStatus";
import type { OsDeliverable } from "@/features/os-shell/deliverables/types";

export function OsDeliveriesSection({
  clientId,
  projectId,
  limit = 30,
}: {
  clientId?: number;
  projectId?: number;
  limit?: number;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<OsDeliverable[]>([]);
  const [canonicalClientId, setCanonicalClientId] = useState<string | undefined>();
  const [canonicalProjectId, setCanonicalProjectId] = useState<string | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cId = await resolveCanonicalClientId(clientId);
      const pId = projectId ? await resolveCanonicalProjectId(projectId) : undefined;
      setCanonicalClientId(cId);
      setCanonicalProjectId(pId);

      if (!cId && (clientId || projectId)) {
        setRows([]);
        return;
      }

      const res = await osDeliverablesApi.list({
        page: 1,
        page_size: limit,
        client_id: cId,
        project_id: pId,
      });
      setRows(res.items ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error cargando entregables");
    } finally {
      setLoading(false);
    }
  }, [clientId, projectId, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const filterQs = canonicalProjectId
    ? `?client_id=${canonicalClientId ?? ""}&project_id=${canonicalProjectId}`
    : canonicalClientId
      ? `?client_id=${canonicalClientId}`
      : "";

  if (loading) return <OsLoadingBlock label="Cargando entregables…" />;
  if (error) return <OsErrorBanner message={error} />;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">Entregables (os_deliverables)</h2>
        <OsGhostButton href={`/os/entregables${filterQs}`}>Ver todos →</OsGhostButton>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-white/40">
          Sin entregables canónicos
          {clientId || projectId ? " para este cliente/proyecto" : ""}.
        </p>
      ) : (
        <OsTable>
          <thead>
            <tr className="border-b border-white/10 text-xs text-white/45">
              <th className="px-4 py-2">Título</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Ver.</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-b border-white/5">
                <td className="px-4 py-2 text-white">{d.title}</td>
                <td className="px-4 py-2 text-white/55">{d.type ?? "—"}</td>
                <td className="px-4 py-2">
                  <OsStatusBadge
                    label={deliverableStatusLabel(d.status)}
                    tone={deliverableStatusTone(d.status)}
                  />
                </td>
                <td className="px-4 py-2 text-white/50">v{d.version}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/os/entregables/${d.id}`} className="text-[#0084FF] hover:underline">
                    Detalle
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </OsTable>
      )}
    </section>
  );
}
