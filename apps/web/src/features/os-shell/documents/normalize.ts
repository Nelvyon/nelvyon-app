import type { InvoiceRow } from "@/features/billing/types";

import type { OsDocumentSource } from "./constants";
import { isLibraryAsset, libraryCategoryFromAsset, libraryCategoryLabel } from "./libraryMatch";
import { resolveFileUrl } from "./resolveFileUrl";
import type { OsAssetRow, OsContractRow, OsDocumentItem, OsOutputDetail } from "./types";

export function outputToDocument(o: OsOutputDetail): OsDocumentItem {
  return {
    id: `entrega-${o.id}`,
    source: "entrega",
    numericId: o.id,
    title: o.title?.trim() || o.output_type || `Entrega #${o.id}`,
    subtitle: o.output_type,
    typeLabel: o.output_type,
    status: o.qa_status ?? "pending",
    clientId: o.client_id ?? null,
    projectId: o.project_id,
    date: o.created_at ?? null,
    fileUrl: resolveFileUrl(null, o.extra_data ?? null),
    notes: o.qa_feedback ?? null,
    raw: o as unknown as Record<string, unknown>,
  };
}

export function assetToDocument(a: OsAssetRow, bibliotecaOnly = false): OsDocumentItem {
  const libCat = libraryCategoryFromAsset(a);
  return {
    id: `archivo-${a.id}`,
    source: "archivo",
    numericId: a.id,
    title: a.file_name,
    subtitle: bibliotecaOnly ? libraryCategoryLabel(libCat) : a.asset_type,
    typeLabel: bibliotecaOnly ? libraryCategoryLabel(libCat) : a.asset_type,
    status: a.classification ?? a.visibility ?? null,
    clientId: a.client_id,
    projectId: a.project_id ?? null,
    date: a.created_at ?? null,
    fileUrl: resolveFileUrl(a.object_key ?? null),
    notes: a.tags ?? null,
    raw: { ...a, libraryCategory: libCat } as Record<string, unknown>,
  };
}

export function contractToDocument(c: OsContractRow): OsDocumentItem {
  return {
    id: `contrato-${c.id}`,
    source: "contrato",
    numericId: c.id,
    title: c.title,
    subtitle: c.client_name ?? null,
    typeLabel: c.contract_type ?? "contrato",
    status: c.status ?? null,
    clientId: c.client_id ?? null,
    projectId: c.project_id ?? null,
    date: c.updated_at ?? c.created_at ?? null,
    fileUrl: null,
    notes: null,
    raw: c as unknown as Record<string, unknown>,
  };
}

export function invoiceToDocument(inv: InvoiceRow, index: number): OsDocumentItem {
  const numId = Number(inv.id) || index;
  return {
    id: `factura-${inv.id}`,
    source: "factura",
    numericId: numId,
    title: inv.number || `Factura ${inv.id}`,
    subtitle: inv.plan,
    typeLabel: "factura",
    status: inv.status,
    clientId: null,
    projectId: null,
    date: inv.date,
    fileUrl: inv.pdf_url || null,
    notes: inv.period,
    raw: inv as unknown as Record<string, unknown>,
  };
}

export function detailHref(item: OsDocumentItem): string {
  return `/os/documentos/${item.source}/${item.numericId}`;
}

export function filterLibraryAssets(assets: OsAssetRow[]): OsAssetRow[] {
  return assets.filter(isLibraryAsset);
}

export function sourceLabel(source: OsDocumentSource): string {
  const map: Record<OsDocumentSource, string> = {
    entrega: "Entrega",
    archivo: "Archivo",
    contrato: "Contrato",
    factura: "Factura",
  };
  return map[source];
}
