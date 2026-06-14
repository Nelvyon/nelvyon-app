"use client";

import { useState } from "react";

import { Button } from "@/core/ui/button";
import { canReviewDeliverable } from "@/features/client_portal_v1/constants";
import {
  usePortalApproveDeliverable,
  usePortalRejectDeliverable,
} from "@/features/client_portal_v1/hooks";
import type { PortalDeliverable } from "@/features/client_portal_v1/types";

export function PortalDeliverableReviewPanel({ deliverable }: { deliverable: PortalDeliverable }) {
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const approve = usePortalApproveDeliverable(deliverable.id);
  const reject = usePortalRejectDeliverable(deliverable.id);

  if (!canReviewDeliverable(deliverable.status)) {
    if (deliverable.client_feedback) {
      return (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <p className="font-medium text-foreground">Tu feedback</p>
          <p className="mt-1 text-muted-foreground">{deliverable.client_feedback}</p>
          {deliverable.client_reviewed_at ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Revisado el {new Date(deliverable.client_reviewed_at).toLocaleString("es-ES")}
            </p>
          ) : null}
        </div>
      );
    }
    return null;
  }

  async function handleApprove() {
    setError(null);
    try {
      await approve.mutateAsync(feedback.trim() || undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo aprobar el entregable");
    }
  }

  async function handleReject() {
    const text = feedback.trim();
    if (!text) {
      setError("Describe qué debe cambiar antes de solicitar revisiones.");
      return;
    }
    setError(null);
    try {
      await reject.mutateAsync(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar el feedback");
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-card">
      <div>
        <h2 className="text-base font-semibold text-foreground">Revisar entregable</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Aprueba si cumple tus expectativas o solicita cambios para que el equipo revise la entrega.
        </p>
      </div>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-foreground">Comentarios (obligatorio para solicitar cambios)</span>
        <textarea
          className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Opcional para aprobar; obligatorio si solicitas cambios."
        />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={approve.isPending || reject.isPending} onClick={() => void handleApprove()}>
          {approve.isPending ? "Aprobando…" : "Aprobar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={approve.isPending || reject.isPending}
          onClick={() => void handleReject()}
        >
          {reject.isPending ? "Enviando…" : "Solicitar cambios"}
        </Button>
      </div>
    </section>
  );
}
