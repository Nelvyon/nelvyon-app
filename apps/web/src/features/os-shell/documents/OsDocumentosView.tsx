"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Search } from "lucide-react";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { can } from "@/core/routing/roleMatrix";
import { osClientsApi } from "@/features/os-shell/clients/api";
import type { OsClient } from "@/features/os-shell/clients/types";
import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";
import {
  OsEmptyState,
  OsErrorBanner,
  OsField,
  OsInput,
  OsLoadingBlock,
  OsPageHeader,
  OsSelect,
  OsStatusBadge,
  OsTable,
} from "@/features/os-shell/components/ui/OsUi";
import { osProjectsApi } from "@/features/os-shell/projects/api";
import type { OsProject } from "@/features/os-shell/projects/types";

import { osDocumentsApi } from "./api";
import {
  OS_DOCUMENT_TAB_OPTIONS,
  OS_LIBRARY_CATEGORY_OPTIONS,
  OS_OUTPUT_STATUS_FILTER,
  type OsDocumentTab,
} from "./constants";
import { outputStatusLabel, outputStatusTone } from "./deliveryStatus";
import {
  isLibraryAsset,
  libraryCategoryFromAsset,
  libraryCategoryLabel,
  matchesLibraryCategory,
} from "./libraryMatch";
import {
  assetToDocument,
  contractToDocument,
  detailHref,
  invoiceToDocument,
  outputToDocument,
  sourceLabel,
} from "./normalize";
import type { OsAssetRow, OsDocumentItem } from "./types";

