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
  OsGhostButton,
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

import { osClientsApi } from "./api";
import { buildProjectsByClient, deriveClientOperationalLabel } from "./metrics";
import type { OsClient } from "./types";

export function OsClientsListView() {
  const perms = useOsPermissions();
  const [clients, setClients] = useState<OsClient[]>([]);
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
        osClientsApi.list({ limit: 500, sort: "-id" }),
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
        title="Clientes internos"
        description="Fuente oficial: nelvyon_clients. No usa saas_contacts."
        actions={
          perms.canCreate ? (
            <OsPrimaryButton href="/os/clientes/nuevo">
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo cliente
            </OsPrimaryButton>
          ) : null
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <OsField label="Buscar">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-white/40" />
            <OsInput
              className="pl-9"
              placeholder="Nombre, sector, ciudad…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
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
        <OsField label="Estado operativo">
          <OsSelect
            value={opsFilter}
            onChange={(e) => setOpsFilter(e.target.value as OsClientOperationalStatus)}
          >
            <option value="todos">Todos</option>
            <option value="con_proyectos">Con proyectos</option>
            <option value="sin_proyectos">Sin proyectos</option>
          </OsSelect>
        </OsField>
      </div>

      {error ? <OsErrorBanner message={error} /> : null}
      {loading ? <OsLoadingBlock /> : null}
      {!loading && !error && filtered.length === 0 ? (
        <OsEmptyState
          description="Crea el primer cliente interno para este workspace."
          action={perms.canCreate ? <OsPrimaryButton href="/os/clientes/nuevo">Crear cliente</OsPrimaryButton> : null}
        />
      ) : null}
      {!loading && !error && filtered.length > 0 ? (
        <OsTable>
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/45">
              <th className="px-4 py-3 font-medium">Negocio</th>
              <th className="px-4 py-3 font-medium">Sector</th>
              <th className="px-4 py-3 font-medium">Ubicación</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const op = deriveClientOperationalLabel(projectsByClient.get(c.id) ?? []);
              return (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-medium text-white">{c.business_name}</td>
                  <td className="px-4 py-3 text-white/65">{c.sector}</td>
                  <td className="px-4 py-3 text-white/50">
                    {[c.city, c.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <OsStatusBadge label={op.label} tone={op.tone} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/os/clientes/${c.id}`} className="text-sm text-[#0084FF] hover:underline">
                      Ver
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </OsTable>
      ) : null}
      {!loading && filtered.length > 0 ? (
        <p className="mt-3 text-xs text-white/40">
          {filtered.length} de {clients.length} clientes (filtros locales; API nelvyon_clients)
        </p>
      ) : null}
    </OsShellLayout>
  );
}
