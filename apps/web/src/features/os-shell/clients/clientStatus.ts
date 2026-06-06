import type { OsClientStatus } from "@/features/os-shell/clients/types";

const LABELS: Record<OsClientStatus, string> = {
  active: "Activo",
  archived: "Archivado",
};

const TONES: Record<OsClientStatus, "success" | "neutral" | "warning" | "danger" | "info"> = {
  active: "success",
  archived: "neutral",
};

export function clientStatusLabel(status: string): string {
  return LABELS[status as OsClientStatus] ?? status;
}

export function clientStatusTone(status: string): "success" | "neutral" | "warning" | "danger" | "info" {
  return TONES[status as OsClientStatus] ?? "neutral";
}

export const OS_CLIENT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Todos (activos + archivados)" },
  { value: "active", label: "Activos" },
  { value: "archived", label: "Archivados" },
];
