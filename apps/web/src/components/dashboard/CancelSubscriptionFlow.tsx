"use client";

import { useState } from "react";

import { NelvyonDsButton } from "@/design-system/components";
import { cn } from "@/core/ui/utils";

type FlowStep = "retention" | "reason" | "done";

const CANCEL_REASONS = [
  { value: "precio", label: "El precio es demasiado alto" },
  { value: "no_lo_uso", label: "No lo uso lo suficiente" },
  { value: "faltan_funciones", label: "Faltan funciones que necesito" },
  { value: "competencia", label: "Me voy a la competencia" },
  { value: "otro", label: "Otro motivo" },
] as const;

const PLAN_LOSSES: Record<string, string[]> = {
  starter: [
    "Acceso a agentes IA y automatizaciones",
    "SEO, contenido y email automatizados",
    "Dashboard de resultados e historial",
    "Soporte por email",
  ],
  pro: [
    "2.000 llamadas/mes y 60+ servicios",
    "Ads management IA (Google, Meta, TikTok)",
    "Video y Reels IA + API keys propias",
    "Historial completo y soporte prioritario",
  ],
  agency: [
    "Llamadas ilimitadas y todos los servicios",
    "White-label y multi-cliente",
    "Gestor de cuenta dedicado",
    "Integraciones premium y SLA",
  ],
  enterprise: ["Funciones enterprise", "Soporte dedicado", "Límites ampliados", "Configuración avanzada"],
};

function defaultLosses(plan: string): string[] {
  return PLAN_LOSSES[plan] ?? PLAN_LOSSES.starter;
}

function formatPeriodEnd(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("es-ES", { dateStyle: "long" });
}

export interface CancelSubscriptionFlowProps {
  plan: string;
  onClose: () => void;
  onCompleted?: () => void;
}

export function CancelSubscriptionFlow({ plan, onClose, onCompleted }: CancelSubscriptionFlowProps) {
  const [step, setStep] = useState<FlowStep>("retention");
  const [reason, setReason] = useState<string>(CANCEL_REASONS[0].value);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);

  const losses = defaultLosses(plan);

  const submitCancellation = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/user/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          reason,
          feedback: feedback.trim().length > 0 ? feedback.trim() : undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        periodEnd?: string;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(body.message ?? body.error ?? "No se pudo procesar la cancelación");
        return;
      }
      if (typeof body.periodEnd === "string") {
        setPeriodEnd(body.periodEnd);
      }
      setStep("done");
      onCompleted?.();
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {step === "retention" ? (
        <>
          <div>
            <h2 className="text-lg font-semibold text-foreground">¿Seguro que quieres cancelar?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Si cancelas, perderás acceso a estas ventajas de tu plan{" "}
              <span className="font-medium capitalize text-foreground">{plan}</span>:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-foreground">
              {losses.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <NelvyonDsButton className="flex-1" onClick={onClose}>
              Mantener mi plan
            </NelvyonDsButton>
            <NelvyonDsButton
              variant="secondary"
              className="flex-1"
              disabled
              title="Próximamente"
              onClick={() => undefined}
            >
              Pausar 1 mes
            </NelvyonDsButton>
            <NelvyonDsButton variant="secondary" className="flex-1" onClick={() => setStep("reason")}>
              Cancelar igualmente
            </NelvyonDsButton>
          </div>
          <p className="text-xs text-muted-foreground">Pausar 1 mes estará disponible próximamente.</p>
        </>
      ) : null}

      {step === "reason" ? (
        <>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Cuéntanos el motivo</h2>
            <p className="mt-2 text-sm text-muted-foreground">Tu opinión nos ayuda a mejorar NELVYON.</p>
            <label className="mt-4 block text-sm font-medium text-foreground" htmlFor="cancel-reason">
              Motivo principal
            </label>
            <select
              id="cancel-reason"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {CANCEL_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <label className="mt-4 block text-sm font-medium text-foreground" htmlFor="cancel-feedback">
              ¿Algo más que quieras decirnos? (opcional)
            </label>
            <textarea
              id="cancel-feedback"
              maxLength={500}
              rows={4}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tu feedback es anónimo en analítica y nos ayuda a mejorar."
            />
            <p className="mt-1 text-xs text-muted-foreground">{feedback.length}/500</p>
          </div>
          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <NelvyonDsButton variant="secondary" onClick={() => setStep("retention")}>
              Volver
            </NelvyonDsButton>
            <NelvyonDsButton
              variant="secondary"
              className={cn("border-destructive/50 text-destructive")}
              disabled={loading}
              onClick={() => void submitCancellation()}
            >
              {loading ? "Procesando…" : "Confirmar cancelación"}
            </NelvyonDsButton>
          </div>
        </>
      ) : null}

      {step === "done" ? (
        <>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Cancelación programada</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tu suscripción se cancelará el{" "}
              <strong className="text-foreground">
                {periodEnd ? formatPeriodEnd(periodEnd) : "final del periodo actual"}
              </strong>
              . Tienes acceso completo hasta entonces.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Te hemos enviado un email de confirmación con los detalles.
            </p>
          </div>
          <NelvyonDsButton className="w-full" onClick={onClose}>
            Cerrar
          </NelvyonDsButton>
        </>
      ) : null}
    </div>
  );
}
