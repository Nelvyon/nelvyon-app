"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { ApiError } from "@/core/api/types";
import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";
import {
  OsEmptyState,
  OsErrorBanner,
  OsField,
  OsLoadingBlock,
  OsPageHeader,
  OsPrimaryButton,
  OsSelect,
  OsStatusBadge,
  OsTable,
} from "@/features/os-shell/components/ui/OsUi";
import { useOsPermissions } from "@/features/os-shell/hooks/useOsPermissions";
import { osDeliverablesApi } from "@/features/os-shell/deliverables/api";
import {
  fetchCanonicalClients,
  fetchCanonicalProjects,
} from "@/features/os-shell/deliverables/canonicalPickers";
import {
  deliverableStatusLabel,
  deliverableStatusTone,
  OS_DELIVERABLE_STATUS_OPTIONS,
} from "@/features/os-shell/deliverables/deliverableStatus";
import type { OsCanonicalClient, OsCanonicalProject, OsDeliverable } from "@/features/os-shell/deliverables/types";

export function OsDeliverablesListView() {
  const perms = useOsPermissions();
  const searchParams = useSearchParams();
  const presetClient = searchParams?.get("client_id") ?? "";
  const presetProject = searchParams?.get("project_id") ?? "";

  const [items, setItems] = useState<OsDeliverable[]>([]);
  const [clients, setClients] = useState<OsCanonicalClient[]>([]);
  const [projects, setProjects] = useState<OsCanonicalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [clientFilter, setClientFilter] = useState(presetClient);
  const [projectFilter, setProjectFilter] = useState(presetProject);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [delRes, clientRows, projectRows] = await Promise.all([
        osDeliverablesApi.list({
          page: 1,
          page_size: 200,
          status: statusFilter || undefined,
          client_id: clientFilter || undefined,
          project_id: projectFilter || undefined,
        }),
        fetchCanonicalClients(),
        fetchCanonicalProjects(clientFilter || undefined),
      ]);
      setItems(delRes.items ?? []);
      setClients(clientRows);
      setProjects(projectRows);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error cargando entregables");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, clientFilter, projectFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!clientFilter) return;
    void fetchCanonicalProjects(clientFilter).then(setProjects);
  }, [clientFilter]);

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c.business_name])), [clients]);
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);

  const newHref =
    clientFilter && projectFilter
      ? `/os/entregables/nuevo?client_id=${clientFilter}&project_id=${projectFilter}`
      : "/os/entregables/nuevo";

  return (
    <OsShellLayout onRefresh={() => void load()} refreshing={loading}>
      <OsPageHeader
        title="Entregables"
        description="Fuente: os_deliverables · workflow completo hasta publicación cliente."
        actions={
          perms.canCreate ? (
            <OsPrimaryButton href={newHref}>
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo entregable
            </OsPrimaryButton>
          ) : null
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <OsField label="Estado">
          <OsSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {OS_DELIVERABLE_STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </OsSelect>
        </OsField>
        <OsField label="Cliente">
          <OsSelect value={clientFilter} onChange={(e) => { setClientFilter(e.target.value); setProjectFilter(""); }}>
            <option value="">Todos</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.business_name}
              </option>
            ))}
          </OsSelect>
        </OsField>
        <OsField label="Proyecto">
          <OsSelect value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} disabled={!clientFilter}>
            <option value="">Todos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </OsSelect>
        </OsField>
      </div>

      {error ? <OsErrorBanner message={error} /> : null}
      {loading ? <OsLoadingBlock label="Cargando entregables…" /> : null}
      {!loading && items.length === 0 ? (
        <OsEmptyState
          title="Sin entregables"
          description="Crea el primer entregable canónico vinculado a cliente y proyecto OS."
          action={
            perms.canCreate ? (
              <OsPrimaryButton href={newHref}>Crear entregable</OsPrimaryButton>
            ) : undefined
          }
        />
      ) : null}

      {!loading && items.length > 0 ? (
        <OsTable>
          <thead>
            <tr className="border-b border-white/10 text-xs text-white/45">
              <th className="px-4 py-2">Título</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Proyecto</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Ver.</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.id} className="border-b border-white/5">
                <td className="px-4 py-2 text-white">{d.title}</td>
                <td className="px-4 py-2 text-white/55">{clientMap.get(d.client_id) ?? d.client_id.slice(0, 8)}</td>
                <td className="px-4 py-2 text-white/55">{projectMap.get(d.project_id) ?? d.project_id.slice(0, 8)}</td>
                <td className="px-4 py-2">
                  <OsStatusBadge label={deliverableStatusLabel(d.status)} tone={deliverableStatusTone(d.status)} />
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
      ) : null}
    </OsShellLayout>
  );
}
