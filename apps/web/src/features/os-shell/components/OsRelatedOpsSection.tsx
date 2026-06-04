"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/core/api/types";
import {
  OsErrorBanner,
  OsGhostButton,
  OsLoadingBlock,
  OsPrimaryButton,
  OsStatusBadge,
  OsTable,
} from "@/features/os-shell/components/ui/OsUi";
import { useOsPermissions } from "@/features/os-shell/hooks/useOsPermissions";
import { osDealsApi } from "@/features/os-shell/pipeline/api";
import { dealStatusLabel, dealStatusTone } from "@/features/os-shell/pipeline/dealStatus";
import type { OsDeal } from "@/features/os-shell/pipeline/types";
import { osTasksApi } from "@/features/os-shell/tareas/api";
import { taskStatusLabel, taskStatusTone } from "@/features/os-shell/tareas/taskStatus";
import type { OsTask } from "@/features/os-shell/tareas/types";

export function OsRelatedOpsSection({
  clientId,
  projectId,
}: {
  clientId?: number;
  projectId?: number;
}) {
  const perms = useOsPermissions();
  const [deals, setDeals] = useState<OsDeal[]>([]);
  const [tasks, setTasks] = useState<OsTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, number> = {};
      if (projectId) query.project_id = projectId;
      else if (clientId) query.client_id = clientId;
      const [dRes, tRes] = await Promise.all([
        osDealsApi.list({ limit: 50, query }),
        osTasksApi.list({ limit: 50, query }),
      ]);
      setDeals(dRes.items ?? []);
      setTasks(tRes.items ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error cargando oportunidades/tareas");
    } finally {
      setLoading(false);
    }
  }, [clientId, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const dealNewHref = projectId
    ? `/os/pipeline/nuevo?project_id=${projectId}${clientId ? `&client_id=${clientId}` : ""}`
    : clientId
      ? `/os/pipeline/nuevo?client_id=${clientId}`
      : "/os/pipeline/nuevo";
  const taskNewHref = projectId
    ? `/os/tareas/nuevo?project_id=${projectId}${clientId ? `&client_id=${clientId}` : ""}`
    : clientId
      ? `/os/tareas/nuevo?client_id=${clientId}`
      : "/os/tareas/nuevo";

  if (loading) return <OsLoadingBlock label="Cargando oportunidades y tareas…" />;
  if (error) return <OsErrorBanner message={error} />;

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">Oportunidades (os_deals)</h2>
          {perms.canCreate ? (
            <OsPrimaryButton href={dealNewHref}>Nueva oportunidad</OsPrimaryButton>
          ) : null}
        </div>
        {deals.length === 0 ? (
          <p className="text-sm text-white/40">Sin datos todavía</p>
        ) : (
          <OsTable>
            <thead>
              <tr className="border-b border-white/10 text-xs text-white/45">
                <th className="px-4 py-2">Título</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} className="border-b border-white/5">
                  <td className="px-4 py-2 text-white">{d.title}</td>
                  <td className="px-4 py-2">
                    <OsStatusBadge label={dealStatusLabel(d.status)} tone={dealStatusTone(d.status)} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/os/pipeline/${d.id}`} className="text-[#0084FF] hover:underline">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </OsTable>
        )}
        <div className="mt-2">
          <OsGhostButton href="/os/pipeline">Ver pipeline →</OsGhostButton>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">Tareas (os_tasks)</h2>
          {perms.canCreate ? (
            <OsPrimaryButton href={taskNewHref}>Nueva tarea</OsPrimaryButton>
          ) : null}
        </div>
        {tasks.length === 0 ? (
          <p className="text-sm text-white/40">Sin datos todavía</p>
        ) : (
          <OsTable>
            <thead>
              <tr className="border-b border-white/10 text-xs text-white/45">
                <th className="px-4 py-2">Tarea</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-b border-white/5">
                  <td className="px-4 py-2 text-white">{t.title}</td>
                  <td className="px-4 py-2">
                    <OsStatusBadge label={taskStatusLabel(t.status)} tone={taskStatusTone(t.status)} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/os/tareas/${t.id}`} className="text-[#0084FF] hover:underline">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </OsTable>
        )}
        <div className="mt-2">
          <OsGhostButton href="/os/tareas">Ver todas las tareas →</OsGhostButton>
        </div>
      </section>
    </div>
  );
}
