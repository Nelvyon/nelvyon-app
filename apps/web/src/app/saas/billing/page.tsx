"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";
import { SaasPermissionDenied } from "@/features/saas-shell/components/SaasPermissionDenied";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { saasRoleLabel } from "@/features/saas-shell/saasPermissions";
import type { SaasNavId } from "@/features/saas-shell/saasNav";

type BillingStatus = "active" | "paused" | "cancel_at_period_end";

type BillingSummary = {
  tenant: { companyName: string; plan: string; billingStatus?: BillingStatus };
  role: string;
  limits: Record<string, number | null>;
  usage: Record<string, number>;
  stripeConfigured?: boolean;
  billingNote?: string;
};

type PlatformInvoice = {
  id: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  amountEur: number;
  status: "draft" | "issued" | "paid" | "overdue";
  createdAt: string;
};

type CheckoutNotice = "success" | "cancelled" | null;

const PLANS = [
  { id: "starter", name: "Starter", price: 97, features: ["100 llamadas IA/mes", "3 sectores", "CRM + Email + Workflows"] },
  { id: "pro", name: "Pro", price: 297, features: ["500 llamadas IA/mes", "10 sectores", "Todo Starter + Deals + Campañas"] },
  { id: "agency", name: "Agency", price: 797, features: ["2.000 llamadas IA/mes", "Sectores ilimitados", "Todo Pro + White-label + OS"] },
] as const;

const INVOICE_STATUS_LABEL: Record<PlatformInvoice["status"], { label: string; tone: "primary" | "success" | "warning" | "danger" }> = {
  draft: { label: "Borrador", tone: "primary" },
  issued: { label: "Emitida", tone: "warning" },
  paid: { label: "Pagada", tone: "success" },
  overdue: { label: "Vencida", tone: "danger" },
};

