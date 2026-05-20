"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CancelSubscriptionFlow } from "@/components/dashboard/CancelSubscriptionFlow";
import { ChangePlanFlow } from "@/components/dashboard/ChangePlanFlow";
import { PaymentMethodCard } from "@/components/dashboard/PaymentMethodCard";
import { NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";

const DELETE_CONFIRM_PHRASE = "ELIMINAR MI CUENTA";

type CancellationStatus = {
  isCancelling: boolean;
  periodEnd: string | null;
  daysLeft: number;
  plan: string;
  canChangePlan: boolean;
};

export default function DashboardSettingsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<CancellationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const [exportBusy, setExportBusy] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/user/cancellation-status", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) return;
      const body = (await res.json()) as CancellationStatus;
      setStatus(body);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const plan = status?.plan ?? "free";
  const showCancelButton = !loading && plan !== "free" && !status?.isCancelling;
  const showChangePlan = Boolean(status?.canChangePlan) && plan !== "free";

  const handleExport = async () => {
    setExportBusy(true);
    setExportMessage(null);
    try {
      const res = await fetch("/api/user/export-data", {
        method: "POST",
        credentials: "same-origin",
      });
      if (res.status === 429) {
        const j = (await res.json()) as { message?: string };
        setExportMessage(j.message ?? "Espera 24 h entre exportaciones.");
        return;
      }
      if (!res.ok) {
        setExportMessage("No se pudo generar la exportación. Inténtalo más tarde.");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      let filename = "nelvyon-datos.json";
      const m = disposition?.match(/filename="([^"]+)"/);
      if (m?.[1]) filename = m[1];
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportMessage("Descarga iniciada. Revisa también tu email de confirmación.");
    } catch {
      setExportMessage("Error de red al exportar.");
    } finally {
      setExportBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteBusy(true);
    setDeleteMessage(null);
    try {
      const res = await fetch("/api/user/delete-account", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirmText.trim() }),
      });
      const body = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setDeleteMessage(body.message ?? body.error ?? "No se pudo eliminar la cuenta.");
        return;
      }
      router.push("/goodbye");
    } catch {
      setDeleteMessage("Error de red. Inténtalo de nuevo.");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <NelvyonDsSectionHeader
          eyebrow="Cuenta"
          title="Suscripción y facturación"
          subtitle="Gestiona tu plan, cancelación y acceso a NELVYON."
        />

        <NelvyonDsCard title="Tu plan actual">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Plan actual:{" "}
                <span className="font-semibold capitalize text-foreground">{plan}</span>
              </p>
              {status?.isCancelling && status.periodEnd ? (
                <p className="text-sm text-amber-700 dark:text-amber-200">
                  Cancelación programada para el{" "}
                  {new Date(status.periodEnd).toLocaleDateString("es-ES", { dateStyle: "long" })}.
                  Quedan {status.daysLeft} días de acceso completo.
                </p>
              ) : null}
              {showCancelButton ? (
                <NelvyonDsButton variant="secondary" onClick={() => setCancelModalOpen(true)}>
                  Cancelar suscripción
                </NelvyonDsButton>
              ) : null}
              {plan === "free" ? (
                <NelvyonDsButton asChild>
                  <Link href="/pricing">Ver planes</Link>
                </NelvyonDsButton>
              ) : null}
            </div>
          )}
        </NelvyonDsCard>

        {showChangePlan ? (
          <>
            <NelvyonDsSectionHeader
              eyebrow="Plan"
              title="Tu plan"
              subtitle="Cambia de plan cuando lo necesites; Paddle aplica la prorrata automáticamente."
            />
            <ChangePlanFlow currentPlan={plan} onChanged={() => void loadStatus()} />
          </>
        ) : null}

        <NelvyonDsSectionHeader
          eyebrow="Facturación"
          title="Método de pago"
          subtitle="Actualiza tu tarjeta de forma segura en el portal de Paddle."
        />
        <PaymentMethodCard />

        <NelvyonDsSectionHeader
          eyebrow="Privacidad"
          title="Mis datos"
          subtitle="Ejercita tus derechos de acceso, portabilidad y supresión (RGPD)."
        />

        <NelvyonDsCard title="Copia portátil">
          <p className="text-sm text-muted-foreground">
            Descarga todos los datos asociados a tu cuenta en JSON. Máximo una exportación cada 24 horas.
          </p>
          {exportMessage ? <p className="mt-3 text-sm text-foreground">{exportMessage}</p> : null}
          <NelvyonDsButton className="mt-4" onClick={() => void handleExport()} disabled={exportBusy}>
            {exportBusy ? "Generando archivo…" : "Exportar mis datos"}
          </NelvyonDsButton>
        </NelvyonDsCard>

        <NelvyonDsCard title="Eliminar cuenta">
          <p className="text-sm text-muted-foreground">
            Tu perfil se anonimizará de inmediato. Los registros relativos a facturación pueden conservarse el plazo
            legal. Los resultados de agentes pueden permanecer retenidos hasta 30 días antes de borrado definitivo de
            copias procesables.
          </p>
          <NelvyonDsButton variant="secondary" className="mt-4 border-rose-500/40 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400" onClick={() => { setDeleteModalOpen(true); setDeleteConfirmText(""); setDeleteMessage(null); }}>
            Eliminar mi cuenta
          </NelvyonDsButton>
        </NelvyonDsCard>

        {cancelModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
              <CancelSubscriptionFlow
                plan={plan}
                onClose={() => {
                  setCancelModalOpen(false);
                  void loadStatus();
                }}
                onCompleted={() => void loadStatus()}
              />
            </div>
          </div>
        ) : null}

        {deleteModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-card p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-foreground">Eliminar cuenta permanentemente</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Perderás el acceso al dashboard y a tus proyectos guardados como usuario activo.{" "}
                <strong>No podremos eliminar de inmediato</strong> los datos necesarios por obligaciones fiscales u
                otras obligaciones legales (historial de suscripción y pagos relacionados pueden conservarse en bloque).
              </p>
              <label className="mt-4 flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Escribe exactamente{" "}
                  <span className="font-mono text-foreground">{DELETE_CONFIRM_PHRASE}</span> para confirmar:
                </span>
                <input
                  type="text"
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  autoComplete="off"
                />
              </label>
              {deleteMessage ? <p className="mt-3 text-sm text-rose-500">{deleteMessage}</p> : null}
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <NelvyonDsButton
                  variant="secondary"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setDeleteConfirmText("");
                    setDeleteMessage(null);
                  }}
                >
                  Cancelar
                </NelvyonDsButton>
                <button
                  type="button"
                  disabled={deleteBusy || deleteConfirmText.trim() !== DELETE_CONFIRM_PHRASE}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-rose-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-60"
                  onClick={() => void handleDeleteAccount()}
                >
                  {deleteBusy ? "Eliminando…" : "Eliminar cuenta permanentemente"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
