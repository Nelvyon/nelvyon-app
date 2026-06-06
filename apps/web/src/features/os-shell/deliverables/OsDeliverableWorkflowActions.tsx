"use client";

import { useState } from "react";

import { ApiError } from "@/core/api/types";
import { OsGhostButton, OsPrimaryButton } from "@/features/os-shell/components/ui/OsUi";
import { osDeliverablesApi } from "@/features/os-shell/deliverables/api";
import {
  availableWorkflowActions,
  type WorkflowAction,
} from "@/features/os-shell/deliverables/deliverableStatus";
import type { OsDeliverable, OsDeliverableStatus } from "@/features/os-shell/deliverables/types";

const ACTION_LABELS: Record<WorkflowAction, string> = {
  "submit-review": "Enviar a revisión",
  deliver: "Marcar entregado",
  approve: "Aprobar (interno)",
  publish: "Publicar al cliente",
  reject: "Rechazar",
  "create-revision": "Crear revisión v+1",
};

export function OsDeliverableWorkflowActions({
  deliverable,
  onUpdated,
  disabled,
}: {
  deliverable: OsDeliverable;
  onUpdated: (row: OsDeliverable) => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [showReject, setShowReject] = useState(false);

  const actions = availableWorkflowActions(deliverable.status as OsDeliverableStatus);

  async function run(action: WorkflowAction) {
    setBusy(action);
    setError(null);
    try {
      let row: OsDeliverable;
      switch (action) {
        case "submit-review":
          row = await osDeliverablesApi.submitReview(deliverable.id);
          break;
        case "deliver":
          row = await osDeliverablesApi.deliver(deliverable.id);
          break;
        case "approve":
          row = await osDeliverablesApi.approve(deliverable.id);
          break;
        case "publish":
          row = await osDeliverablesApi.publish(deliverable.id);
          break;
        case "reject":
          row = await osDeliverablesApi.reject(deliverable.id, rejectNotes.trim() || undefined);
          setShowReject(false);
          setRejectNotes("");
          break;
        case "create-revision":
          row = await osDeliverablesApi.createRevision(deliverable.id);
          break;
        default:
          return;
      }
      onUpdated(row);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Acción fallida");
    } finally {
      setBusy(null);
    }
  }

  if (!actions.length) {
    return (
      <p className="text-sm text-white/45">No hay acciones de workflow disponibles para este estado.</p>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-[#0b1428]/80 p-4">
      <h3 className="text-sm font-semibold text-white">Workflow</h3>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) =>
          action === "reject" ? (
            <OsGhostButton key={action} type="button" disabled={disabled || !!busy} onClick={() => setShowReject((v) => !v)}>
              {busy === action ? "Procesando…" : ACTION_LABELS[action]}
            </OsGhostButton>
          ) : (
            <OsPrimaryButton
              key={action}
              type="button"
              disabled={disabled || !!busy}
              onClick={() => void run(action)}
            >
              {busy === action ? "Procesando…" : ACTION_LABELS[action]}
            </OsPrimaryButton>
          ),
        )}
      </div>
      {showReject ? (
        <div className="space-y-2">
          <textarea
            className="w-full rounded-lg border border-white/15 bg-[#07122a] px-3 py-2 text-sm text-white"
            placeholder="Motivo del rechazo (opcional)"
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
          />
          <OsPrimaryButton type="button" disabled={!!busy} onClick={() => void run("reject")}>
            Confirmar rechazo
          </OsPrimaryButton>
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
