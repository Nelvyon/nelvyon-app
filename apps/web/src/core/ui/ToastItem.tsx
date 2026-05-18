"use client";

import React from "react";
import { X } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/core/ui/button";
import { cn } from "@/core/ui/utils";
import type { ToastPayload } from "@/core/ui/toastEvents";

const DISMISS_MS: Record<ToastPayload["tone"], number> = {
  success: 4500,
  info: 4500,
  warning: 6000,
  error: 7000,
};

export function ToastItem({ toast, onDismiss }: { toast: ToastPayload; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const ms = DISMISS_MS[toast.tone];
    const id = toast.id;
    const t = window.setTimeout(() => onDismiss(id), ms);
    return () => window.clearTimeout(t);
  }, [toast.id, toast.tone, onDismiss]);

  const isError = toast.tone === "error";

  return (
    <div
      className={cn(
        "pointer-events-auto flex gap-3 rounded-lg border px-3 py-2.5 shadow-elevated",
        isError
          ? "border-destructive/40 bg-destructive/10 text-destructive-foreground"
          : toast.tone === "success"
            ? "border-success/35 bg-success/10 text-success-foreground"
            : "border-border bg-card text-card-foreground",
      )}
      role={isError ? "alert" : "status"}
    >
      <div className="min-w-0 flex-1 pt-0.5">
        {toast.title ? <p className="text-xs font-semibold leading-tight">{toast.title}</p> : null}
        <p className={cn("text-sm leading-snug", toast.title ? "mt-0.5" : "")}>{toast.message}</p>
      </div>
      <Button
        aria-label="Dismiss notification"
        className="h-8 shrink-0 px-2"
        onClick={() => onDismiss(toast.id)}
        type="button"
        variant="ghost"
      >
        <X aria-hidden className="h-4 w-4" />
      </Button>
    </div>
  );
}
