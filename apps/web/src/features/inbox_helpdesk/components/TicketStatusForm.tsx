"use client";

import React, { FormEvent, useState } from "react";

import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";

interface TicketStatusFormProps {
  currentStatus?: string | null;
  canSubmit: boolean;
  isSubmitting?: boolean;
  onSubmit: (status: string) => Promise<void> | void;
}

const STATUSES = [
  { id: "open", label: "Abierto" },
  { id: "in_progress", label: "En curso" },
  { id: "waiting", label: "En espera" },
  { id: "resolved", label: "Resuelto" },
  { id: "closed", label: "Cerrado" },
];

export function TicketStatusForm({
  currentStatus,
  canSubmit,
  isSubmitting = false,
  onSubmit,
}: TicketStatusFormProps) {
  const [status, setStatus] = useState(currentStatus ?? "open");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit(status);
  };

  return (
    <PanelCard>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Estado del ticket</span>
          <select
            className="w-full rounded-md border border-input bg-background px-2 py-2"
            onChange={(e) => setStatus(e.target.value)}
            value={status}
          >
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {!canSubmit ? (
          <p className="text-sm text-warning-foreground">Solo operadores pueden cambiar el estado.</p>
        ) : null}
        <Button disabled={!canSubmit || isSubmitting} type="submit">
          {isSubmitting ? "Guardando…" : "Guardar estado"}
        </Button>
      </form>
    </PanelCard>
  );
}
