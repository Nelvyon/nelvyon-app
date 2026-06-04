"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/core/api/types";
import { osDocumentsApi } from "@/features/os-shell/documents/api";
import { outputStatusLabel, outputStatusTone } from "@/features/os-shell/documents/deliveryStatus";
import { detailHref, outputToDocument } from "@/features/os-shell/documents/normalize";
import {
  OsErrorBanner,
  OsGhostButton,
  OsLoadingBlock,
  OsStatusBadge,
  OsTable,
} from "@/features/os-shell/components/ui/OsUi";

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
  const [rows, setRows] = useState<ReturnType<typeof outputToDocument>[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, number> = {};
      if (projectId) query.project_id = projectId;
      else if (clientId) query.client_id = clientId;
      const res = await osDocumentsApi.outputs({ limit, query });
      setRows((res.items ?? []).map(outputToDocument));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error cargando entregas");
    } finally {
      setLoading(false);
    }
  }, [clientId, projectId, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const filterQs = projectId
    ? `?tab=entregas&project_id=${projectId}`
    : clientId
      ? `?tab=entregas&client_id=${clientId}`
      : "?tab=entregas";

  if (loading) return <OsLoadingBlock label="Cargando entregas…" />;
  if (error) return <OsErrorBanner message={error} />;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">Entregas (nelvyon_outputs)</h2>
        <OsGhostButton href={`/os/documentos${filterQs}`}>Ver en documentos →</OsGhostButton>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-white/40">Sin datos todavía</p>
      ) : (
        <OsTable>
          <thead>
            <tr className="border-b border-white/10 text-xs text-white/45">
              <th className="px-4 py-2">Título</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-b border-white/5">
                <td className="px-4 py-2 text-white">{d.title}</td>
                <td className="px-4 py-2 text-white/55">{d.typeLabel}</td>
                <td className="px-4 py-2">
                  <OsStatusBadge
                    label={outputStatusLabel(d.status)}
                    tone={outputStatusTone(d.status)}
                  />
                </td>
                <td className="px-4 py-2 text-white/50">
                  {d.date ? d.date.slice(0, 10) : "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={detailHref(d)} className="text-[#0084FF] hover:underline">
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
