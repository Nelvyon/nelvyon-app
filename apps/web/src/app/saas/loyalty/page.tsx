"use client";

/**
 * /saas/loyalty sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: miembros, historial de transacciones y los tres formularios ->
 * `W3crmContentBox` + `W3crmDataTable`; las cuatro secciones -> `nav nav-tabs`;
 * KPIs -> `W3crmKpiTile`. Sin componentes nuevos.
 *
 * Inventario: sin `data-testid`; lo cubre `saas-modules.spec.ts` (la ruta carga
 * sin 500). El modulo ya traia un `role="tablist"` con
 * `aria-label="Secciones fidelización"` y cuatro `role="tab"` ("Miembros",
 * "Dar puntos", "Canjear / Ajustar", "Configuración"): se conservan tal cual,
 * ahora sobre el `nav nav-tabs` de la plantilla.
 *
 * Logica de NELVYON intacta: `/api/saas/loyalty` con sus tres recursos
 * (`?resource=program`, `?resource=balances`, `?resource=transactions&contactId=`)
 * y sus cuatro acciones POST (`earn`, `redeem`, `adjust`, `update-program`); el
 * calculo de `goldPlus` por indice de nivel; el modo ajuste con su validacion
 * de puntos distintos de cero y de canje estrictamente positivo; la recarga del
 * historial cuando el contacto afectado es el abierto; el aviso de exito de
 * 3,5 s; el filtrado de niveles sin nombre antes de guardar.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable } from "@/features/saas-w3crm/components/W3crmContentBox";

interface LoyaltyTier {
  name: string;
  min_points: number;
}
interface LoyaltyProgram {
  id: string;
  pointsPerEur: number;
  tiers: LoyaltyTier[];
  active: boolean;
}
interface LoyaltyBalance {
  id: string;
  contactId: string;
  points: number;
  tier: string;
  updatedAt: string;
}
interface LoyaltyTransaction {
  id: string;
  contactId: string;
  type: "earn" | "redeem" | "adjust";
  points: number;
  reason: string | null;
  referenceId: string | null;
  createdAt: string;
}

type Tab = "members" | "earn" | "redeem" | "settings";

const TIER_BADGE: Record<string, string> = {
  Bronze: "badge-warning",
  Silver: "badge-secondary",
  Gold: "badge-success",
  Platinum: "badge-primary",
};
const TXN_LABEL: Record<string, string> = {
  earn: "Ganados",
  redeem: "Canjeados",
  adjust: "Ajuste",
};
const TXN_BADGE: Record<string, string> = {
  earn: "badge-success",
  redeem: "badge-warning",
  adjust: "badge-primary",
};

/** Un nivel o un tipo fuera de catalogo pintaba `undefined`. */
function tierBadge(t: string): string {
  return TIER_BADGE[t] ?? "badge-secondary";
}
function txnLabel(t: string): string {
  return TXN_LABEL[t] ?? (t ? String(t) : "—");
}
function txnBadge(t: string): string {
  return TXN_BADGE[t] ?? "badge-secondary";
}
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
/** `toLocaleString` sobre un no-numero producia "NaN" o reventaba. */
function pts(v: unknown): string {
  return num(v).toLocaleString("es-ES");
}
function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-ES");
}
function fechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-ES");
}

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
  });
  if (!r.ok) {
    const e = (await r.json().catch(() => ({}))) as { error?: string };
    throw new Error(String(e.error ?? r.statusText));
  }
  return r.json() as Promise<T>;
}

