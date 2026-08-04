"use client";

/**
 * /saas/partner sobre la pantalla `(apps)/add-role` de la plantilla oficial
 * W3CRM.
 *
 * Marcado de la plantilla: `container` > `row` > `h4.heading mb-3` >
 * `col-xl-3` con las `card` de `ul.personal-info` (aqui, la navegacion de las
 * seis pestanas) > `col-xl-9` con `card`, la cabecera `all_user` / `all_user1`
 * —con su `badge badge-primary badge-xs` y el bloque `d-flex member`—, los
 * titulos de seccion `h4.heading mb-0 manage` con icono, y los bloques
 * `card-body` > `ul` > `li.right-check` con
 * `d-flex align-items-center justify-content-between`, `h6.mb-0` y los
 * `form-check custom-checkbox mb-3` en `checkbox-warning` / `checkbox-primary`
 * / `checkbox-success`.
 *
 * `add-role` no incluye tablas y wholesale/ledger son tabulares por naturaleza,
 * asi que esas dos usan `table table-border`, que es la tabla del mismo pack
 * (la de `ecom-invoice`) y esta definida en su hoja de estilos. Es la unica
 * pieza tomada de otra pantalla del propio W3CRM; no se introduce marcado ajeno.
 *
 * Logica de NELVYON intacta: los seis tabs, `TABS`, `eur()`, `KpiCard`,
 * `ConnectBadge`, `RetailRow`, los once `useState`, `load`, `loadLedger` con su
 * guarda `ledgerLoaded`, `loadReferrals`, `saveRetail`, `onboardConnect` y
 * `registerPartner`, con los seis endpoints sin tocar.
 */
import Link from "next/link";
import { useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import type {
  PartnerZoneSummary,
  WholesaleSku,
  ConnectStatus,
  PartnerEligibility,
  LedgerEntry,
  LedgerTotals,
} from "@nelvyon/saas";

type Tab = "resumen" | "subcuentas" | "wholesale" | "connect" | "ledger" | "referidos";

const TABS: { id: Tab; label: string; icono: string }[] = [
  { id: "resumen", label: "Resumen", icono: "fa-solid fa-chart-simple" },
  { id: "subcuentas", label: "Subcuentas", icono: "fa-solid fa-building" },
  { id: "wholesale", label: "Wholesale", icono: "fa-solid fa-tags" },
  { id: "connect", label: "Connect", icono: "fa-brands fa-stripe" },
  { id: "ledger", label: "Ledger", icono: "fa-solid fa-file-invoice" },
  { id: "referidos", label: "Referidos", icono: "fa-solid fa-user-plus" },
];

/** Importes que pueden llegar ausentes en un payload degradado. */
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function eur(n: number): string {
  return `${num(n).toFixed(2)}€`;
}

/** Tarjeta KPI — `card` > `card-body` de W3CRM. */
function KpiCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card">
      <div className="card-body">
        <span className="d-block text-muted fs-13 text-uppercase mb-1">{label}</span>
        <h3 className="mb-0">{value}</h3>
        {hint && <span className="d-block text-muted fs-13">{hint}</span>}
      </div>
    </div>
  );
}

/** Badge de estado de Connect — `badge badge-sm` de W3CRM. */
function ConnectBadge({ connect }: { connect: ConnectStatus | null | undefined }) {
  if (connect?.connected && connect?.chargesEnabled) {
    return <span className="badge badge-sm badge-success">Conectado</span>;
  }
  if (connect?.accountId) return <span className="badge badge-sm badge-warning">Pendiente</span>;
  return <span className="badge badge-sm badge-secondary">Sin conectar</span>;
}

