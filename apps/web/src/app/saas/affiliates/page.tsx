"use client";

/**
 * /saas/affiliates sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: alta de enlace, listados y configuracion -> `W3crmContentBox` +
 * `W3crmDataTable`; las tres secciones -> `nav nav-tabs`; KPIs ->
 * `W3crmKpiTile`. Sin componentes nuevos.
 *
 * Inventario: sin `data-testid`; lo cubre `saas-modules.spec.ts` (la ruta carga
 * sin 500) y `expectUnauthorizedApi(request, "/api/saas/affiliates")`. El modulo
 * ya traia un `role="tablist"` con `aria-label="Secciones afiliados"` y tres
 * `role="tab"` ("Enlaces", "Comisiones", "Configuración"): se conservan tal
 * cual, ahora sobre el `nav nav-tabs` de la plantilla.
 *
 * Logica de NELVYON intacta: `/api/saas/affiliates` con sus dos recursos
 * (`?resource=stats`, `?resource=commissions`) y sus cinco acciones POST
 * (`create-link`, `set-link-active`, `approve-commission`, `mark-paid`,
 * `update-program`); `apiFetch` propagando el `code` del error; el mensaje
 * especifico de `CEO_GATE` al marcar pagada; el filtro de comisiones por
 * estado; el copiado con aviso de 2 s; el aviso de exito de 3,5 s y el bloqueo
 * del alta cuando el programa esta pausado.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable } from "@/features/saas-w3crm/components/W3crmContentBox";

interface AffiliateProgram {
  id: string;
  commissionPct: number;
  cookieDays: number;
  active: boolean;
}
interface AffiliateLink {
  id: string;
  code: string;
  affiliateUserId: string;
  clicks: number;
  conversions: number;
  active: boolean;
  createdAt: string;
  affiliateUrl: string;
}
interface AffiliateCommission {
  id: string;
  affiliateUserId: string;
  amount: number;
  commissionPct: number;
  commissionAmount: number;
  status: "pending" | "approved" | "paid";
  stripeTransferId: string | null;
  createdAt: string;
}
interface ProgramStats {
  program: AffiliateProgram;
  links: AffiliateLink[];
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  totalConversions: number;
}

type Tab = "links" | "commissions" | "settings";
type CommissionFilter = "all" | "pending" | "approved" | "paid";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  paid: "Pagada",
};
const STATUS_BADGE: Record<string, string> = {
  pending: "badge-warning",
  approved: "badge-primary",
  paid: "badge-success",
};

/** Un estado fuera de catalogo pintaba `undefined`. */
function etiquetaEstado(s: string): string {
  return STATUS_LABEL[s] ?? (s ? String(s) : "—");
}
function badgeEstado(s: string): string {
  return STATUS_BADGE[s] ?? "badge-secondary";
}
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
/** Importes que pueden llegar nulos o como texto: `toFixed` reventaba. */
function eur(v: unknown): string {
  return `${num(v).toFixed(2)} €`;
}
function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-ES");
}

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
  });
  if (!r.ok) {
    const e = (await r.json().catch(() => ({}))) as { error?: string; code?: string };
    const msg = String(e.error ?? r.statusText);
    throw Object.assign(new Error(msg), { code: e.code });
  }
  return r.json() as Promise<T>;
}

