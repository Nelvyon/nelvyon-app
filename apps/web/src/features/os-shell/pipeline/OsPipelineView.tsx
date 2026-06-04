"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { ApiError } from "@/core/api/types";
import { osClientsApi } from "@/features/os-shell/clients/api";
import type { OsClient } from "@/features/os-shell/clients/types";
import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";
import {
  OsEmptyState,
  OsErrorBanner,
  OsLoadingBlock,
  OsPageHeader,
  OsPrimaryButton,
  OsStatusBadge,
} from "@/features/os-shell/components/ui/OsUi";
import { OS_DEAL_STATUS_OPTIONS } from "@/features/os-shell/constants";
import { useOsPermissions } from "@/features/os-shell/hooks/useOsPermissions";
import { osProjectsApi } from "@/features/os-shell/projects/api";
import type { OsProject } from "@/features/os-shell/projects/types";

import { osDealsApi } from "./api";
import { dealStatusLabel, dealStatusTone } from "./dealStatus";
import type { OsDeal } from "./types";

function formatValue(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return null;
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);
}

export function OsPipelineView() {
  const perms = useOsPermissions();
  const [deals, setDeals] = useState<OsDeal[]>([]);
  const [clients, setClients] = useState<OsClient[]>([]);
  const [projects, setProjects] = useState<OsProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dRes, cRes, pRes] = await Promise.all([
        osDealsApi.list({ limit: 500, sort: "-id" }),
        osClientsApi.list({ limit: 500 }),
        osProjectsApi.list({ limit: 500 }),
      ]);
      setDeals(dRes.items ?? []);
      setClients(cRes.items ?? []);
      setProjects(pRes.items ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error cargando pipeline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c.business_name])), [clients]);
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);

  const byStatus = useMemo(() => {
    const cols: Record<string, OsDeal[]> = {};
    for (const o of OS_DEAL_STATUS_OPTIONS) cols[o.value] = [];
    for (const d of deals) {
      const key = cols[d.status] ? d.status : "nuevo";
      cols[key].push(d);
    }
    return cols;
  }, [deals]);

  const changeStatus = async (deal: OsDeal, status: string) => {
    if (!perms.canEdit || deal.status === status) return;
    setUpdatingId(deal.id);
    try {
      await osDealsApi.update(deal.id, { status });
      setDeals((prev) => prev.map((d) => (d.id === deal.id ? { ...d, status } : d)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo cambiar estado");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <OsShellLayout onRefresh={() => void load()} refreshing={loading}>
      <OsPageHeader
        title="Pipeline interno"
        description="Oportunidades NELVYON en os_deals. No usa saas_contacts ni crm_deals del tenant cliente."
        actions={
          perms.canCreate ? (
            <OsPrimaryButton href="/os/pipeline/nuevo">
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva oportunidad
            </OsPrimaryButton>
          ) : null
        }
      />
      {error ? <OsErrorBanner message={error} /> : null}
      {loading ? <OsLoadingBlock /> : null}
      {!loading && deals.length === 0 ? (
        <OsEmptyState
          title="Sin datos todavía"
          description="Crea la primera oportunidad interna para seguir el pipeline comercial/operativo."
          action={
            perms.canCreate ? (
              <OsPrimaryButton href="/os/pipeline/nuevo">Nueva oportunidad</OsPrimaryButton>
            ) : null
          }
        />
      ) : null}
      {!loading && deals.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {OS_DEAL_STATUS_OPTIONS.map((col) => (
            <div
              key={col.value}
              className="min-w-[240px] flex-1 rounded-xl border border-white/10 bg-[#080f1f] p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">{col.label}</h2>
                <span className="text-xs text-white/40">{(byStatus[col.value] ?? []).length}</span>
              </div>
              <ul className="space-y-2">
                {(byStatus[col.value] ?? []).map((deal) => (
                  <li
                    key={deal.id}
                    className="rounded-lg border border-white/10 bg-[#0b1428] p-3 text-sm"
                  >
                    <Link
                      href={`/os/pipeline/${deal.id}`}
                      className="font-medium text-white hover:text-[#0084FF]"
                    >
                      {deal.title}
                    </Link>
                    {formatValue(deal.estimated_value ?? null) ? (
                      <p className="mt-1 text-xs text-emerald-300/90">
                        {formatValue(deal.estimated_value ?? null)}
                      </p>
                    ) : null}
                    {deal.client_id ? (
                      <p className="mt-1 truncate text-xs text-white/45">
                        {clientMap.get(deal.client_id) ?? `Cliente #${deal.client_id}`}
                      </p>
                    ) : null}
                    {deal.project_id ? (
                      <p className="truncate text-xs text-white/35">
                        {projectMap.get(deal.project_id) ?? `Proyecto #${deal.project_id}`}
                      </p>
                    ) : null}
                    {deal.assignee ? (
                      <p className="mt-1 text-xs text-white/40">→ {deal.assignee}</p>
                    ) : null}
                    {perms.canEdit ? (
                      <select
                        className="mt-2 w-full rounded border border-white/10 bg-[#060b18] px-2 py-1 text-xs text-white/80"
                        value={deal.status}
                        disabled={updatingId === deal.id}
                        onChange={(e) => void changeStatus(deal, e.target.value)}
                        aria-label="Cambiar estado"
                      >
                        {OS_DEAL_STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <OsStatusBadge
                        label={dealStatusLabel(deal.status)}
                        tone={dealStatusTone(deal.status)}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </OsShellLayout>
  );
}
