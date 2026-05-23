"use client";

import { ReactNode } from "react";

import { cn } from "@/core/ui/utils";

interface SimpleModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

export function SimpleModal({ open, title, onClose, children, wide }: SimpleModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Cerrar" className="absolute inset-0 bg-black/50" onClick={onClose} type="button" />
      <div className={cn("relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-xl border bg-background p-6 shadow-xl", wide ? "max-w-2xl" : "max-w-lg")}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="text-muted-foreground hover:text-foreground" onClick={onClose} type="button">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    generating: "bg-blue-100 text-blue-800",
    ready: "bg-green-100 text-green-800",
    published: "bg-emerald-100 text-emerald-800",
    error: "bg-red-100 text-red-800",
    scheduled: "bg-indigo-100 text-indigo-800",
    failed: "bg-red-100 text-red-800",
    draft: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}