function usagePct(used: number, limit: number | null): number | null {
  if (limit === null || limit <= 0) return null;
  return Math.min(100, Math.round((used / limit) * 100));
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

const USAGE_LABELS: Record<string, string> = {
  contacts: "Contactos",
  deals: "Oportunidades",
  campanias: "Campañas",
  workflows: "Workflows",
  users: "Usuarios",
};

export default function SaasBillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BillingSummary | null>(null);
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [portaling, setPortaling] = useState(false);
  const [subscriptionAction, setSubscriptionAction] = useState<"pause" | "cancel_at_period_end" | "resume" | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<CheckoutNotice>(null);

  const loadBilling = useCallback(async () => {
    const res = await fetch("/api/saas/billing", { credentials: "same-origin" });
    if (res.status === 401) {
      router.replace("/auth/login?next=/saas/billing");
      return null;
    }
    if (res.status === 403) {
      setError("Tu rol no tiene acceso a facturación. Solo propietarios y administradores.");
      return null;
    }
    if (!res.ok) throw new Error("No se pudo cargar la facturación");
    const summary = (await res.json()) as BillingSummary;
    setData(summary);
    setError(null);
    return summary;
  }, [router]);

  const loadInvoices = useCallback(async () => {
    try {
      const res = await fetch("/api/saas/invoices", { credentials: "same-origin" });
      if (!res.ok) return;
      const json = (await res.json()) as { invoices?: PlatformInvoice[] };
      setInvoices(json.invoices ?? []);
    } catch {
      setInvoices([]);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await loadBilling();
        await loadInvoices();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadBilling, loadInvoices]);

  useEffect(() => {
    const checkout = searchParams?.get("checkout");
    if (checkout !== "success" && checkout !== "cancelled") return;

    setCheckoutNotice(checkout);
    router.replace("/saas/billing", { scroll: false });

    if (checkout === "success") {
      void loadBilling();
    }
  }, [searchParams, router, loadBilling]);

  async function handleUpgrade(planId: string) {
    setUpgrading(planId);
    setActionError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ planId }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "No se pudo iniciar el checkout");
      window.location.href = json.url;
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Error al iniciar el checkout");
    } finally {
      setUpgrading(null);
    }
  }

  async function handlePortal() {
    setPortaling(true);
    setActionError(null);
    try {
      const res = await fetch("/api/saas/billing/portal", {
        method: "POST",
        credentials: "same-origin",
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "No se pudo abrir el portal de facturación");
      window.location.href = json.url;
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Error al abrir el portal");
    } finally {
      setPortaling(false);
    }
  }

  async function handleSubscriptionAction(action: "pause" | "cancel_at_period_end" | "resume") {
    setSubscriptionAction(action);
    setActionError(null);
    try {
      const res = await fetch("/api/saas/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "No se pudo actualizar la suscripción");
      }
      setConfirmingCancel(false);
      await loadBilling();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Error al actualizar la suscripción");
    } finally {
      setSubscriptionAction(null);
    }
  }

  const activeId: SaasNavId = "billing";
  /** saas_tenants.plan uses enterprise for agency; plan cards use starter/pro/agency ids */
  const currentPlanRaw = data?.tenant.plan ?? null;
  const currentPlan =
    currentPlanRaw === "enterprise" ? "agency" : currentPlanRaw;
  const billingStatus = data?.tenant.billingStatus ?? "active";

  return (
    <SaasShellLayout
      sidebar={
        <SaasSidebar
          activeId={activeId}
          tenantCompany={data?.tenant.companyName}
          tenantPlan={currentPlan as "starter" | "pro" | "enterprise" | undefined}
        />
      }
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">Cuenta</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Facturación y plan</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Gestiona tu suscripción y consulta el uso en tiempo real.</p>
      </div>

      {loading && <NelvyonDsCard><p className="text-sm text-muted-foreground">Cargando…</p></NelvyonDsCard>}
      {error && <SaasPermissionDenied message={error} />}
      {actionError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center justify-between gap-3">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="shrink-0 font-medium hover:underline">Cerrar</button>
        </div>
      )}

      {checkoutNotice === "success" && (
        <div className="rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-sm text-success flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">Pago recibido en Stripe</p>
            <p className="mt-1 text-success/80">
              {data?.billingNote ??
                "Tu plan se activará en unos segundos cuando Stripe confirme el webhook. Refresca si no ves el cambio."}
            </p>
          </div>
          <button onClick={() => setCheckoutNotice(null)} className="shrink-0 font-medium hover:underline">Cerrar</button>
        </div>
      )}

      {checkoutNotice === "cancelled" && (
        <div className="rounded-lg border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-warning flex items-center justify-between gap-3">
          <span>Checkout cancelado. Tu plan actual no ha cambiado.</span>
          <button onClick={() => setCheckoutNotice(null)} className="shrink-0 font-medium hover:underline">Cerrar</button>
        </div>
      )}

      {!loading && !error && data && data.stripeConfigured === false && (
        <div className="rounded-lg border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-warning">
          {data.billingNote ?? "Stripe no está configurado en el servidor. Contacta soporte para activar checkout."}
        </div>
      )}

      {!loading && !error && data && billingStatus !== "active" && (
        <div className="rounded-lg border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-warning flex flex-wrap items-center justify-between gap-3">
          <span>
            {billingStatus === "paused"
              ? "Tu suscripción está en pausa. No se realizarán nuevos cargos hasta que la reactives."
              : "Tu suscripción se cancelará al final del periodo actual. Puedes reactivarla en cualquier momento."}
          </span>
          <NelvyonDsButton
            variant="ghost"
            disabled={subscriptionAction !== null}
            onClick={() => void handleSubscriptionAction("resume")}
          >
            {subscriptionAction === "resume" ? "Reactivando…" : "Reactivar suscripción"}
          </NelvyonDsButton>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Plan actual */}
          <NelvyonDsCard className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <NelvyonDsBadge tone={data.tenant.plan === "enterprise" ? "warning" : data.tenant.plan === "pro" ? "success" : "primary"}>
                {data.tenant.plan}
              </NelvyonDsBadge>
              <span className="text-sm text-muted-foreground">{data.tenant.companyName}</span>
              <span className="text-xs text-muted-foreground/70">{saasRoleLabel(data.role)}</span>
              {billingStatus !== "active" && (
                <NelvyonDsBadge tone="warning">{billingStatus === "paused" ? "En pausa" : "Cancelación programada"}</NelvyonDsBadge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <NelvyonDsButton variant="ghost" onClick={() => void handlePortal()} disabled={portaling}>
                {portaling ? "Abriendo portal…" : "Gestionar facturación"}
              </NelvyonDsButton>
              {billingStatus === "active" && (
                <>
                  <NelvyonDsButton
                    variant="ghost"
                    disabled={subscriptionAction !== null}
                    onClick={() => void handleSubscriptionAction("pause")}
                  >
                    {subscriptionAction === "pause" ? "Pausando…" : "Pausar suscripción"}
                  </NelvyonDsButton>
                  <NelvyonDsButton
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={subscriptionAction !== null}
                    onClick={() => setConfirmingCancel(true)}
                  >
                    Cancelar suscripción
                  </NelvyonDsButton>
                </>
              )}
            </div>
          </NelvyonDsCard>

          {confirmingCancel && (
            <NelvyonDsCard className="border-destructive/30 bg-destructive/5">
              <p className="text-sm font-medium text-foreground">¿Cancelar tu suscripción?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Seguirás con acceso hasta el final del periodo actual. Después no se te volverá a cobrar. Puedes reactivarla en cualquier momento antes de que finalice el periodo.
              </p>
              <div className="mt-4 flex gap-2">
                <NelvyonDsButton variant="ghost" onClick={() => setConfirmingCancel(false)}>Volver</NelvyonDsButton>
                <NelvyonDsButton
                  variant="danger"
                  disabled={subscriptionAction !== null}
                  onClick={() => void handleSubscriptionAction("cancel_at_period_end")}
                >
                  {subscriptionAction === "cancel_at_period_end" ? "Cancelando…" : "Sí, cancelar al final del periodo"}
                </NelvyonDsButton>
              </div>
            </NelvyonDsCard>
          )}

          {/* Uso */}
          <NelvyonDsCard>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Uso del plan</p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(["contacts", "deals", "campanias", "workflows", "users"] as const).map((key) => {
                const used = data.usage[key] ?? 0;
                const limit = data.limits[key] ?? null;
                const pct = usagePct(used, limit);
                const isHigh = pct !== null && pct >= 80;
                return (
                  <div key={key} className="rounded-xl border border-border bg-muted/10 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{USAGE_LABELS[key] ?? key}</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                      {used}
                      <span className="text-base font-normal text-muted-foreground">{limit !== null ? ` / ${limit}` : " / ∞"}</span>
                    </p>
                    {pct !== null ? (
                      <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted/30">
                        <div
                          className={`h-full rounded-full transition-all ${isHigh ? "bg-destructive" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground/70">Sin límite</p>
                    )}
                  </div>
                );
              })}
            </div>
          </NelvyonDsCard>

          {/* Plan cards */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Cambiar de plan</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {PLANS.map((plan) => {
                const isCurrent = currentPlan === plan.id;
                return (
                  <div
                    key={plan.id}
                    className={`relative overflow-hidden rounded-xl border p-5 flex flex-col gap-4 transition-all ${
                      isCurrent
                        ? "border-primary/40 bg-primary/5 shadow-[0_0_32px_rgba(0,132,255,0.15)]"
                        : "border-border bg-muted/5 hover:border-border/80 hover:bg-muted/10"
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{plan.name}</span>
                      {isCurrent && <NelvyonDsBadge tone="primary">Activo</NelvyonDsBadge>}
                    </div>
                    <p className="text-3xl font-bold text-foreground">
                      {plan.price}€
                      <span className="text-sm font-normal text-muted-foreground">/mes</span>
                    </p>
                    <ul className="space-y-2 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="mt-0.5 text-primary">✓</span> {f}
                        </li>
                      ))}
                    </ul>
                    <NelvyonDsButton
                      disabled={isCurrent || upgrading !== null}
                      onClick={() => void handleUpgrade(plan.id)}
                      variant={isCurrent ? "ghost" : "primary"}
                      className="w-full"
                    >
                      {upgrading === plan.id ? "Redirigiendo…" : isCurrent ? "Plan actual" : "Cambiar a este plan"}
                    </NelvyonDsButton>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Historial de facturas de plataforma */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Historial de facturas</p>
            {invoices.length === 0 ? (
              <NelvyonDsCard className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Todavía no se han emitido facturas de suscripción para tu cuenta.</p>
              </NelvyonDsCard>
            ) : (
              <NelvyonDsCard className="overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {["Número", "Periodo", "Importe", "Estado", "Emitida"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoices.map((inv) => {
                      const sc = INVOICE_STATUS_LABEL[inv.status];
                      return (
                        <tr key={inv.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-foreground">{inv.invoiceNumber}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {fmtDate(inv.periodStart)} – {fmtDate(inv.periodEnd)}
                          </td>
                          <td className="px-4 py-3 font-bold text-foreground">€{inv.amountEur.toFixed(2)}</td>
                          <td className="px-4 py-3"><NelvyonDsBadge tone={sc.tone}>{sc.label}</NelvyonDsBadge></td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(inv.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </NelvyonDsCard>
            )}
          </div>
        </>
      )}
    </SaasShellLayout>
  );
}