export function OsDocumentosView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const canBilling = user ? can(user.role, "billing", "view") : false;

  const tab = (searchParams?.get("tab") as OsDocumentTab) || "todos";
  const presetClient = Number(searchParams?.get("client_id") || 0);
  const presetProject = Number(searchParams?.get("project_id") || 0);

  const [clients, setClients] = useState<OsClient[]>([]);
  const [projects, setProjects] = useState<OsProject[]>([]);
  const [items, setItems] = useState<OsDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState(presetClient > 0 ? String(presetClient) : "");
  const [projectFilter, setProjectFilter] = useState(presetProject > 0 ? String(presetProject) : "");
  const [statusFilter, setStatusFilter] = useState("");
  const [libraryCategory, setLibraryCategory] = useState("");

  const setTab = (next: OsDocumentTab) => {
    const p = new URLSearchParams(searchParams?.toString() ?? "");
    p.set("tab", next);
    if (clientFilter) p.set("client_id", clientFilter);
    else p.delete("client_id");
    if (projectFilter) p.set("project_id", projectFilter);
    else p.delete("project_id");
    router.replace(`/os/documentos?${p.toString()}`);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string | number> = {};
      if (clientFilter) query.client_id = Number(clientFilter);
      if (projectFilter) query.project_id = Number(projectFilter);

      const [cRes, pRes, outRes, assetRes, contractRes] = await Promise.all([
        osClientsApi.list({ limit: 500 }),
        osProjectsApi.list({ limit: 500 }),
        osDocumentsApi.outputs({ query }),
        osDocumentsApi.assets({ query }),
        osDocumentsApi.contracts({ query }),
      ]);

      setClients(cRes.items ?? []);
      setProjects(pRes.items ?? []);

      const merged: OsDocumentItem[] = [];
      merged.push(...(outRes.items ?? []).map(outputToDocument));
      merged.push(...(assetRes.items ?? []).map((a) => assetToDocument(a, false)));
      merged.push(...(contractRes.items ?? []).map(contractToDocument));

      if (canBilling) {
        try {
          const inv = await osDocumentsApi.billingInvoices();
          merged.push(...(inv.invoices ?? []).map(invoiceToDocument));
        } catch (e) {
          if (!(e instanceof ApiError && e.status === 403)) {
            setError(
              e instanceof ApiError ? e.message : "Facturas: error al cargar",
            );
          }
        }
      }

      setItems(merged);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error cargando documentos");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [canBilling, clientFilter, projectFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (presetClient > 0) setClientFilter(String(presetClient));
  }, [presetClient]);

  useEffect(() => {
    if (presetProject > 0) setProjectFilter(String(presetProject));
  }, [presetProject]);

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c.business_name])), [clients]);
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);

  const filtered = useMemo(() => {
    let list = items;
    if (tab === "entregas") list = list.filter((i) => i.source === "entrega");
    else if (tab === "archivos") list = list.filter((i) => i.source === "archivo");
    else if (tab === "contratos") list = list.filter((i) => i.source === "contrato");
    else if (tab === "facturas") list = list.filter((i) => i.source === "factura");
    else if (tab === "biblioteca") {
      list = items
        .filter((i) => {
          if (i.source !== "archivo") return false;
          const raw = i.raw as unknown as OsAssetRow;
          if (!isLibraryAsset(raw)) return false;
          return matchesLibraryCategory(raw, libraryCategory);
        })
        .map((i) => {
          const raw = i.raw as unknown as OsAssetRow;
          const cat = libraryCategoryFromAsset(raw);
          return {
            ...i,
            typeLabel: libraryCategoryLabel(cat),
            subtitle: cat,
          };
        });
    }

    if (statusFilter && tab !== "facturas") {
      list = list.filter((i) => (i.status ?? "").toLowerCase() === statusFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.typeLabel.toLowerCase().includes(q) ||
          (i.subtitle ?? "").toLowerCase().includes(q),
      );
    }

    return list.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }, [items, tab, statusFilter, search, libraryCategory]);

  const tabs = OS_DOCUMENT_TAB_OPTIONS.filter(
    (t) => t.value !== "facturas" || canBilling,
  );

  return (
    <OsShellLayout onRefresh={() => void load()} refreshing={loading}>
      <OsPageHeader
        title="Documentos y entregas"
        description="Fuentes reales: nelvyon_outputs, nelvyon_assets, contracts y facturas workspace (billing). Sin mocks."
      />

      <div className="mb-4 flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={
              tab === t.value
                ? "rounded-lg bg-[#0084FF]/20 px-3 py-1.5 text-sm font-medium text-[#7ec3ff]"
                : "rounded-lg px-3 py-1.5 text-sm text-white/55 hover:bg-white/5"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <OsField label="Buscar">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-white/40" />
            <OsInput
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Título, tipo…"
            />
          </div>
        </OsField>
        <OsField label="Cliente">
          <OsSelect value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
            <option value="">Todos</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.business_name}
              </option>
            ))}
          </OsSelect>
        </OsField>
        <OsField label="Proyecto">
          <OsSelect value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="">Todos</option>
            {projects
              .filter((p) => !clientFilter || p.client_id === Number(clientFilter))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </OsSelect>
        </OsField>
        {tab === "entregas" || tab === "todos" ? (
          <OsField label="Estado (entregas)">
            <OsSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {OS_OUTPUT_STATUS_FILTER.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </OsSelect>
          </OsField>
        ) : tab === "biblioteca" ? (
          <OsField label="Categoría biblioteca">
            <OsSelect value={libraryCategory} onChange={(e) => setLibraryCategory(e.target.value)}>
              {OS_LIBRARY_CATEGORY_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </OsSelect>
          </OsField>
        ) : null}
      </div>

      {error ? <OsErrorBanner message={error} /> : null}
      {loading ? <OsLoadingBlock /> : null}

      {!loading && filtered.length === 0 ? (
        <OsEmptyState
          title="Sin datos todavía"
          description={
            tab === "biblioteca"
              ? "Sube recursos en nelvyon_assets con tags tipo plantilla, prompt o biblioteca."
              : "Las entregas se generan en proyectos; contratos y archivos aparecen al crearlos en el workspace."
          }
        />
      ) : null}

      {!loading && filtered.length > 0 ? (
        <OsTable>
          <thead>
            <tr className="border-b border-white/10 text-xs text-white/45">
              <th className="px-4 py-2">Título</th>
              <th className="px-4 py-2">Fuente</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Cliente / Proyecto</th>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-b border-white/5">
                <td className="px-4 py-2">
                  <Link href={detailHref(d)} className="font-medium text-white hover:text-[#0084FF]">
                    {d.title}
                  </Link>
                </td>
                <td className="px-4 py-2 text-white/55">{sourceLabel(d.source)}</td>
                <td className="px-4 py-2 text-white/55">{d.typeLabel}</td>
                <td className="px-4 py-2">
                  {d.status ? (
                    <OsStatusBadge
                      label={
                        d.source === "entrega" ? outputStatusLabel(d.status) : d.status
                      }
                      tone={d.source === "entrega" ? outputStatusTone(d.status) : "neutral"}
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2 text-xs text-white/50">
                  {d.clientId ? clientMap.get(d.clientId) ?? `#${d.clientId}` : "—"}
                  {d.projectId ? ` · ${projectMap.get(d.projectId) ?? `#${d.projectId}`}` : ""}
                </td>
                <td className="px-4 py-2 text-white/60">{d.date?.slice(0, 10) ?? "—"}</td>
                <td className="px-4 py-2 text-right">
                  {d.fileUrl ? (
                    <a
                      href={d.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#0084FF] hover:underline"
                    >
                      Archivo
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <Link href={detailHref(d)} className="text-[#0084FF] hover:underline">
                      Detalle
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </OsTable>
      ) : null}

      {tab === "biblioteca" ? (
        <p className="mt-4 text-xs text-white/40">
          Biblioteca = nelvyon_assets filtrados por tipo/tags (plantillas, prompts, recursos). No hay tabla
          os_library; categoría derivada en cliente.
        </p>
      ) : null}
    </OsShellLayout>
  );
}
