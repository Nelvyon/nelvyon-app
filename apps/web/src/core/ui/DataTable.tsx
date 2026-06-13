import type { ReactNode } from "react";

import { cn } from "@/core/ui/utils";

type DataTableProps = {
  children: ReactNode;
  className?: string;
};

export function DataTable({ children, className }: DataTableProps) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card shadow-card", className)}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

type DataTableHeaderProps = {
  children: ReactNode;
};

export function DataTableHeader({ children }: DataTableHeaderProps) {
  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 border-b border-border bg-muted/40 px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}

type DataTableRowProps = {
  children: ReactNode;
  className?: string;
};

export function DataTableRow({ children, className }: DataTableRowProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 border-b border-border px-5 py-4 last:border-b-0 transition-colors hover:bg-muted/30",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DataTableCell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-w-0 text-sm", className)}>{children}</div>;
}