export default function SaasAffiliatesPage() {
  const [stats, setStats] = useState<ProgramStats | null>(null);
  const [commissions, setComms] = useState<AffiliateCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("links");
  const [commFilter, setCommFilter] = useState<CommissionFilter>("all");
  const [newUserId, setNewUserId] = useState("");
  const [creating, setCreating] = useState(false);
  const [cfgCommPct, setCfgCommPct] = useState("");
  const [cfgCookieDays, setCfgCookieDays] = useState("");
  const [cfgActive, setCfgActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, c] = await Promise.all([
        apiFetch<ProgramStats>("/api/saas/affiliates?resource=stats"),
        apiFetch<AffiliateCommission[]>("/api/saas/affiliates?resource=commissions"),
      ]);
      setStats(s);
      setComms(Array.isArray(c) ? c : []);
      setCfgCommPct(String(num(s?.program?.commissionPct)));
      setCfgCookieDays(String(num(s?.program?.cookieDays)));
      setCfgActive(Boolean(s?.program?.active));
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

  async function createLink() {
    if (!newUserId.trim()) return;
    setCreating(true);
    setActionError(null);
    try {
      await apiFetch("/api/saas/affiliates", {
        method: "POST",
        body: JSON.stringify({ action: "create-link", affiliateUserId: newUserId.trim() }),
      });
      setNewUserId("");
      flashOk("Enlace creado");
      await load();
    } catch (e) {
      setActionError(String((e as Error).message));
    } finally {
      setCreating(false);
    }
  }

  async function toggleLink(link: AffiliateLink) {
    setBusyId(link.id);
    setActionError(null);
    try {
      await apiFetch("/api/saas/affiliates", {
        method: "POST",
        body: JSON.stringify({ action: "set-link-active", id: link.id, active: !link.active }),
      });
      flashOk(link.active ? "Enlace pausado" : "Enlace reactivado");
      await load();
    } catch (e) {
      setActionError(String((e as Error).message));
    } finally {
      setBusyId(null);
    }
  }

  async function approveCommission(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await apiFetch("/api/saas/affiliates", {
        method: "POST",
        body: JSON.stringify({ action: "approve-commission", id }),
      });
      flashOk("Comisión aprobada");
      await load();
    } catch (e) {
      setActionError(String((e as Error).message));
    } finally {
      setBusyId(null);
    }
  }

  async function markPaid(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await apiFetch("/api/saas/affiliates", {
        method: "POST",
        body: JSON.stringify({ action: "mark-paid", id }),
      });
      flashOk("Comisión marcada como pagada");
      await load();
    } catch (e) {
      const err = e as Error & { code?: string };
      setActionError(
        err.code === "CEO_GATE"
          ? `${err.message} (los pagos reales requieren autorización CEO; la comisión permanece aprobada).`
          : String(err.message),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function saveConfig() {
    setSaving(true);
    setActionError(null);
    try {
      await apiFetch("/api/saas/affiliates", {
        method: "POST",
        body: JSON.stringify({
          action: "update-program",
          commissionPct: Number(cfgCommPct),
          cookieDays: Number(cfgCookieDays),
          active: cfgActive,
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

  async function copyUrl(link: AffiliateLink) {
    try {
      // En contextos sin permiso el objeto `clipboard` ni siquiera existe.
      await navigator.clipboard?.writeText(link.affiliateUrl ?? "");
      setCopiedId(link.id);
      window.setTimeout(() => setCopiedId((cur) => (cur === link.id ? null : cur)), 2000);
    } catch {
      setActionError("No se pudo copiar al portapapeles");
    }
  }

  const enlaces = Array.isArray(stats?.links) ? stats.links : [];
  const filteredCommissions =
    commFilter === "all" ? commissions : commissions.filter((c) => c.status === commFilter);

  if (loading) {
    return (
      <SaasW3crmShell>
        <W3crmPageTitle mainTitle="Programa de Afiliados" parentTitle="Gestión" pageTitle="Afiliados" />
        <div className="container-fluid">
          <div className="row">
            <div className="col-xl-12">
              <W3crmContentBox titulo="Afiliados" icono="fa-solid fa-handshake">
                <W3crmCargando texto="Cargando programa de afiliados…" />
              </W3crmContentBox>
            </div>
          </div>
        </div>
      </SaasW3crmShell>
    );
  }

  if (error || !stats) {
    return (
      <SaasW3crmShell>
        <W3crmPageTitle mainTitle="Programa de Afiliados" parentTitle="Gestión" pageTitle="Afiliados" />
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

  const s = stats;
  const programaActivo = Boolean(s.program?.active);

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Programa de Afiliados" parentTitle="Gestión" pageTitle="Afiliados" />
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

          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Conversiones" value={num(s.totalConversions)} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Pendiente pago" value={eur(s.pendingAmount)} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Aprobado" value={eur(s.approvedAmount)} accent /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Pagado" value={eur(s.paidAmount)} /></div>

          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              Comisión {num(s.program?.commissionPct)}% · Cookie {num(s.program?.cookieDays)} días ·{" "}
              {enlaces.length} enlaces · {programaActivo ? "Activo" : "Pausado"}
            </p>

            {/* `role="tablist"` y `aria-label="Secciones afiliados"` venian del modulo original. */}
            <ul className="nav nav-tabs mb-3" role="tablist" aria-label="Secciones afiliados">
              {(["links", "commissions", "settings"] as const).map((t) => (
                <li className="nav-item" key={t} role="presentation">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    className={`nav-link ${tab === t ? "active" : ""}`}
                    onClick={() => setTab(t)}
                  >
                    {t === "links" ? "Enlaces" : t === "commissions" ? "Comisiones" : "Configuración"}
                  </button>
                </li>
              ))}
            </ul>

            {tab === "links" && (
              <>
                <W3crmContentBox titulo="Nuevo enlace de afiliado" icono="fa-solid fa-link">
                  <div className="row align-items-end">
                    <div className="col-xl-8 col-sm-6">
                      <div className="form-group mb-3">
                        <label htmlFor="aff-user" className="text-black font-w600">
                          ID del afiliado (email, user_id…)
                        </label>
                        <input
                          id="aff-user"
                          className="form-control"
                          placeholder="john@empresa.com"
                          value={newUserId}
                          onChange={(ev) => setNewUserId(ev.target.value)}
                        />
                      </div>
                    </div>
                    <div className="col-xl-4 col-sm-6">
                      <div className="form-group mb-3">
                        <button
                          type="button"
                          className="btn btn-primary w-100"
                          disabled={creating || !newUserId.trim() || !programaActivo}
                          onClick={() => void createLink()}
                        >
                          {creating ? "Creando…" : "Crear enlace"}
                        </button>
                      </div>
                    </div>
                  </div>
                  {!programaActivo && (
                    <p className="fs-12 text-muted mb-0">
                      El programa está pausado. Reactívalo en Configuración para crear nuevos enlaces.
                    </p>
                  )}
                </W3crmContentBox>

                <W3crmContentBox titulo="Enlaces" icono="fa-solid fa-share-nodes">
                  {enlaces.length === 0 ? (
                    <W3crmEmptyState title="Sin enlaces" description="Crea el primero con el formulario de arriba." />
                  ) : (
                    <W3crmDataTable
                      filas={enlaces}
                      etiqueta="enlaces"
                      wrapperId="links_wrapper"
                      porPagina={10}
                      columnas={[
                        { titulo: "Enlace" },
                        { titulo: "Afiliado" },
                        { titulo: "Clics" },
                        { titulo: "Conversiones" },
                        { titulo: "Estado" },
                        { titulo: "Gestión", alFinal: true },
                      ]}
                      render={(link) => (
                        <tr key={link.id}>
                          <td><code className="fs-12 text-break">{link.affiliateUrl || "—"}</code></td>
                          <td>
                            <span className="fw-bold">{link.affiliateUserId || "—"}</span>
                            <div className="text-muted fs-12">Código {link.code || "—"}</div>
                          </td>
                          <td>{num(link.clicks)}</td>
                          <td>{num(link.conversions)}</td>
                          <td>
                            <span className={`badge ${link.active ? "badge-success" : "badge-secondary"}`}>
                              {link.active ? "Activo" : "Pausado"}
                            </span>
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-primary light btn-sm me-1"
                              aria-label={`Copiar enlace de ${link.affiliateUserId || link.code}`}
                              onClick={() => void copyUrl(link)}
                            >
                              {copiedId === link.id ? "Copiado" : "Copiar"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary light btn-sm"
                              disabled={busyId === link.id}
                              aria-label={`${link.active ? "Pausar" : "Reactivar"} enlace de ${link.affiliateUserId || link.code}`}
                              onClick={() => void toggleLink(link)}
                            >
                              {link.active ? "Pausar" : "Reactivar"}
                            </button>
                          </td>
                        </tr>
                      )}
                    />
                  )}
                </W3crmContentBox>
              </>
            )}

            {tab === "commissions" && (
              <W3crmContentBox titulo="Comisiones" icono="fa-solid fa-money-bill">
                <div className="mb-3" role="group" aria-label="Filtrar comisiones">
                  {(["all", "pending", "approved", "paid"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={commFilter === f}
                      className={`btn btn-sm me-1 mb-1 ${commFilter === f ? "btn-primary" : "btn-primary light"}`}
                      onClick={() => setCommFilter(f)}
                    >
                      {f === "all" ? "Todas" : STATUS_LABEL[f]}
                    </button>
                  ))}
                </div>
                {filteredCommissions.length === 0 ? (
                  <W3crmEmptyState
                    title="Sin comisiones"
                    description={
                      commFilter !== "all"
                        ? `No hay comisiones en estado «${STATUS_LABEL[commFilter]}».`
                        : "Todavía no hay comisiones registradas."
                    }
                  />
                ) : (
                  <W3crmDataTable
                    filas={filteredCommissions}
                    etiqueta="comisiones"
                    wrapperId="commissions_wrapper"
                    porPagina={10}
                    reiniciarEn={commFilter}
                    columnas={[
                      { titulo: "Afiliado" },
                      { titulo: "Importe" },
                      { titulo: "Comisión" },
                      { titulo: "Fecha" },
                      { titulo: "Estado" },
                      { titulo: "Gestión", alFinal: true },
                    ]}
                    render={(c) => (
                      <tr key={c.id}>
                        <td>
                          <span className="fw-bold">{c.affiliateUserId || "—"}</span>
                          {c.stripeTransferId ? (
                            <div className="text-muted fs-12">Transfer {c.stripeTransferId}</div>
                          ) : null}
                        </td>
                        <td>{eur(c.amount)}</td>
                        <td>
                          {eur(c.commissionAmount)}{" "}
                          <span className="text-muted fs-12">({num(c.commissionPct)}%)</span>
                        </td>
                        <td>{fecha(c.createdAt)}</td>
                        <td><span className={`badge ${badgeEstado(c.status)}`}>{etiquetaEstado(c.status)}</span></td>
                        <td className="text-end">
                          {c.status === "pending" && (
                            <button
                              type="button"
                              className="btn btn-primary light btn-sm"
                              disabled={busyId === c.id}
                              aria-label={`Aprobar comisión de ${c.affiliateUserId || c.id}`}
                              onClick={() => void approveCommission(c.id)}
                            >
                              Aprobar
                            </button>
                          )}
                          {c.status === "approved" && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={busyId === c.id}
                              aria-label={`Marcar pagada la comisión de ${c.affiliateUserId || c.id}`}
                              onClick={() => void markPaid(c.id)}
                            >
                              Marcar pagada
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                  />
                )}
              </W3crmContentBox>
            )}

            {tab === "settings" && (
              <W3crmContentBox titulo="Configuración del programa" icono="fa-solid fa-gear">
                <div className="row">
                  <div className="col-xl-4 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="cfg-pct" className="text-black font-w600">Comisión (%)</label>
                      <input
                        id="cfg-pct"
                        className="form-control"
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={cfgCommPct}
                        onChange={(ev) => setCfgCommPct(ev.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-xl-4 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="cfg-cookie" className="text-black font-w600">Ventana de cookie (días)</label>
                      <input
                        id="cfg-cookie"
                        className="form-control"
                        type="number"
                        min={1}
                        max={3650}
                        value={cfgCookieDays}
                        onChange={(ev) => setCfgCookieDays(ev.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-xl-4 col-sm-6">
                    <div className="form-check mt-4 mb-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="cfg-activo"
                        checked={cfgActive}
                        onChange={(ev) => setCfgActive(ev.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="cfg-activo">Programa activo</label>
                    </div>
                  </div>
                  <div className="col-xl-12">
                    <div className="text-end">
                      <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void saveConfig()}>
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
