"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { can } from "@/core/routing/roleMatrix";
import { osClientsApi } from "@/features/os-shell/clients/legacyApi";
import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";
import {
  OsErrorBanner,
  OsGhostButton,
  OsLoadingBlock,
  OsPageHeader,
  OsStatusBadge,
} from "@/features/os-shell/components/ui/OsUi";
import { osProjectsApi } from "@/features/os-shell/projects/api";
import type { OsDocumentSource } from "./constants";
import { osDocumentsApi } from "./api";
import { outputStatusLabel, outputStatusTone } from "./deliveryStatus";
import { libraryCategoryFromAsset, libraryCategoryLabel } from "./libraryMatch";
import { resolveFileUrl } from "./resolveFileUrl";
import { sourceLabel } from "./normalize";
export function OsDocumentDetailView({
  source,
  id,
}: {
  source: OsDocumentSource;
  id: number;
}) {
  const { user } = useAuth();
  const canBilling = user ? can(user.role, "billing", "view") : false;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [meta, setMeta] = useState<{ label: string; value: string }[]>([]);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [body, setBody] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (source === "entrega") {
        const o = await osDocumentsApi.outputById(id);
        setTitle(o.title?.trim() || o.output_type || `Entrega #${o.id}`);
        setStatus(o.qa_status ?? null);
        setFileUrl(resolveFileUrl(null, o.extra_data ?? null));
        setBody(o.content ?? o.qa_feedback ?? null);
        const clientName = o.client_id
          ? (await osClientsApi.getById(o.client_id).catch(() => null))?.business_name
          : null;
        const projectName = (await osProjectsApi.getById(o.project_id).catch(() => null))?.name;
        setMeta([
          { label: "Tipo", value: o.output_type },
          { label: "Proyecto", value: projectName ?? String(o.project_id) },
          { label: "Cliente", value: clientName ?? (o.client_id ? String(o.client_id) : "—") },
          { label: "QA score", value: o.qa_score != null ? String(o.qa_score) : "—" },
          { label: "Fecha", value: o.created_at?.slice(0, 10) ?? "—" },
        ]);
      } else if (source === "archivo") {
        const a = await osDocumentsApi.assetById(id);
        setTitle(a.file_name);
        setStatus(a.classification ?? a.visibility ?? null);
        setFileUrl(resolveFileUrl(a.object_key ?? null));
        setBody(a.tags ?? null);
        const cat = libraryCategoryFromAsset(a);
        setMeta([
          { label: "Tipo asset", value: a.asset_type },
          { label: "Categoría biblioteca", value: libraryCategoryLabel(cat) },
          { label: "MIME", value: a.mime_type ?? "—" },
          { label: "Clave objeto", value: a.object_key ?? "—" },
          { label: "Fecha", value: a.created_at?.slice(0, 10) ?? "—" },
        ]);
      } else if (source === "contrato") {
        const c = await osDocumentsApi.contractById(id);
        setTitle(c.title);
        setStatus(c.status ?? null);
        setBody(c.content ?? null);
        setMeta([
          { label: "Tipo", value: c.contract_type ?? "—" },
          { label: "Cliente", value: c.client_name ?? "—" },
          { label: "Estado", value: c.status ?? "—" },
          { label: "Fecha", value: c.updated_at?.slice(0, 10) ?? c.created_at?.slice(0, 10) ?? "—" },
        ]);
      } else if (source === "factura") {
        if (!canBilling) {
          setError("Sin permiso billing para ver facturas.");
          return;
        }
        const inv = await osDocumentsApi.billingInvoices();
        const row = inv.invoices?.find((i) => String(i.id) === String(id) || Number(i.id) === id);
        if (!row) {
          setError("Factura no encontrada");
          return;
        }
        setTitle(row.number || `Factura ${row.id}`);
        setStatus(row.status);
        setFileUrl(row.pdf_url || null);
        setMeta([
          { label: "Importe", value: `${row.amount} ${row.currency}` },
          { label: "Plan", value: row.plan },
          { label: "Periodo", value: row.period },
          { label: "Fecha", value: row.date },
        ]);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No encontrado");
    } finally {
      setLoading(false);
    }
  }, [source, id, canBilling]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <OsShellLayout>
        <OsLoadingBlock />
      </OsShellLayout>
    );
  }

  if (error) {
    return (
      <OsShellLayout>
        <OsErrorBanner message={error} />
        <OsGhostButton href="/os/documentos">← Documentos</OsGhostButton>
      </OsShellLayout>
    );
  }

  return (
    <OsShellLayout onRefresh={() => void load()} refreshing={loading}>
      <OsPageHeader
        title={title}
        description={`${sourceLabel(source)} · ID ${id}`}
      />
      {status ? (
        <div className="mb-4">
          <OsStatusBadge
            label={source === "entrega" ? outputStatusLabel(status) : status}
            tone={source === "entrega" ? outputStatusTone(status) : "neutral"}
          />
        </div>
      ) : null}

      <dl className="mb-6 grid gap-3 text-sm md:grid-cols-2">
        {meta.map((m) => (
          <div key={m.label}>
            <dt className="text-white/45">{m.label}</dt>
            <dd className="text-white/85 break-all">{m.value}</dd>
          </div>
        ))}
      </dl>

      {fileUrl ? (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 inline-flex items-center gap-2 text-sm text-[#0084FF] hover:underline"
        >
          Abrir archivo
          <ExternalLink className="h-4 w-4" />
        </a>
      ) : (
        <p className="mb-4 text-sm text-white/40">Sin enlace de archivo público</p>
      )}

      {body ? (
        <pre className="max-h-96 overflow-auto rounded-xl border border-white/10 bg-[#0b1428] p-4 text-xs text-white/75 whitespace-pre-wrap">
          {body.slice(0, 12000)}
          {body.length > 12000 ? "\n… (recortado)" : ""}
        </pre>
      ) : (
        <p className="text-sm text-white/40">Sin contenido adicional</p>
      )}

      <div className="mt-8">
        <OsGhostButton href="/os/documentos">← Documentos</OsGhostButton>
      </div>
    </OsShellLayout>
  );
}
