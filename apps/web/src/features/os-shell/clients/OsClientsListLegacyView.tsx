"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

import { ApiError } from "@/core/api/types";
import type { OsClientOperationalStatus } from "@/features/os-shell/constants";
import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";
import {
  OsEmptyState,
  OsErrorBanner,
  OsField,
  OsInput,
  OsLoadingBlock,
  OsPageHeader,
  OsPrimaryButton,
  OsSelect,
  OsStatusBadge,
  OsTable,
} from "@/features/os-shell/components/ui/OsUi";
import { useOsPermissions } from "@/features/os-shell/hooks/useOsPermissions";
import { osProjectsApi } from "@/features/os-shell/projects/api";
import type { OsProject } from "@/features/os-shell/projects/types";

import { osClientsLegacyApi } from "./legacyApi";
import type { OsLegacyClient } from "./types";

function buildProjectsByClient(projects: OsProject[]): Map<number, OsProject[]> {
  const map = new Map<number, OsProject[]>();
  for (const p of projects) {
    const list = map.get(p.client_id) ?? [];
    list.push(p);
    map.set(p.client_id, list);
  }
  return map;
}

function deriveLegacyOperationalLabel(projects: OsProject[]): { label: string; tone: "success" | "neutral" | "warning" } {
  if (projects.length === 0) return { label: "Sin proyectos", tone: "neutral" };
  const active = projects.filter((p) => !["completed", "cancelled", "archived"].includes((p.status ?? "").toLowerCase())).length;
  if (active > 0) return { label: `${active} proyecto(s) activo(s)`, tone: "success" };
  return { label: "Solo histórico", tone: "warning" };
}

/** Legacy fallback UI (nelvyon_clients). Enabled via NEXT_PUBLIC_OS_CLIENTS_CANONICAL_UI=false */
export function OsClientsListLegacyView() {
  const perms = useOsPermissions();
  const [clients, setClients] = useState<OsLegacyClient[]>([]);
  const [projectsByClient, setProjectsByClient] = useState<Map<number, OsProject[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [opsFilter, setOpsFilter] = useState<OsClientOperationalStatus>("todos");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, pRes] = await Promise.all([
        osClientsLegacyApi.list({ limit: 500, sort: "-id" }),
        osProjectsApi.list({ limit: 500 }),
      ]);
      setClients(cRes.items ?? []);
      setProjectsByClient(buildProjectsByClient(pRes.items ?? []));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error cargando clientes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sectors = useMemo(() => {
    const s = new Set(clients.map((c) => c.sector).filter(Boolean));
    return Array.from(s).sort();
  }, [clients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (sectorFilter && c.sector !== sectorFilter) return false;
      const projs = projectsByClient.get(c.id) ?? [];
      if (opsFilter === "con_proyectos" && projs.length === 0) return false;
      if (opsFilter === "sin_proyectos" && projs.length > 0) return false;
      if (!q) return true;
      return (
        c.business_name.toLowerCase().includes(q) ||
        c.sector.toLowerCase().includes(q) ||
        (c.city ?? "").toLowerCase().includes(q) ||
        (c.country ?? "").toLowerCase().includes(q)
      );
    });
  }, [clients, search, sectorFilter, opsFilter, projectsByClient]);

  return (
    <OsShellLayout onRefresh={() => void load()} refreshing={loading}>
      <OsPageHeader
        title="Clientes (legacy)"
        description="Fallback: nelvyon_clients · desactivar con NEXT_PUBLIC_OS_CLIENTS_CANONICAL_UI=true"
        actions={
          perms.canCreate ? (
            <OsPrimaryButton href="/os/clientes/nuevo">
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo cliente
            </OsPrimaryButton>
          ) : null
        }
      />
      <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
        Modo legacy activo — migrar a API canónica cuando el backfill esté verificado.
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <OsField label="Buscar">
          <OsInput placeholder="Nombre, sector…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </OsField>
        <OsField label="Sector">
          <OsSelect value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)}>
            <option value="">Todos</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </OsSelect>
        </OsField>
        <OsField label="Proyectos">
          <OsSelect value={opsFilter} onChange={(e) => setOpsFilter(e.target.value as OsClientOperationalStatus)}>
            <option value="todos">Todos</option>
            <option value="con_proyectos">Con proyectos</option>
            <option value="sin_proyectos">Sin proyectos</option>
          </OsSelect>
        </OsField>
      </div>
      {error ? <OsErrorBanner message={error} /> : null}
      {loading ? <OsLoadingBlock /> : null}
      {!loading && !error && filtered.length === 0 ? (
        <OsEmptyState description="Sin clientes legacy." />
      ) : null}
      {!loading && filtered.length > 0 ? (
        <OsTable>
          <thead>
            <tr className="border-b border-white/10 text-xs text-white/45">
              <th className="px-4 py-2">Negocio</th>
              <th className="px-4 py-2">Sector</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const op = deriveLegacyOperationalLabel(projectsByClient.get(c.id) ?? []);
              return (
                <tr key={c.id} className="border-b border-white/5">
                  <td className="px-4 py-2 text-white">{c.business_name}</td>
                  <td className="px-4 py-2 text-white/55">{c.sector}</td>
                  <td className="px-4 py-2">
                    <OsStatusBadge label={op.label} tone={op.tone} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/os/clientes/${c.id}`} className="text-[#0084FF] hover:underline">
                      Ver
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </OsTable>
      ) : null}
    </OsShellLayout>
  );
}