export default function PartnerZonePage() {
  const [tab, setTab] = useState<Tab>("resumen");
  const [summary, setSummary] = useState<PartnerZoneSummary | null>(null);
  const [catalog, setCatalog] = useState<WholesaleSku[]>([]);
  const [connect, setConnect] = useState<ConnectStatus | null>(null);
  const [eligibility, setEligibility] = useState<PartnerEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerTotals, setLedgerTotals] = useState<LedgerTotals | null>(null);
  const [ledgerLoaded, setLedgerLoaded] = useState(false);

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Array<Record<string, unknown>>>([]);
  const [referralsLoaded, setReferralsLoaded] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/partner");
      if (res.ok) {
        const d = (await res.json()) as {
          summary: PartnerZoneSummary; catalog: WholesaleSku[]; connect: ConnectStatus; eligibility: PartnerEligibility;
        };
        setSummary(d.summary ?? null);
        setCatalog(Array.isArray(d.catalog) ? d.catalog : []);
        setConnect(d.connect ?? null);
        setEligibility(d.eligibility ?? null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function loadLedger() {
    if (ledgerLoaded) return;
    try {
      const res = await fetch("/api/saas/partner/ledger");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = (await res.json()) as { entries: LedgerEntry[]; totals: LedgerTotals };
      setLedger(Array.isArray(d.entries) ? d.entries : []);
      setLedgerTotals(d.totals ?? null);
      setLedgerLoaded(true);
    } catch {
      // leave unloaded so the tab can retry on next visit
    }
  }

  async function loadReferrals() {
    if (referralsLoaded) return;
    try {
      const res = await fetch("/api/saas/partner/referrals");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = (await res.json()) as { partner: { referralCode: string }; referrals: Array<Record<string, unknown>> };
      setReferralCode(d.partner?.referralCode ?? null);
      setReferrals(Array.isArray(d.referrals) ? d.referrals : []);
      setReferralsLoaded(true);
    } catch {
      // leave unloaded so the tab can retry on next visit
    }
  }

  useEffect(() => {
    if (tab === "ledger") void loadLedger();
    if (tab === "referidos") void loadReferrals();
  }, [tab]);

  async function saveRetail(sku: string, retailEur: number) {
    try {
      const res = await fetch("/api/saas/partner/retail-prices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, retailEur }),
      });
      if (res.ok) {
        const d = (await res.json()) as { item: WholesaleSku };
        if (d.item) setCatalog((prev) => prev.map((c) => (c.sku === sku ? d.item : c)));
        showToast("Precio retail actualizado");
      } else {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        showToast(d.error ?? "No se pudo guardar");
      }
    } catch {
      showToast("Error de red al guardar precio");
    }
  }

  async function onboardConnect() {
    try {
      const res = await fetch("/api/saas/partner/connect/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const d = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && d.url) window.location.href = d.url;
      else showToast(d.error ?? "Stripe Connect no disponible");
    } catch {
      showToast("Error de red con Stripe Connect");
    }
  }

  async function registerPartner() {
    try {
      const res = await fetch("/api/saas/partner/register", { method: "POST" });
      if (res.ok) {
        showToast("¡Registrado como partner!");
        setReferralsLoaded(false);
        void loadReferrals();
      } else {
        showToast("No se pudo registrar");
      }
    } catch {
      showToast("Error de red al registrar partner");
    }
  }

  // ── Upsell gate ────────────────────────────────────────────────────────────
  if (!loading && eligibility && !eligibility.eligible) {
    return (
      <SaasW3crmShell>
        <W3crmPageTitle mainTitle="Partner Zone" parentTitle="Cuenta" pageTitle="Partner" />
        <div className="container">
          <div className="row">
            <h4 className="heading mb-3">Tu HQ de agencia</h4>
            <div className="col-xl-12">
              <div className="card">
                <div className="card-body text-center py-5">
                  <h5 className="mb-2">Partner Zone no disponible en tu plan</h5>
                  <p className="text-muted mb-3">
                    Tu plan actual es <strong>{eligibility.plan}</strong>. La Partner Zone requiere un plan superior.
                  </p>
                  <Link href="/saas/billing" className="btn btn-primary">Ver planes</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SaasW3crmShell>
    );
  }

  const totalSubcuentas = summary?.recentSubcuentas?.length ?? 0;

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Partner Zone" parentTitle="Cuenta" pageTitle="Partner" />
      <div className="container">
        <div className="row">
          <h4 className="heading mb-3">Tu HQ de agencia</h4>

          {/* Navegacion — `ul.personal-info` de la plantilla */}
          <div className="col-xl-3">
            <div className="row">
              <div className="col-xl-12">
                <div className="card">
                  <div className="card-header">
                    <h4 className="heading mb-0">Secciones</h4>
                  </div>
                  <div className="card-body px-0">
                    <ul className="personal-info">
                      {TABS.map((t) => (
                        <li key={t.id}>
                          <button
                            type="button"
                            className={`btn btn-sm ${tab === t.id ? "btn-primary" : "btn-primary light"}`}
                            onClick={() => setTab(t.id)}
                          >
                            <i className={`${t.icono} me-2`}></i>
                            {t.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="col-xl-12">
                <div className="card">
                  <div className="card-header">
                    <h4 className="heading mb-0">Tu agencia</h4>
                  </div>
                  <div className="card-body px-0">
                    <ul className="personal-info">
                      <li>
                        <i className="fa-solid fa-building text-primary me-3"></i> Subcuentas: {totalSubcuentas}
                      </li>
                      <li>
                        <i className="fa-brands fa-stripe text-primary me-3"></i> Connect:{" "}
                        <ConnectBadge connect={connect} />
                      </li>
                      <li>
                        <Link href="/saas/subcuentas" className="text-primary">
                          <i className="fa-solid fa-arrow-right me-3"></i> Gestionar subcuentas
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contenido — `card` con cabecera `all_user` / `all_user1` */}
          <div className="col-xl-9">
            <div className="row">
              <div className="col-xl-12">
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h4 className="heading mb-0">Tu HQ de agencia</h4>
                      <span>Wholesale, subcuentas, Connect y ledger de rebilling.</span>
                    </div>
                  </div>
                  <div className="card-body p-0">
                    <div className="all_user">
                      <h4 className="mb-0 d-flex align-items-center heading">
                        Subcuentas
                        <span className="badge badge-primary badge-xs ms-3">{totalSubcuentas}</span>
                      </h4>
                      <h4 className="mb-0 text-primary heading">Wholesale y ledger</h4>
                    </div>
                    <div className="all_user1">
                      <span className="mb-0 heading">Estado</span>
                      <div className="d-flex member">
                        <h4 className="heading mb-0">Bruto</h4>
                        <h4 className="heading mb-0">Wholesale</h4>
                        <h4 className="heading mb-0">Margen</h4>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="col-xl-12">
                  <div className="card">
                    <div className="card-body">
                      <div className="d-flex align-items-center justify-content-center py-5" role="status">
                        <div className="spinner-border text-primary me-3" aria-hidden="true" />
                        <span className="text-muted">Cargando Partner Zone…</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* RESUMEN */}
                  {tab === "resumen" && (
                    <>
                      <h4 className="heading mb-0 manage">
                        <i className="fa-solid fa-chart-simple text-primary me-2 mb-3 "></i> Resumen
                      </h4>
                      {summary ? (
                        <>
                          <div className="col-xl-3 col-sm-6">
                            <KpiCard label="Subcuentas activas" value={num(summary.subcuentasActive)} />
                          </div>
                          <div className="col-xl-3 col-sm-6">
                            <KpiCard label="Margen acumulado" value={eur(num(summary.marginTotal))} hint="rebilling" />
                          </div>
                          <div className="col-xl-3 col-sm-6">
                            <KpiCard label="Facturado bruto" value={eur(num(summary.grossTotal))} />
                          </div>
                          <div className="col-xl-3 col-sm-6">
                            <div className="card">
                              <div className="card-body">
                                <span className="d-block text-muted fs-13 text-uppercase mb-1">Stripe Connect</span>
                                <div className="mt-2"><ConnectBadge connect={summary.connect ?? connect} /></div>
                              </div>
                            </div>
                          </div>
                          {!(summary.connect ?? connect)?.connected && (
                            <div className="col-xl-12">
                              <button type="button" className="btn btn-primary" onClick={() => void onboardConnect()}>
                                Conectar Stripe
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="col-xl-12">
                          <div className="card">
                            <div className="card-body text-center py-5">
                              <h5 className="mb-1">Sin datos de partner</h5>
                              <p className="mb-0 text-muted fs-14">
                                No hemos podido recuperar tu resumen. Vuelve a intentarlo en unos segundos.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* SUBCUENTAS */}
                  {tab === "subcuentas" && (
                    <>
                      <h4 className="heading mb-0 manage">
                        <i className="fa-solid fa-building text-primary me-2 mb-3 "></i> Subcuentas
                      </h4>
                      <div className="col-xl-12">
                        <div className="card">
                          <div className="card-body">
                            <div className="d-flex align-items-center justify-content-between mb-3">
                              <span className="text-muted">Últimas subcuentas</span>
                              <Link href="/saas/subcuentas" className="text-primary">Gestionar todas →</Link>
                            </div>
                            {(summary?.recentSubcuentas ?? []).length === 0 ? (
                              <p className="text-muted mb-0 fs-14">
                                Aún no tienes subcuentas.{" "}
                                <Link href="/saas/subcuentas" className="text-primary">Crear la primera</Link>.
                              </p>
                            ) : (
                              <ul>
                                {(summary?.recentSubcuentas ?? []).map((s) => (
                                  <li className="right-check" key={s.id}>
                                    <div className="d-flex align-items-center justify-content-between">
                                      <h6 className=" mb-0">{s.name}</h6>
                                      <div className="d-flex">
                                        <span className={`badge badge-sm ${s.status === "active" ? "badge-success" : "badge-secondary"}`}>
                                          {s.status}
                                        </span>
                                      </div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* WHOLESALE */}
                  {tab === "wholesale" && (
                    <>
                      <h4 className="heading mb-0 manage">
                        <i className="fa-solid fa-tags text-primary me-2 mb-3 "></i> Wholesale
                      </h4>
                      <div className="col-xl-12">
                        <div className="card">
                          <div className="card-body">
                            {catalog.length === 0 ? (
                              <div className="text-center py-4">
                                <h5 className="mb-1">Sin catálogo</h5>
                                <p className="mb-0 text-muted fs-14">No hay SKUs wholesale disponibles.</p>
                              </div>
                            ) : (
                              <div className="table-responsive">
                                <table className="table table-border">
                                  <thead>
                                    <tr>
                                      <th>SKU</th>
                                      <th className="right">Wholesale</th>
                                      <th className="right">Tu retail</th>
                                      <th className="right">Margen</th>
                                      <th className="right">%</th>
                                      <th className="right">Acción</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {catalog.map((c) => (
                                      <RetailRow key={c.sku} item={c} onSave={saveRetail} />
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* CONNECT */}
                  {tab === "connect" && (
                    <>
                      <h4 className="heading mb-0 manage">
                        <i className="fa-brands fa-stripe text-primary me-2 mb-3 "></i> Stripe Connect
                      </h4>
                      <div className="col-xl-12">
                        <div className="card">
                          <div className="card-body">
                            <ul>
                              <li className="right-check">
                                <div className="d-flex align-items-center justify-content-between">
                                  <h6 className=" mb-0">Estado</h6>
                                  <div className="d-flex"><ConnectBadge connect={connect} /></div>
                                </div>
                              </li>
                              <li className="right-check">
                                <div className="d-flex align-items-center justify-content-between">
                                  <h6 className=" mb-0">Charges habilitados</h6>
                                  <div className="d-flex">
                                    <div className="form-check custom-checkbox mb-3 checkbox-primary">
                                      <input
                                        type="checkbox"
                                        className="form-check-input"
                                        id="connect-charges"
                                        checked={Boolean(connect?.chargesEnabled)}
                                        readOnly
                                        aria-label="Charges habilitados"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </li>
                              <li className="right-check">
                                <div className="d-flex align-items-center justify-content-between">
                                  <h6 className=" mb-0">Payouts habilitados</h6>
                                  <div className="d-flex">
                                    <div className="form-check custom-checkbox mb-3 checkbox-success">
                                      <input
                                        type="checkbox"
                                        className="form-check-input"
                                        id="connect-payouts"
                                        checked={Boolean(connect?.payoutsEnabled)}
                                        readOnly
                                        aria-label="Payouts habilitados"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </li>
                              {connect?.accountId && (
                                <li className="right-check">
                                  <div className="d-flex align-items-center justify-content-between">
                                    <h6 className=" mb-0">Account ID</h6>
                                    <div className="d-flex"><span className="text-muted fs-13">{connect.accountId}</span></div>
                                  </div>
                                </li>
                              )}
                            </ul>
                            {!connect?.connected && (
                              <>
                                <button type="button" className="btn btn-primary" onClick={() => void onboardConnect()}>
                                  {connect?.accountId ? "Continuar onboarding" : "Conectar Stripe"}
                                </button>
                                <p className="text-muted fs-13 mt-2 mb-0">
                                  Si Stripe Connect no está configurado en este entorno, verás un aviso al continuar.
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* LEDGER */}
                  {tab === "ledger" && (
                    <>
                      <h4 className="heading mb-0 manage">
                        <i className="fa-solid fa-file-invoice text-primary me-2 mb-3 "></i> Ledger
                      </h4>
                      {ledgerTotals && (
                        <>
                          <div className="col-xl-4 col-sm-6">
                            <KpiCard label="Bruto acumulado" value={eur(num(ledgerTotals.gross))} />
                          </div>
                          <div className="col-xl-4 col-sm-6">
                            <KpiCard label="Wholesale acumulado" value={eur(num(ledgerTotals.wholesale))} />
                          </div>
                          <div className="col-xl-4 col-sm-6">
                            <KpiCard label="Margen acumulado" value={eur(num(ledgerTotals.margin))} />
                          </div>
                        </>
                      )}
                      <div className="col-xl-12">
                        <div className="card">
                          <div className="card-body">
                            {ledger.length === 0 ? (
                              <div className="text-center py-4">
                                <h5 className="mb-1">Sin movimientos</h5>
                                <p className="mb-0 text-muted fs-14">Sin movimientos de rebilling todavía.</p>
                              </div>
                            ) : (
                              <div className="table-responsive">
                                <table className="table table-border">
                                  <thead>
                                    <tr>
                                      <th>Fecha</th>
                                      <th>Origen</th>
                                      <th className="right">Bruto</th>
                                      <th className="right">Wholesale</th>
                                      <th className="right">Margen</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {ledger.map((e, i) => (
                                      <tr key={i}>
                                        <td>{new Date(e.createdAt).toLocaleDateString("es-ES")}</td>
                                        <td>
                                          <span className={`badge badge-sm ${e.source === "connect" ? "badge-primary" : "badge-secondary"}`}>
                                            {e.source}
                                          </span>
                                        </td>
                                        <td className="right">{eur(num(e.grossEur))}</td>
                                        <td className="right">{eur(num(e.wholesaleEur))}</td>
                                        <td className="right text-success">{eur(num(e.marginEur))}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* REFERIDOS */}
                  {tab === "referidos" && (
                    <>
                      <h4 className="heading mb-0 manage">
                        <i className="fa-solid fa-user-plus text-primary me-2 mb-3 "></i> Referidos
                      </h4>
                      <div className="col-xl-12">
                        <div className="card">
                          <div className="card-body">
                            {referralCode ? (
                              <>
                                <span className="d-block text-muted fs-13 text-uppercase mb-1">Tu código de referido</span>
                                <div className="d-flex align-items-center gap-2 mb-4">
                                  <h3 className="text-primary mb-0">{referralCode}</h3>
                                  <button
                                    type="button"
                                    className="btn btn-primary light btn-sm"
                                    onClick={() => { void navigator.clipboard.writeText(referralCode); showToast("Código copiado"); }}
                                  >
                                    copiar
                                  </button>
                                </div>
                                <h4 className="heading mb-2">Comisiones ({referrals.length})</h4>
                                {referrals.length === 0 ? (
                                  <p className="text-muted mb-0 fs-14">Sin comisiones todavía.</p>
                                ) : (
                                  <ul>
                                    {referrals.map((r, i) => (
                                      <li className="right-check" key={i}>
                                        <div className="d-flex align-items-center justify-content-between">
                                          <h6 className=" mb-0">{String((r as { status?: string }).status ?? "—")}</h6>
                                          <div className="d-flex">
                                            <span className="text-success">
                                              {String((r as { commissionEur?: number }).commissionEur ?? "")}
                                            </span>
                                          </div>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </>
                            ) : (
                              <div className="text-center py-4">
                                <p className="text-muted mb-3">Aún no estás registrado en el programa de referidos.</p>
                                <button type="button" className="btn btn-primary" onClick={() => void registerPartner()}>
                                  Unirme al programa
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="alert alert-primary position-fixed bottom-0 end-0 m-4" role="alert" style={{ zIndex: 1080 }}>
          {toast}
        </div>
      )}
    </SaasW3crmShell>
  );
}

// ── Inline-editable retail row ──────────────────────────────────────────────────

function RetailRow({ item, onSave }: { item: WholesaleSku; onSave: (sku: string, retail: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(item.retailEur ?? ""));

  return (
    <tr>
      <td>
        <p className="mb-0 font-w500">{item.label}</p>
        <span className="text-muted fs-13">{item.sku}{item.hasOverride ? " · personalizado" : ""}</span>
      </td>
      <td className="right">{eur(num(item.wholesaleEur))}</td>
      <td className="right">
        {editing ? (
          <input
            type="number"
            className="form-control"
            style={{ maxWidth: 110, display: "inline-block" }}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={`Retail de ${item.sku}`}
          />
        ) : (
          <span className="font-w500">{eur(num(item.retailEur))}</span>
        )}
      </td>
      <td className="right text-success">{eur(num(item.marginEur))}</td>
      <td className="right">{num(item.marginPct)}%</td>
      <td className="right">
        {editing ? (
          <div className="d-flex gap-1 justify-content-end">
            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={() => { onSave(item.sku, parseFloat(value)); setEditing(false); }}
            >
              guardar
            </button>
            <button
              type="button"
              className="btn btn-primary light btn-sm"
              onClick={() => { setValue(String(item.retailEur ?? "")); setEditing(false); }}
            >
              cancelar
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-primary light btn-sm" onClick={() => setEditing(true)}>
            editar
          </button>
        )}
      </td>
    </tr>
  );
}
