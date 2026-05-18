import { cn } from "@/core/ui/utils";

export type NelvyonDsStatus = "ok" | "warn" | "crit" | "pending";

const toneClass: Record<NelvyonDsStatus, string> = {
  ok: "bg-success",
  warn: "bg-warning",
  crit: "bg-destructive",
  pending: "bg-muted-foreground/50",
};

export interface NelvyonDsStatusDotProps {
  status: NelvyonDsStatus;
  className?: string;
  /** Defaults to human-readable status */
  label?: string;
}

export function NelvyonDsStatusDot({ status, className, label }: NelvyonDsStatusDotProps) {
  const text = label ?? `Status: ${status}`;
  return (
    <span
      aria-label={text}
      className={cn("inline-block size-2 shrink-0 rounded-full ring-2 ring-background", toneClass[status], className)}
      role="img"
    />
  );
}
