"use client";

import { useMemo, useState } from "react";

import {
  BILLABLE_PLANS,
  comparePlans,
  normalizeBillablePlan,
  PLAN_LIMITS,
  PLAN_NAMES,
  PLAN_PRICES,
  type BillablePlan,
} from "@nelvyon/billing";
import { cn } from "@/core/ui/utils";
import { emitToast } from "@/core/ui/toastEvents";
import { NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";

export type ChangePlanFlowProps = {
  currentPlan: string;
  onChanged: () => void;
};

export function ChangePlanFlow({ currentPlan, onChanged }: ChangePlanFlowProps) {
  const normalized = useMemo(() => normalizeBillablePlan(currentPlan), [currentPlan]);
  const [modalPlan, setModalPlan] = useState<BillablePlan | null>(null);
  const [busy, setBusy] = useState(false);

  if (!normalized) {
    return null;
  }

  const closeModal = () => {
    if (!busy) setModalPlan(null);
  };

  const confirmChange = async () => {
    if (!modalPlan) return;
    setBusy(true);
    try {
      const res = await fetch("/api/user/change-plan", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPlan: modalPlan }),
      });
      const body = (await res.json()) as { error?: string; newPlan?: string };
      if (!res.ok) {
        emitToast({
          id: `plan-err-${Date.now()}`,
          tone: "error",
          message: body.error ?? "No se pudo cambiar el plan.",
        });
        return;
      }
      emitToast({
        id: `plan-ok-${Date.now()}`,
        tone: "success",
        message: `Plan actualizado a ${body.newPlan ?? modalPlan}`,
      });
      setModalPlan(null);
      onChanged();
    } catch {
      emitToast({
        id: `plan-net-${Date.now()}`,
        tone: "error",
        message: "Error de red al cambiar el plan.",
      });
    } finally {
      setBusy(false);
    }
  };

  const modalCompare = modalPlan ? comparePlans(modalPlan, normalized) : 0;
  const isUpgradeModal = modalCompare > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {BILLABLE_PLANS.map((plan) => {
          const cmp = comparePlans(plan, normalized);
          const isCurrent = plan === normalized;
          const limits = PLAN_LIMITS[plan];
          const disabled = isCurrent || busy;

          return (
            <button
              key={plan}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && setModalPlan(plan)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                isCurrent
                  ? "cursor-default border-primary/40 bg-primary/5"
                  : "border-border bg-card hover:border-primary/30 hover:bg-muted/40",
                disabled && !isCurrent ? "cursor-not-allowed opacity-60" : "",
              )}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {isCurrent ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                    Plan actual
                  </span>
                ) : cmp < 0 ? (
                  <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:text-orange-300">
                    Downgrade
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                    Upgrade
                    {plan === "pro" ? (
                      <span className="ml-1 font-normal text-emerald-700/90 dark:text-emerald-100/90">· Recomendado</span>
                    ) : null}
                  </span>
                )}
              </div>
              <p className="text-base font-semibold text-foreground">{PLAN_NAMES[plan]}</p>
              <p className="mt-1 text-lg font-bold text-foreground">{PLAN_PRICES[plan]}€/mes</p>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                <li>Hasta {limits.agentCalls.toLocaleString("es-ES")} llamadas a agentes / mes</li>
                <li>Hasta {limits.sectors.toLocaleString("es-ES")} sectores</li>
              </ul>
            </button>
          );
        })}
      </div>

      {modalPlan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <NelvyonDsCard className="max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">Confirmar cambio de plan</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              {isUpgradeModal
                ? "Se cargará la diferencia prorrateada hoy en tu método de pago (Paddle)."
                : "El cambio se aplica inmediatamente; Paddle ajustará la facturación con prorrata."}
            </p>
            <p className="mt-2 text-sm text-foreground">
              Pasarás de <span className="font-semibold capitalize">{normalized}</span> a{" "}
              <span className="font-semibold capitalize">{modalPlan}</span>.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <NelvyonDsButton variant="secondary" type="button" disabled={busy} onClick={closeModal}>
                Cancelar
              </NelvyonDsButton>
              <NelvyonDsButton type="button" disabled={busy} onClick={() => void confirmChange()}>
                {busy ? "Procesando…" : "Confirmar cambio"}
              </NelvyonDsButton>
            </div>
          </NelvyonDsCard>
        </div>
      ) : null}
    </div>
  );
}
