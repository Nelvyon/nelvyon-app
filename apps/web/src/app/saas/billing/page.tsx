"use client";

/**
 * /saas/billing sobre la pantalla `ecom-product-order` de la plantilla oficial
 * W3CRM (`src/app/(ecommerce)/ecom-product-order/page.jsx`).
 *
 * Marcado y clases de la plantilla, tal cual: `h-80` > `container-fluid` >
 * `row` > `col-lg-12` > `card` > `card-body` > `table-responsive` >
 * `table table-sm mb-0 table-responsive-lg` con `thead` en `text-white
 * bg-primary`, filas `btn-reveal-trigger`, celdas `py-2`, badges
 * `badge badge-sm badge-*` con su `<span className="ms-1 fa fa-check">`,
 * importes en `text-end font-w600`, el selector maestro `chackboxFun` y el
 * dropdown de tres puntos `btn btn-primary i-false tp-btn-light sharp`.
 *
 * Dentro va la logica REAL de NELVYON sin cambios: los 5 endpoints
 * (`/api/saas/billing`, `/api/saas/billing/portal`, `/api/saas/billing/cancel`,
 * `/api/saas/invoices` y `/api/billing/checkout`), el aviso de retorno de
 * checkout, el consumo frente a limites del plan, el cambio de plan, el portal
 * de Stripe y las acciones de pausa, cancelacion y reactivacion.
 */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Dropdown } from "react-bootstrap";

import { saasRoleLabel } from "@/features/saas-shell/saasPermissions";
import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";

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

