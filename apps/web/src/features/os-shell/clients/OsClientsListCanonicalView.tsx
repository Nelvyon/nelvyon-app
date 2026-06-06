"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";

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
import { apiClient } from "@/core/api";
import { osClientsCanonicalApi } from "./api";
import { groupProjectsByClientId } from "./clientEnrichment";
import { clientStatusLabel, clientStatusTone, OS_CLIENT_STATUS_OPTIONS } from "./clientStatus";
import { deriveClientOperationalLabel } from "./metrics";
import type { OsClient, OsClientLinkedProject } from "./types";

const PAGE_SIZE = 20;

export function OsClientsListCanonicalView() {
  const perms = useOsPermissions();
  const [clients, setClients] = useState<OsClient[]>([]);
  const [projectsByClient, setProjectsByClient] = useState<Map<string, OsClientLinkedProject[]>>(new Map());
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [opsFilter, setOpsFilter] = useState<OsClientOperationalStatus>("todos");

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, pRes] = await Promise.all([
        osClientsCanonicalApi.list({
          skip,
          limit: PAGE_SIZE,
          q: searchDebounced || undefined,
          status: statusFilter || undefined,
          sector: sectorFilter || undefined,
        }),
        apiClient.get<{ items: { id: string; client_id: string; name: string; status: string }[] }>(
          "/api/v1/os/projects?skip=0&limit=200",
          { tenantScoped: true },
        ),
      ]);
      setClients(cRes.items ?? []);
      setTotal(cRes.total ?? 0);
      setProjectsByClient(groupProjectsByClientId(pRes.items ?? []));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error cargando clientes");
    } finally {
      setLoading(false);
    }
  }, [skip, searchDebounced, statusFilter, sectorFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSkip(0);
  }, [searchDebounced, statusFilter, sectorFilter]);

  const sectors = useMemo(() => {
    const s = new Set(clients.map((c) => c.sector).filter(Boolean) as string[]);
    return Array.from(s).sort();
  }, [clients]);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const projs = projectsByClient.get(c.id) ?? [];
      if (opsFilter === "con_proyectos" && projs.length === 0) return false;
      if (opsFilter === "sin_proyectos" && projs.length > 0) return false;
      return true;
    });
  }, [clients, opsFilter, projectsByClient]);

  const page = Math.floor(skip / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <OsShellLayout onRefresh={() => void load()} refreshing={loading}>
      <OsPageHeader
        title="Clientes"
        description="Fuente: os_clients · API canónica /api/v1/os/clients"
        actions={
          perms.canCreate ? (
            <OsPrimaryButton href="/os/clientes/nuevo">
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo cliente
            </OsPrimaryButton>
          ) : null
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <OsField label="Buscar">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-white/40" />
            <OsInput
              className="pl-9"
              placeholder="Nombre, email, contacto…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </OsField>
        <OsField label="Estado">
          <OsSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {OS_CLIENT_STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </OsSelect>
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
      {loading ? <OsLoadingBlock label="Cargando clientes…" /> : null}
      {!loading && !error && filtered.length === 0 ? (
        <OsEmptyState
          title="Sin clientes"
          description="Crea el primer cliente canónico para este workspace."
          action={perms.canCreate ? <OsPrimaryButton href="/os/clientes/nuevo">Crear cliente</OsPrimaryButton> : null}
        />
      ) : null}
      {!loading && !error && filtered.length > 0 ? (
        <OsTable>
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/45">
              <th className="px-4 py-3 font-medium">Negocio</th>
              <th className="px-4 py-3 font-medium">Sector</th>
              <th className="px-4 py-3 font-medium">Contacto</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Operación</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const op = deriveClientOperationalLabel(projectsByClient.get(c.id) ?? []);
              return (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-medium text-white">{c.business_name}</td>
                  <td className="px-4 py-3 text-white/65">{c.sector || "—"}</td>
                  <td className="px-4 py-3 text-white/50">
                    {c.contact_email || c.contact_name || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <OsStatusBadge label={clientStatusLabel(c.status)} tone={clientStatusTone(c.status)} />
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

      {!loading && total > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-white/50">
          <span>
            {filtered.length} en página · {total} total · os_clients
          </span>
          <div className="flex items-center gap-2">
            <OsGhostButton
              type="button"
              disabled={skip === 0 || loading}
              onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
            >
              <ChevronLeft className="h-4 w-4" />
            </OsGhostButton>
            <span>
              Página {page} / {totalPages}
            </span>
            <OsGhostButton
              type="button"
              disabled={skip + PAGE_SIZE >= total || loading}
              onClick={() => setSkip((s) => s + PAGE_SIZE)}
            >
              <ChevronRight className="h-4 w-4" />
            </OsGhostButton>
          </div>
        </div>
      ) : null}
    </OsShellLayout>
  );
}
