/**
 * AutosaveIndicator — Shows autosave status with a subtle, accessible badge.
 */
import { Cloud, CloudOff, Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AutosaveStatus } from "@/hooks/use-autosave";

interface Props {
  status: AutosaveStatus;
  lastSaved: Date | null;
  isOffline: boolean;
  className?: string;
}

const statusConfig: Record<AutosaveStatus, {
  icon: typeof Cloud;
  label: string;
  color: string;
  ariaLabel: string;
}> = {
  idle: { icon: Cloud, label: "", color: "text-zinc-600", ariaLabel: "Autosave idle" },
  saving: { icon: Loader2, label: "Guardando…", color: "text-blue-400", ariaLabel: "Saving changes" },
  saved: { icon: Check, label: "Guardado", color: "text-emerald-400", ariaLabel: "All changes saved" },
  unsaved: { icon: Cloud, label: "Sin guardar", color: "text-yellow-400", ariaLabel: "Unsaved changes" },
  offline: { icon: CloudOff, label: "Sin conexión", color: "text-orange-400", ariaLabel: "Offline - changes saved locally" },
  error: { icon: AlertCircle, label: "Error al guardar", color: "text-red-400", ariaLabel: "Save error" },
};

export function AutosaveIndicator({ status, lastSaved, isOffline, className }: Props) {
  const effectiveStatus = isOffline && status !== "error" ? "offline" : status;
  const config = statusConfig[effectiveStatus];
  if (effectiveStatus === "idle") return null;

  const Icon = config.icon;
  const timeStr = lastSaved
    ? lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-300",
        "bg-white/[0.04] border border-white/[0.06]",
        config.color,
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={config.ariaLabel}
    >
      <Icon className={cn("w-3 h-3", effectiveStatus === "saving" && "animate-spin")} aria-hidden="true" />
      <span>{config.label}</span>
      {timeStr && effectiveStatus === "saved" && (
        <span className="text-zinc-500 ml-0.5">{timeStr}</span>
      )}
    </div>
  );
}