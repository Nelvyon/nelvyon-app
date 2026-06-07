import type { OsDeliverable } from "@/features/os-shell/deliverables/types";

export function deliverableHasAttachedFile(row: OsDeliverable): boolean {
  return Boolean(row.storage_key?.trim()) || Boolean(row.file_url?.trim());
}

export function deliverableAttachmentLabel(row: OsDeliverable): string {
  if (row.storage_key?.trim()) return "Almacenamiento privado";
  if (row.file_url?.trim()) return "URL manual";
  return "Sin archivo";
}