/** Tonos de badge de W3CRM para el estado de factura. */
const INVOICE_STATUS_LABEL: Record<PlatformInvoice["status"], { label: string; clase: string }> = {
  draft: { label: "Borrador", clase: "badge-primary" },
  issued: { label: "Emitida", clase: "badge-warning" },
  paid: { label: "Pagada", clase: "badge-success" },
  overdue: { label: "Vencida", clase: "badge-danger" },
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

/** Dropdown de acciones por fila — `DropdonBlog` de la plantilla, con la accion real. */
function AccionesFactura({ onPortal }: { onPortal: () => void }) {
  return (
    <Dropdown className="text-sans-serif">
      <Dropdown.Toggle as="div" variant="" className="i-false">
        <button className="btn btn-primary i-false tp-btn-light sharp" type="button" aria-label="Acciones de la factura">
          <span>
            <svg xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 24 24" version="1.1">
              <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <rect x="0" y="0" width="24" height="24"></rect>
                <circle fill="#000000" cx="12" cy="5" r="2"></circle>
                <circle fill="#000000" cx="12" cy="12" r="2"></circle>
                <circle fill="#000000" cx="12" cy="19" r="2"></circle>
              </g>
            </svg>
          </span>
        </button>
      </Dropdown.Toggle>
      <Dropdown.Menu className="dropdown-menu-right border py-0" align="end">
        <div className="py-2">
          <Link
            className="dropdown-item"
            href="#"
            scroll={false}
            onClick={(e) => {
              e.preventDefault();
              onPortal();
            }}
          >
            Ver en el portal
          </Link>
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
}

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

  /** Selector maestro de la plantilla (`chackboxFun`). */
  const chackboxFun = (type: string) => {
    setTimeout(() => {
      const chackbox = document.querySelectorAll<HTMLInputElement>(".product_order");
      const motherChackBox = document.querySelector<HTMLInputElement>(".product_order_single");
      if (!motherChackBox) return;
      for (let i = 0; i < chackbox.length; i++) {
        const element = chackbox[i];
        if (!element) continue;
        if (type === "all") {
          element.checked = motherChackBox.checked;
        } else if (!element.checked) {
          motherChackBox.checked = false;
          break;
        } else {
          motherChackBox.checked = true;
        }
      }
    }, 100);
  };

  /** saas_tenants.plan uses enterprise for agency; plan cards use starter/pro/agency ids */
  // `?.tenant?.` y no `?.tenant.`: un payload sin `tenant` (respuesta degradada
  // o malformada) hacia estallar la pagina entera con
  // "Cannot read properties of undefined (reading 'plan')", sin shell ni
  // mensaje. Con la guarda cae en el estado vacio de mas abajo.
  const currentPlanRaw = data?.tenant?.plan ?? null;
  const currentPlan = currentPlanRaw === "enterprise" ? "agency" : currentPlanRaw;
  const billingStatus = data?.tenant?.billingStatus ?? "active";
  const datosListos = data != null && data.tenant != null;

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Facturación y plan" parentTitle="Cuenta" pageTitle="Facturación" />
      <div className="h-80">
        <div className="container-fluid">
          {loading && (
            <div className="row">
              <div className="col-lg-12">
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex align-items-center justify-content-center py-5" role="status">
                      <div className="spinner-border text-primary me-3" aria-hidden="true" />
                      <span className="text-muted">Cargando…</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && <div className="alert alert-danger" role="alert">{error}</div>}

          {actionError && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              {actionError}
              <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setActionError(null)} />
            </div>
          )}

          {checkoutNotice === "success" && (
            <div className="alert alert-success alert-dismissible fade show" role="alert">
              <strong>Pago recibido en Stripe.</strong>{" "}
              {data?.billingNote ??
                "Tu plan se activará en unos segundos cuando Stripe confirme el webhook. Refresca si no ves el cambio."}
              <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setCheckoutNotice(null)} />
            </div>
          )}

          {checkoutNotice === "cancelled" && (
            <div className="alert alert-warning alert-dismissible fade show" role="alert">
              Checkout cancelado. Tu plan actual no ha cambiado.
              <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setCheckoutNotice(null)} />
            </div>
          )}

          {!loading && !error && !datosListos && (
            <div className="row">
              <div className="col-lg-12">
                <div className="card">
                  <div className="card-body text-center py-5">
                    <h5 className="mb-1">Sin datos de facturación</h5>
                    <p className="mb-0 text-muted fs-14">
                      No hemos podido recuperar tu plan. Vuelve a intentarlo en unos segundos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && datosListos && data && data.stripeConfigured === false && (
            <div className="alert alert-warning" role="alert">
              {data.billingNote ?? "Stripe no está configurado en el servidor. Contacta soporte para activar checkout."}
            </div>
          )}

          {!loading && !error && datosListos && data && billingStatus !== "active" && (
            <div className="alert alert-warning d-flex flex-wrap align-items-center justify-content-between" role="alert">
              <span>
                {billingStatus === "paused"
                  ? "Tu suscripción está en pausa. No se realizarán nuevos cargos hasta que la reactives."
                  : "Tu suscripción se cancelará al final del periodo actual. Puedes reactivarla en cualquier momento."}
              </span>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={subscriptionAction !== null}
                onClick={() => void handleSubscriptionAction("resume")}
              >
                {subscriptionAction === "resume" ? "Reactivando…" : "Reactivar suscripción"}
              </button>
            </div>
          )}

          {!loading && !error && datosListos && data && (
            <Fragment>
              {/* Plan actual */}
              <div className="row">
                <div className="col-lg-12">
                  <div className="card">
                    <div className="card-header">
                      <h4 className="card-title">Plan actual</h4>
                      <div className="d-flex flex-wrap align-items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-primary light btn-sm"
                          onClick={() => void handlePortal()}
                          disabled={portaling}
                        >
                          {portaling ? "Abriendo portal…" : "Gestionar facturación"}
                        </button>
                        {billingStatus === "active" && (
                          <Fragment>
                            <button
                              type="button"
                              className="btn btn-warning light btn-sm"
                              disabled={subscriptionAction !== null}
                              onClick={() => void handleSubscriptionAction("pause")}
                            >
                              {subscriptionAction === "pause" ? "Pausando…" : "Pausar suscripción"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger light btn-sm"
                              disabled={subscriptionAction !== null}
                              onClick={() => setConfirmingCancel(true)}
                            >
                              Cancelar suscripción
                            </button>
                          </Fragment>
                        )}
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="d-flex flex-wrap align-items-center gap-3">
                        <span
                          className={`badge badge-sm ${
                            data.tenant.plan === "enterprise"
                              ? "badge-warning"
                              : data.tenant.plan === "pro"
                                ? "badge-success"
                                : "badge-primary"
                          }`}
                        >
                          {data.tenant.plan}
                        </span>
                        <span className="text-muted">{data.tenant.companyName}</span>
                        <span className="text-muted fs-13">{saasRoleLabel(data.role)}</span>
                        {billingStatus !== "active" && (
                          <span className="badge badge-sm badge-warning">
                            {billingStatus === "paused" ? "En pausa" : "Cancelación programada"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {confirmingCancel && (
                <div className="row">
                  <div className="col-lg-12">
                    <div className="card">
                      <div className="card-body">
                        <h4 className="mb-2">¿Cancelar tu suscripción?</h4>
                        <p className="text-muted mb-3">
                          Seguirás con acceso hasta el final del periodo actual. Después no se te volverá a cobrar.
                          Puedes reactivarla en cualquier momento antes de que finalice el periodo.
                        </p>
                        <button type="button" className="btn btn-primary light me-2" onClick={() => setConfirmingCancel(false)}>
                          Volver
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          disabled={subscriptionAction !== null}
                          onClick={() => void handleSubscriptionAction("cancel_at_period_end")}
                        >
                          {subscriptionAction === "cancel_at_period_end" ? "Cancelando…" : "Sí, cancelar al final del periodo"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Uso del plan */}
              <div className="row">
                {(["contacts", "deals", "campanias", "workflows", "users"] as const).map((key) => {
                  const used = data.usage[key] ?? 0;
                  const limit = data.limits[key] ?? null;
                  const pct = usagePct(used, limit);
                  const isHigh = pct !== null && pct >= 80;
                  return (
                    <div className="col-xl-3 col-sm-6" key={key}>
                      <div className="card">
                        <div className="card-body">
                          <span className="d-block text-muted fs-13 text-uppercase mb-1">{USAGE_LABELS[key] ?? key}</span>
                          <h3 className="mb-2">
                            {used}
                            <span className="fs-16 text-muted">{limit !== null ? ` / ${limit}` : " / ∞"}</span>
                          </h3>
                          {pct !== null ? (
                            <div className="progress" style={{ height: 6 }}>
                              <div
                                className={`progress-bar ${isHigh ? "bg-danger" : "bg-primary"}`}
                                style={{ width: `${pct}%`, height: 6 }}
                                role="progressbar"
                                aria-valuenow={pct}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`Uso de ${USAGE_LABELS[key] ?? key}`}
                              />
                            </div>
                          ) : (
                            <span className="text-muted fs-13">Sin límite</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cambiar de plan */}
              <div className="row">
                {PLANS.map((plan) => {
                  const isCurrent = currentPlan === plan.id;
                  return (
                    <div className="col-xl-4 col-lg-6" key={plan.id}>
                      <div className={`card ${isCurrent ? "border-primary" : ""}`}>
                        <div className="card-header">
                          <h4 className="card-title">{plan.name}</h4>
                          {isCurrent && <span className="badge badge-sm badge-primary">Activo</span>}
                        </div>
                        <div className="card-body">
                          <h2 className="mb-3">
                            {plan.price}€<span className="fs-16 text-muted">/mes</span>
                          </h2>
                          <ul className="list-group list-group-flush mb-3">
                            {plan.features.map((f) => (
                              <li className="list-group-item border-0 px-0 py-1" key={f}>
                                <i className="fa-solid fa-check text-primary me-2" />
                                {f}
                              </li>
                            ))}
                          </ul>
                          <button
                            type="button"
                            className={`btn w-100 ${isCurrent ? "btn-primary light" : "btn-primary"}`}
                            disabled={isCurrent || upgrading !== null}
                            onClick={() => void handleUpgrade(plan.id)}
                          >
                            {upgrading === plan.id ? "Redirigiendo…" : isCurrent ? "Plan actual" : "Cambiar a este plan"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Historial de facturas — tabla de `ecom-product-order` */}
              <div className="row">
                <div className="col-lg-12">
                  <div className="card">
                    <div className="card-header">
                      <h4 className="card-title">Historial de facturas</h4>
                    </div>
                    <div className="card-body">
                      {invoices.length === 0 ? (
                        <div className="text-center py-4">
                          <h5 className="mb-1">Sin facturas</h5>
                          <p className="mb-0 text-muted fs-14">
                            Todavía no se han emitido facturas de suscripción para tu cuenta.
                          </p>
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-sm mb-0 table-responsive-lg ">
                            <thead className="text-white bg-primary">
                              <tr>
                                <th className="align-middle">
                                  <div className="form-check custom-checkbox checkbox-success">
                                    <input
                                      type="checkbox"
                                      className="form-check-input  product_order_single"
                                      id="checkAll"
                                      aria-label="Seleccionar todas las facturas"
                                      onClick={() => chackboxFun("all")}
                                    />
                                  </div>
                                </th>
                                <th className="align-middle">Factura</th>
                                <th className="align-middle pr-7">Emitida</th>
                                <th className="align-middle minw200">Periodo</th>
                                <th className="align-middle text-end">Estado</th>
                                <th className="align-middle text-end">Importe</th>
                                <th className="no-sort text-end">Acción</th>
                              </tr>
                            </thead>
                            <tbody id="orders">
                              {invoices.map((inv) => {
                                const sc = INVOICE_STATUS_LABEL[inv.status];
                                return (
                                  <tr className="btn-reveal-trigger" key={inv.id}>
                                    <td className="py-2">
                                      <div className="form-check custom-checkbox checkbox-success">
                                        <input
                                          type="checkbox"
                                          className="form-check-input product_order"
                                          aria-label={`Seleccionar factura ${inv.invoiceNumber}`}
                                          onClick={() => chackboxFun("")}
                                        />
                                      </div>
                                    </td>
                                    <td className="py-2">
                                      <strong>#{inv.invoiceNumber}</strong>
                                      <br />
                                      <span className="text-muted fs-13">{data.tenant.companyName}</span>
                                    </td>
                                    <td className="py-2">{fmtDate(inv.createdAt)}</td>
                                    <td className="py-2">
                                      {fmtDate(inv.periodStart)} – {fmtDate(inv.periodEnd)}
                                      <p className="mb-0 text-500">Suscripción {data.tenant.plan}</p>
                                    </td>
                                    <td className="py-2 text-end">
                                      <span className={`badge badge-sm ${sc.clase}`}>
                                        {sc.label}
                                        <span className="ms-1 fa fa-check" />
                                      </span>
                                    </td>
                                    <td className="py-2 text-end font-w600">€{inv.amountEur.toFixed(2)}</td>
                                    <td className="py-2 text-end">
                                      <AccionesFactura onPortal={() => void handlePortal()} />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Fragment>
          )}
        </div>
      </div>
    </SaasW3crmShell>
  );
}