export default function SaasLoyaltyPage() {
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [balances, setBalances] = useState<LoyaltyBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("members");

  const [earnContactId, setEarnContactId] = useState("");
  const [earnAmount, setEarnAmount] = useState("");
  const [earnReason, setEarnReason] = useState("");
  const [earning, setEarning] = useState(false);

  const [redeemContactId, setRedeemContactId] = useState("");
  const [redeemPoints, setRedeemPoints] = useState("");
  const [redeemReason, setRedeemReason] = useState("");
  const [adjustMode, setAdjustMode] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  const [cfgPPE, setCfgPPE] = useState("");
  const [cfgActive, setCfgActive] = useState(true);
  const [cfgTiers, setCfgTiers] = useState<LoyaltyTier[]>([]);
  const [saving, setSaving] = useState(false);

  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [txns, setTxns] = useState<LoyaltyTransaction[]>([]);
  const [txnsLoading, setTxnsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, b] = await Promise.all([
        apiFetch<LoyaltyProgram>("/api/saas/loyalty?resource=program"),
        apiFetch<LoyaltyBalance[]>("/api/saas/loyalty?resource=balances"),
      ]);
      setProgram(p);
      setBalances(Array.isArray(b) ? b : []);
      setCfgPPE(String(num(p?.pointsPerEur)));
      setCfgActive(Boolean(p?.active));
      setCfgTiers(Array.isArray(p?.tiers) ? p.tiers.map((t) => ({ ...t })) : []);
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function flashOk(msg: string) {
    setActionOk(msg);
    setActionError(null);
    window.setTimeout(() => setActionOk(null), 3500);
  }

  const openMember = useCallback(async (contactId: string) => {
    setSelectedContact(contactId);
    setTxnsLoading(true);
    setActionError(null);
    try {
      const list = await apiFetch<LoyaltyTransaction[]>(
        `/api/saas/loyalty?resource=transactions&contactId=${encodeURIComponent(contactId)}`,
      );
      setTxns(Array.isArray(list) ? list : []);
    } catch (e) {
      setActionError(String((e as Error).message));
      setTxns([]);
    } finally {
      setTxnsLoading(false);
    }
  }, []);

  async function earn() {
    if (!earnContactId.trim() || !earnAmount.trim()) return;
    setEarning(true);
    setActionError(null);
    try {
      await apiFetch("/api/saas/loyalty", {
        method: "POST",
        body: JSON.stringify({
          action: "earn",
          contactId: earnContactId.trim(),
          eurAmount: Number(earnAmount),
          reason: earnReason || undefined,
        }),
      });
      setEarnContactId("");
      setEarnAmount("");
      setEarnReason("");
      flashOk("Puntos otorgados");
      await load();
    } catch (e) {
      setActionError(String((e as Error).message));
    } finally {
      setEarning(false);
    }
  }

  async function redeemOrAdjust() {
    if (!redeemContactId.trim() || !redeemPoints.trim()) return;
    const puntos = Number(redeemPoints);
    if (!Number.isFinite(puntos) || puntos === 0) {
      setActionError("Indica una cantidad de puntos distinta de cero");
      return;
    }
    setRedeeming(true);
    setActionError(null);
    try {
      const contactId = redeemContactId.trim();
      if (adjustMode) {
        await apiFetch("/api/saas/loyalty", {
          method: "POST",
          body: JSON.stringify({
            action: "adjust",
            contactId,
            points: puntos,
            reason: redeemReason || undefined,
          }),
        });
        flashOk("Saldo ajustado");
      } else {
        if (puntos <= 0) {
          setActionError("Los puntos a canjear deben ser positivos");
          setRedeeming(false);
          return;
        }
        await apiFetch("/api/saas/loyalty", {
          method: "POST",
          body: JSON.stringify({
            action: "redeem",
            contactId,
            points: puntos,
            reason: redeemReason || undefined,
          }),
        });
        flashOk("Puntos canjeados");
      }
      setRedeemContactId("");
      setRedeemPoints("");
      setRedeemReason("");
      await load();
      if (selectedContact === contactId) {
        await openMember(contactId);
      }
    } catch (e) {
      setActionError(String((e as Error).message));
    } finally {
      setRedeeming(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setActionError(null);
    try {
      const tiers = cfgTiers
        .map((t) => ({ name: String(t.name ?? "").trim(), min_points: num(t.min_points) }))
        .filter((t) => t.name.length > 0);
      await apiFetch("/api/saas/loyalty", {
        method: "POST",
        body: JSON.stringify({
          action: "update-program",
          pointsPerEur: Number(cfgPPE),
          active: cfgActive,
          tiers,
        }),
      });
      flashOk("Configuración guardada");
      await load();
    } catch (e) {
      setActionError(String((e as Error).message));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SaasW3crmShell>
        <W3crmPageTitle mainTitle="Programa de Fidelización" parentTitle="Gestión" pageTitle="Fidelización" />
        <div className="container-fluid">
          <div className="row">
            <div className="col-xl-12">
              <W3crmContentBox titulo="Fidelización" icono="fa-solid fa-star">
                <W3crmCargando texto="Cargando programa de fidelización…" />
              </W3crmContentBox>
            </div>
          </div>
        </div>
      </SaasW3crmShell>
    );
  }

  if (error || !program) {
    return (
      <SaasW3crmShell>
        <W3crmPageTitle mainTitle="Programa de Fidelización" parentTitle="Gestión" pageTitle="Fidelización" />
        <div className="container-fluid">
          <div className="row">
            <div className="col-xl-12">
              <div className="alert alert-danger" role="alert">
                {error ?? "No se pudo cargar el programa"}
              </div>
              <button type="button" className="btn btn-primary" onClick={() => void load()}>
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </SaasW3crmShell>
    );
  }

  const p = program;
  const niveles = Array.isArray(p.tiers) ? p.tiers : [];
  const puntosPorEuro = num(p.pointsPerEur);
  const tierCount: Record<string, number> = {};
  for (const b of balances) {
    tierCount[b.tier] = (tierCount[b.tier] ?? 0) + 1;
  }
  const totalPoints = balances.reduce((sum, b) => sum + num(b.points), 0);
  const goldIdx = niveles.findIndex((t) => t.name === "Gold");
  const goldPlus =
    goldIdx >= 0
      ? Object.entries(tierCount)
          .filter(([t]) => niveles.findIndex((x) => x.name === t) >= goldIdx)
          .reduce((sum, [, n]) => sum + n, 0)
      : 0;
  const previstoEarn = earnAmount ? Math.floor(num(earnAmount) * puntosPorEuro) : 0;

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Programa de Fidelización" parentTitle="Gestión" pageTitle="Fidelización" />
      <div className="container-fluid">
        <div className="row">
          {actionError && (
            <div className="col-xl-12">
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {actionError}
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setActionError(null)} />
              </div>
            </div>
          )}
          {actionOk && (
            <div className="col-xl-12">
              <div className="alert alert-success" role="status">{actionOk}</div>
            </div>
          )}

          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Miembros" value={balances.length} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Puntos emitidos" value={pts(totalPoints)} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Gold+" value={goldPlus} accent /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Puntos / €" value={puntosPorEuro} /></div>

          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              {puntosPorEuro} punto(s)/€ · {niveles.length} niveles · {balances.length} miembros ·{" "}
              {p.active ? "Activo" : "Pausado"}
            </p>

            {niveles.length > 0 && (
              <div className="d-flex flex-wrap gap-2 mb-3">
                {niveles.map((tier, idx) => (
                  <span key={`${tier.name}-${idx}`} className="border rounded px-3 py-2 d-inline-flex align-items-center">
                    <span className={`badge ${tierBadge(tier.name)} me-2`}>{tier.name || "—"}</span>
                    <span className="text-muted fs-12 me-2">≥ {pts(tier.min_points)} pts</span>
                    <span className="fw-bold fs-14">{tierCount[tier.name] ?? 0}</span>
                  </span>
                ))}
              </div>
            )}

            {/* `role="tablist"` y `aria-label="Secciones fidelización"` venian del modulo original. */}
            <ul className="nav nav-tabs mb-3" role="tablist" aria-label="Secciones fidelización">
              {(["members", "earn", "redeem", "settings"] as const).map((t) => (
                <li className="nav-item" key={t} role="presentation">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    className={`nav-link ${tab === t ? "active" : ""}`}
                    onClick={() => setTab(t)}
                  >
                    {t === "members"
                      ? "Miembros"
                      : t === "earn"
                        ? "Dar puntos"
                        : t === "redeem"
                          ? "Canjear / Ajustar"
                          : "Configuración"}
                  </button>
                </li>
              ))}
            </ul>

            {tab === "members" && (
              <>
                <W3crmContentBox titulo="Miembros" icono="fa-solid fa-users">
                  {balances.length === 0 ? (
                    <W3crmEmptyState
                      title="Sin miembros"
                      description="Usa «Dar puntos» para enrolar el primer contacto."
                    />
                  ) : (
                    <W3crmDataTable
                      filas={balances}
                      etiqueta="miembros"
                      wrapperId="balances_wrapper"
                      porPagina={10}
                      columnas={[
                        { titulo: "Contacto" },
                        { titulo: "Nivel" },
                        { titulo: "Puntos" },
                        { titulo: "Actualizado" },
                        { titulo: "Gestión", alFinal: true },
                      ]}
                      render={(b) => (
                        <tr key={b.id || b.contactId}>
                          <td><code className="fs-12 text-break">{b.contactId || "—"}</code></td>
                          <td><span className={`badge ${tierBadge(b.tier)}`}>{b.tier || "—"}</span></td>
                          <td className="fw-bold">{pts(b.points)} pts</td>
                          <td>{fecha(b.updatedAt)}</td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-primary light btn-sm"
                              aria-expanded={selectedContact === b.contactId}
                              aria-label={`Ver historial de ${b.contactId}`}
                              onClick={() => void openMember(b.contactId)}
                            >
                              Ver historial
                            </button>
                          </td>
                        </tr>
                      )}
                    />
                  )}
                </W3crmContentBox>

                {selectedContact && (
                  <W3crmContentBox
                    titulo={`Historial · ${selectedContact}`}
                    icono="fa-solid fa-clock-rotate-left"
                    acciones={
                      <button type="button" className="btn btn-primary light btn-sm me-2" onClick={() => setSelectedContact(null)}>
                        Cerrar
                      </button>
                    }
                  >
                    {txnsLoading ? (
                      <W3crmCargando texto="Cargando transacciones…" />
                    ) : txns.length === 0 ? (
                      <W3crmEmptyState title="Sin transacciones" />
                    ) : (
                      <W3crmDataTable
                        filas={txns}
                        etiqueta="transacciones"
                        wrapperId="txns_wrapper"
                        porPagina={10}
                        reiniciarEn={selectedContact}
                        columnas={[{ titulo: "Tipo" }, { titulo: "Puntos" }, { titulo: "Fecha" }, { titulo: "Razón", alFinal: true }]}
                        render={(t) => {
                          const valor = num(t.points);
                          const mostrado = t.type === "redeem" ? -Math.abs(valor) : valor;
                          return (
                            <tr key={t.id}>
                              <td><span className={`badge ${txnBadge(t.type)}`}>{txnLabel(t.type)}</span></td>
                              <td className="fw-bold">
                                {mostrado > 0 ? "+" : ""}
                                {mostrado} pts
                              </td>
                              <td>{fechaHora(t.createdAt)}</td>
                              <td className="text-end text-muted">{t.reason || "—"}</td>
                            </tr>
                          );
                        }}
                      />
                    )}
                  </W3crmContentBox>
                )}
              </>
            )}

            {tab === "earn" && (
              <W3crmContentBox titulo="Dar puntos a un contacto" icono="fa-solid fa-plus">
                {!p.active && (
                  <p className="fs-12 text-muted">
                    El programa está pausado; puedes seguir otorgando puntos, pero conviene reactivarlo en Configuración.
                  </p>
                )}
                <div className="row">
                  <div className="col-xl-4 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="earn-contact" className="text-black font-w600">Contact ID (UUID)</label>
                      <input id="earn-contact" className="form-control" placeholder="uuid-del-contacto"
                        value={earnContactId} onChange={(ev) => setEarnContactId(ev.target.value)} />
                    </div>
                  </div>
                  <div className="col-xl-4 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="earn-amount" className="text-black font-w600">Importe en euros (€)</label>
                      <input id="earn-amount" className="form-control" type="number" min={0.01} step={0.01} placeholder="150"
                        value={earnAmount} onChange={(ev) => setEarnAmount(ev.target.value)} />
                      {earnAmount ? <p className="fs-12 text-muted mt-1 mb-0">= {previstoEarn} puntos</p> : null}
                    </div>
                  </div>
                  <div className="col-xl-4 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="earn-reason" className="text-black font-w600">Razón (opcional)</label>
                      <input id="earn-reason" className="form-control" placeholder="Compra #12345"
                        value={earnReason} onChange={(ev) => setEarnReason(ev.target.value)} />
                    </div>
                  </div>
                  <div className="col-xl-12">
                    <div className="text-end">
                      <button type="button" className="btn btn-primary"
                        disabled={earning || !earnContactId.trim() || !earnAmount.trim()}
                        onClick={() => void earn()}>
                        {earning ? "Procesando…" : "Dar puntos"}
                      </button>
                    </div>
                  </div>
                </div>
              </W3crmContentBox>
            )}

            {tab === "redeem" && (
              <W3crmContentBox titulo={adjustMode ? "Ajuste manual" : "Canjear puntos"} icono="fa-solid fa-gift">
                <div className="mb-3" role="group" aria-label="Modo de operación">
                  <button type="button" aria-pressed={!adjustMode}
                    className={`btn btn-sm me-1 ${!adjustMode ? "btn-primary" : "btn-primary light"}`}
                    onClick={() => setAdjustMode(false)}>
                    Canjear
                  </button>
                  <button type="button" aria-pressed={adjustMode}
                    className={`btn btn-sm ${adjustMode ? "btn-primary" : "btn-primary light"}`}
                    onClick={() => setAdjustMode(true)}>
                    Ajuste manual
                  </button>
                </div>
                <p className="fs-14 text-muted">
                  {adjustMode
                    ? "Suma o resta puntos (usa valores negativos para restar). El saldo no baja de 0."
                    : "Resta puntos del saldo del contacto (canje de recompensa)."}
                </p>
                <div className="row">
                  <div className="col-xl-4 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="rdm-contact" className="text-black font-w600">Contact ID (UUID)</label>
                      <input id="rdm-contact" className="form-control" placeholder="uuid-del-contacto"
                        value={redeemContactId} onChange={(ev) => setRedeemContactId(ev.target.value)} />
                    </div>
                  </div>
                  <div className="col-xl-4 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="rdm-pts" className="text-black font-w600">
                        Puntos {adjustMode ? "(±)" : "a canjear"}
                      </label>
                      <input id="rdm-pts" className="form-control" type="number" step={1}
                        placeholder={adjustMode ? "-50" : "100"}
                        value={redeemPoints} onChange={(ev) => setRedeemPoints(ev.target.value)} />
                    </div>
                  </div>
                  <div className="col-xl-4 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="rdm-reason" className="text-black font-w600">Razón (opcional)</label>
                      <input id="rdm-reason" className="form-control"
                        placeholder={adjustMode ? "Corrección inventario" : "Cupón 10€"}
                        value={redeemReason} onChange={(ev) => setRedeemReason(ev.target.value)} />
                    </div>
                  </div>
                  <div className="col-xl-12">
                    <div className="text-end">
                      <button type="button" className="btn btn-primary"
                        disabled={redeeming || !redeemContactId.trim() || !redeemPoints.trim()}
                        onClick={() => void redeemOrAdjust()}>
                        {redeeming ? "Procesando…" : adjustMode ? "Aplicar ajuste" : "Canjear puntos"}
                      </button>
                    </div>
                  </div>
                </div>
              </W3crmContentBox>
            )}

            {tab === "settings" && (
              <W3crmContentBox titulo="Configuración del programa" icono="fa-solid fa-gear">
                <div className="row">
                  <div className="col-xl-4 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="cfg-ppe" className="text-black font-w600">Puntos por euro</label>
                      <input id="cfg-ppe" className="form-control" type="number" min={0.1} step={0.1}
                        value={cfgPPE} onChange={(ev) => setCfgPPE(ev.target.value)} />
                    </div>
                  </div>
                  <div className="col-xl-4 col-sm-6">
                    <div className="form-check mt-4 mb-3">
                      <input className="form-check-input" type="checkbox" id="cfg-activo"
                        checked={cfgActive} onChange={(ev) => setCfgActive(ev.target.checked)} />
                      <label className="form-check-label" htmlFor="cfg-activo">Programa activo</label>
                    </div>
                  </div>
                  <div className="col-xl-12">
                    <p className="text-black font-w600 mb-2">Niveles</p>
                    {cfgTiers.length === 0 ? (
                      <p className="fs-12 text-muted">El programa no tiene niveles configurados.</p>
                    ) : (
                      cfgTiers.map((tier, idx) => (
                        <div className="row" key={`${tier.name}-${idx}`}>
                          <div className="col-sm-8">
                            <div className="form-group mb-3">
                              <input className="form-control" aria-label={`Nombre nivel ${idx + 1}`}
                                value={tier.name}
                                onChange={(ev) => {
                                  const next = [...cfgTiers];
                                  next[idx] = { ...tier, name: ev.target.value };
                                  setCfgTiers(next);
                                }} />
                            </div>
                          </div>
                          <div className="col-sm-4">
                            <div className="form-group mb-3">
                              <input className="form-control" type="number" min={0}
                                aria-label={`Mínimo puntos nivel ${idx + 1}`}
                                value={tier.min_points}
                                onChange={(ev) => {
                                  const next = [...cfgTiers];
                                  next[idx] = { ...tier, min_points: Number(ev.target.value) || 0 };
                                  setCfgTiers(next);
                                }} />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="col-xl-12">
                    <div className="text-end">
                      <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void saveSettings()}>
                        {saving ? "Guardando…" : "Guardar configuración"}
                      </button>
                    </div>
                  </div>
                </div>
              </W3crmContentBox>
            )}
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
