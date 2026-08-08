"use client";

/**
 * /saas/subcuentas sobre la pantalla `(apps)/user-roles` de la plantilla
 * oficial W3CRM.
 *
 * Marcado de la plantilla: `container-fluid` > `row` > cabecera
 * `d-flex align-items-center justify-content-between` con `h4.heading mb-3` y
 * `btn btn-primary btn-sm mb-3`; columna izquierda `col-xl-3 col-lg-4` con las
 * `card` de `ul.personal-info`; columna derecha `col-xl-9 col-lg-8` con las dos
 * listas (`W3crmJobList`, portado de `JobManagementList`); y el offcanvas
 * `offcanvas-end customeoff` con `table role-tble` y sus
 * `form-check custom-checkbox checkbox-primary` / `checkbox-warning`.
 *
 * Logica de NELVYON intacta: tipos `Subcuenta` y `SubcuentaUsage`, `PLAN_CFG`,
 * `STATUS_CFG`, `CreateModal`, `UsagePanel`, `TwilioRebillingPanel`, los seis
 * `useState`, `load`, `doAction` y `doCancel`, con los endpoints
 * `/api/saas/subcuentas`, `/api/saas/subcuentas?id={id}` y
 * `/api/saas/twilio/rebilling`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "react-bootstrap";

import {
  W3crmEmployeeOffcanvas,
  type W3crmOffcanvasHandle,
} from "@/features/saas-w3crm/components/W3crmUserTabs";
import { W3crmIconButton, W3crmJobList, type W3crmJobListRow } from "@/features/saas-w3crm/components/W3crmJobList";
import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";

type SubcuentaPlan = "starter" | "pro" | "agency";
type SubcuentaStatus = "active" | "suspended" | "cancelled";

interface Subcuenta {
  id: string;
  agencyTenantId: string;
  tenantId: string;
  name: string;
  email: string;
  plan: SubcuentaPlan;
  status: SubcuentaStatus;
  maxContacts: number;
  maxCampaigns: number;
  stripeConnectPaymentEnabled: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SubcuentaUsage {
  contacts: number;
  campaigns: number;
  workflows: number;
  meter?: { emailsSent: number; smsSent: number; apiCalls: number; workflowRuns: number };
}

/** `color` traducido a las clases de badge de W3CRM. */
const PLAN_CFG: Record<SubcuentaPlan, { label: string; color: string }> = {
  starter: { label: "Starter", color: "badge-primary" },
  pro:     { label: "Pro",     color: "badge-primary" },
  agency:  { label: "Agency",  color: "badge-warning" },
};

const STATUS_CFG: Record<SubcuentaStatus, { label: string; tone: string }> = {
  active:    { label: "Activa",     tone: "badge-success" },
  suspended: { label: "Suspendida", tone: "badge-warning" },
  cancelled: { label: "Cancelada",  tone: "badge-danger" },
};

/** Un plan o estado fuera de catalogo no puede dejar la pantalla en blanco. */
const PLAN_DESCONOCIDO = { label: "Sin plan", color: "badge-secondary" };
const ESTADO_DESCONOCIDO = { label: "Desconocido", tone: "badge-secondary" };

function planDe(plan: SubcuentaPlan | string) {
  return PLAN_CFG[plan as SubcuentaPlan] ?? PLAN_DESCONOCIDO;
}
function estadoDe(status: SubcuentaStatus | string) {
  return STATUS_CFG[status as SubcuentaStatus] ?? ESTADO_DESCONOCIDO;
}
/** Importes y contadores que pueden llegar ausentes en un payload degradado. */
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function fmtFecha(s: string): string {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-ES");
}

// ── Create modal — formulario real dentro del offcanvas de la plantilla ────────
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<SubcuentaPlan>("starter");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { setError("Nombre y email son obligatorios"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/saas/subcuentas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), plan, notes: notes.trim() || undefined }),
      });
      const d = await res.json() as { subcuenta?: Subcuenta; error?: string };
      if (!res.ok) { setError(d.error ?? "Error al crear subcuenta"); return; }
      onCreated(); onClose();
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={save} data-testid="form-subcuenta">
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <div className="col-xl-12 mb-3">
        <label htmlFor="sub-nombre" className="form-label font-w500">
          Nombre de la cuenta<span className="text-danger">*</span>
        </label>
        <input id="sub-nombre" type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Agencia Cliente SL" />
      </div>
      <div className="col-xl-12 mb-3">
        <label htmlFor="sub-email" className="form-label font-w500">
          Email de contacto<span className="text-danger">*</span>
        </label>
        <input id="sub-email" type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} placeholder="contacto@cliente.com" />
      </div>

      {/* Plan y limites — `table role-tble` de la plantilla */}
      <h4 className="heading">Plan de la subcuenta</h4>
      <div className="table-responsive">
        <table id="role" className="table role-tble">
          <thead>
            <tr>
              <th>Plan</th>
              <th className="text-end">Seleccionar</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(PLAN_CFG) as SubcuentaPlan[]).map((p, ind) => (
              <tr key={p}>
                <td>{planDe(p).label}</td>
                <td>
                  <div className={`form-check custom-checkbox ${plan === p ? "checkbox-primary" : "checkbox-warning"}`}>
                    <input
                      type="radio"
                      name="sub-plan"
                      className="form-check-input"
                      id={`planinputcheck${ind + 11}`}
                      checked={plan === p}
                      onChange={() => setPlan(p)}
                    />
                    <label className="form-check-label" htmlFor={`planinputcheck${ind + 11}`}>
                      {planDe(p).label}
                    </label>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="col-xl-12 mb-3">
        <label htmlFor="sub-notas" className="form-label font-w500">Notas internas</label>
        <input id="sub-notas" type="text" className="form-control" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas opcionales…" />
      </div>
      <div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? "Creando…" : "Crear subcuenta"}
        </button>{" "}
        <button type="button" className="btn btn-light btn-sm" onClick={onClose}>Descartar</button>
      </div>
    </form>
  );
}

// ── Usage panel ────────────────────────────────────────────────────────────────
function UsagePanel({ sub, onClose }: { sub: Subcuenta; onClose: () => void }) {
  const [usage, setUsage] = useState<SubcuentaUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/saas/subcuentas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "usage", id: sub.id }) })
      .then(r => r.json() as Promise<{ usage?: SubcuentaUsage }>)
      .then(d => setUsage(d.usage ?? null))
      .catch(() => setUsage(null))
      .finally(() => setLoading(false));
  }, [sub.id]);

  return (
    <Modal className="modal fade" show onHide={onClose} centered>
      <div className="modal-header">
        <h5 className="modal-title">Uso: {sub.name}</h5>
        <button type="button" className="btn-close" onClick={onClose} aria-label="Cerrar" />
      </div>
      <div className="modal-body" data-testid="panel-uso">
        {loading ? (
          <div className="d-flex align-items-center justify-content-center py-4" role="status">
            <div className="spinner-border text-primary me-3" aria-hidden="true" />
            <span className="text-muted">Cargando…</span>
          </div>
        ) : (
          [
            { label: "Contactos", value: num(usage?.contacts), max: num(sub.maxContacts) },
            { label: "Campañas", value: num(usage?.campaigns), max: num(sub.maxCampaigns) },
            { label: "Workflows activos", value: num(usage?.workflows), max: null },
            { label: "Emails (mes)", value: num(usage?.meter?.emailsSent), max: null },
            { label: "SMS (mes)", value: num(usage?.meter?.smsSent), max: null },
            { label: "Workflows (mes)", value: num(usage?.meter?.workflowRuns), max: null },
            { label: "API calls (mes)", value: num(usage?.meter?.apiCalls), max: null },
          ].map(({ label, value, max }) => (
            <div className="mb-3" key={label}>
              <div className="d-flex justify-content-between fs-13 text-muted mb-1">
                <span>{label}</span>
                <span>
                  {value.toLocaleString("es-ES")}
                  {max ? ` / ${max.toLocaleString("es-ES")}` : ""}
                </span>
              </div>
              {max ? (
                <div className="progress" style={{ height: 6 }}>
                  <div
                    className="progress-bar bg-primary"
                    style={{ width: `${Math.min(100, (value / max) * 100)}%`, height: 6 }}
                    role="progressbar"
                    aria-valuenow={Math.min(100, Math.round((value / max) * 100))}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Uso de ${label}`}
                  />
                </div>
              ) : null}
            </div>
          ))
        )}
        <button type="button" className="btn btn-primary light w-100" onClick={onClose}>Cerrar</button>
      </div>
    </Modal>
  );
}

// ── Twilio rebilling panel — segunda lista de `(apps)/user-roles` ──────────────
function TwilioRebillingPanel() {
  const [summary, setSummary] = useState<{ pendingRetail: number; totalSms: number } | null>(null);
  const [entries, setEntries] = useState<Array<{ subcuentaId: string; period: string; smsCount: number; retailEur: number; status: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/twilio/rebilling");
      if (res.ok) {
        const d = await res.json() as { summary?: { pendingRetail: number; totalSms: number }; entries?: typeof entries };
        setSummary(d.summary ?? null);
        setEntries(Array.isArray(d.entries) ? d.entries : []);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filas: W3crmJobListRow[] = entries.map((e, i) => ({
    clave: `${e.subcuentaId}-${e.period}-${i}`,
    iniciales: (e.subcuentaId || "?").slice(0, 2).toUpperCase(),
    nombre: e.subcuentaId,
    subtitulo: `${num(e.smsCount).toLocaleString("es-ES")} SMS`,
    fecha: e.period,
    ultimaActividad: (
      <span className={`badge badge-sm ${e.status === "pending" ? "badge-warning" : "badge-success"}`}>
        €{num(e.retailEur).toFixed(2)}
      </span>
    ),
    acciones: null,
  }));

  return (
    <>
      <div className="d-flex align-items-center justify-content-between">
        <h4 className="heading mb-0">
          <i className="fa-solid fa-comment-sms text-primary me-3 mb-3"></i> Twilio rebilling (3× markup)
        </h4>
        <button
          type="button"
          className="btn btn-primary btn-sm mb-3"
          disabled={rolling}
          onClick={async () => {
            setRolling(true);
            try {
              await fetch("/api/saas/twilio/rebilling", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
              await load();
            } finally { setRolling(false); }
          }}
        >
          {rolling ? "Calculando…" : "Rollup mes actual"}
        </button>
      </div>
      <div className="card h-auto">
        <div className="card-body">
          <div className="row">
            {[
              { label: "Retail pendiente", value: `€${num(summary?.pendingRetail).toFixed(2)}` },
              { label: "SMS totales", value: num(summary?.totalSms).toLocaleString("es-ES") },
              { label: "Entradas ledger", value: String(entries.length) },
            ].map(({ label, value }) => (
              <div className="col-sm-4" key={label}>
                <span className="d-block text-muted fs-13 text-uppercase mb-1">{label}</span>
                <h3 className="mb-0">{loading ? "…" : value}</h3>
              </div>
            ))}
          </div>
        </div>
      </div>
      <W3crmJobList
        titulo="Ledger de rebilling"
        icono="fa-solid fa-file-invoice"
        columnas={["Subcuenta", "Periodo", "Retail", "Acción"]}
        filas={filas}
        cargando={loading}
        vacio={
          <>
            <h5 className="mb-1">Sin entradas de rebilling</h5>
            <p className="mb-0 text-muted fs-14">Ejecuta el rollup del mes para generarlas.</p>
          </>
        }
      />
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SaasSubcuentasPage() {
  const [subcuentas, setSubcuentas] = useState<Subcuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [usageSub, setUsageSub] = useState<Subcuenta | null>(null);
  const [filterStatus, setFilterStatus] = useState<SubcuentaStatus | "all">("all");
  const [actioning, setActioning] = useState<string | null>(null);
  const offcanvasRef = useRef<W3crmOffcanvasHandle>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/subcuentas");
      if (res.ok) {
        const d = await res.json() as { subcuentas?: Subcuenta[] };
        setSubcuentas(Array.isArray(d.subcuentas) ? d.subcuentas : []);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function doAction(action: "suspend" | "reactivate", id: string) {
    setActioning(id);
    try {
      await fetch("/api/saas/subcuentas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id }) });
      void load();
    } finally { setActioning(null); }
  }

  async function doCancel(id: string) {
    if (!window.confirm("¿Cancelar definitivamente esta subcuenta? Esta acción no se puede deshacer.")) return;
    setActioning(id);
    try {
      await fetch(`/api/saas/subcuentas?id=${id}`, { method: "DELETE" });
      void load();
    } finally { setActioning(null); }
  }

  function abrirAlta() {
    setShowCreate(true);
    offcanvasRef.current?.showEmployeModal();
  }
  function cerrarAlta() {
    setShowCreate(false);
    offcanvasRef.current?.hideEmployeModal();
  }

  const filtered = subcuentas.filter(s => filterStatus === "all" || s.status === filterStatus);

  const filas: W3crmJobListRow[] = filtered.map((sub) => {
    const pc = planDe(sub.plan);
    const sc = estadoDe(sub.status);
    const isBusy = actioning === sub.id;
    return {
      clave: sub.id,
      iniciales: (sub.name || "?").slice(0, 2).toUpperCase(),
      nombre: sub.name,
      subtitulo: sub.email,
      fecha: fmtFecha(sub.createdAt),
      ultimaActividad: (
        <>
          <span className={`badge badge-sm ${pc.color} me-1`}>{pc.label}</span>
          <span className={`badge badge-sm ${sc.tone}`}>{sc.label}</span>
          {sub.stripeConnectPaymentEnabled && <span className="badge badge-sm badge-primary ms-1">Connect</span>}
          <span className="d-block text-muted fs-13 mt-1">
            {num(sub.maxContacts).toLocaleString("es-ES")} contactos · {num(sub.maxCampaigns)} campañas
          </span>
        </>
      ),
      acciones: (
        <>
          <W3crmIconButton icono="fas fa-chart-simple" etiqueta={`Ver uso de ${sub.name}`} onClick={() => setUsageSub(sub)} />{" "}
          {sub.status === "active" && (
            <W3crmIconButton
              tono="warning"
              icono="fas fa-pause"
              etiqueta={`Suspender ${sub.name}`}
              disabled={isBusy}
              onClick={() => void doAction("suspend", sub.id)}
            />
          )}
          {sub.status === "suspended" && (
            <>
              <W3crmIconButton
                tono="success"
                icono="fas fa-play"
                etiqueta={`Reactivar ${sub.name}`}
                disabled={isBusy}
                onClick={() => void doAction("reactivate", sub.id)}
              />{" "}
              <W3crmIconButton
                tono="danger"
                icono="fas fa-trash-alt"
                etiqueta={`Cancelar ${sub.name}`}
                disabled={isBusy}
                onClick={() => void doCancel(sub.id)}
              />
            </>
          )}
        </>
      ),
    };
  });

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Gestión de Subcuentas" parentTitle="Cuenta" pageTitle="Subcuentas" />
      <div className="container-fluid">
        <div className="row">
          <div className="d-flex align-items-center justify-content-between">
            <h4 className="heading mb-3">Subcuentas de la agencia</h4>
            <button type="button" className="btn btn-primary btn-sm mb-3" onClick={abrirAlta}>
              + Nueva subcuenta
            </button>
          </div>

          {/* Columna izquierda — `ul.personal-info` de la plantilla */}
          <div className="col-xl-3 col-lg-4">
            <div className="row">
              <div className="col-xl-12">
                <div className="card">
                  <div className="card-header">
                    <h4 className="heading mb-0">Resumen</h4>
                  </div>
                  <div className="card-body px-0">
                    <ul className="personal-info">
                      <li><i className="fa-solid fa-building text-primary me-3"></i> Total: {subcuentas.length}</li>
                      <li><i className="fa-solid fa-circle-check text-primary me-3"></i> Activas: {subcuentas.filter(s => s.status === "active").length}</li>
                      <li><i className="fa-solid fa-pause text-primary me-3"></i> Suspendidas: {subcuentas.filter(s => s.status === "suspended").length}</li>
                      <li><i className="fa-brands fa-stripe text-primary me-3"></i> Stripe Connect: {subcuentas.filter(s => s.stripeConnectPaymentEnabled).length}</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="col-xl-12">
                <div className="card">
                  <div className="card-header">
                    <h4 className="heading mb-0">Filtrar</h4>
                  </div>
                  <div className="card-body px-0">
                    <ul className="personal-info">
                      {(["all", "active", "suspended", "cancelled"] as const).map(s => (
                        <li key={s}>
                          <button
                            type="button"
                            className={`btn btn-sm ${filterStatus === s ? "btn-primary" : "btn-primary light"}`}
                            onClick={() => setFilterStatus(s)}
                          >
                            {s === "all" ? "Todas" : estadoDe(s).label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Columna derecha — las dos listas de la plantilla */}
          <div className="col-xl-9 col-lg-8">
            <div className="row">
              <div className="col-xl-12">
                <W3crmJobList
                  titulo="Subcuentas"
                  icono="fa-solid fa-user-plus"
                  columnas={["Cuenta", "Alta", "Plan y estado", "Acción"]}
                  filas={filas}
                  cargando={loading}
                  vacio={
                    <>
                      <h5 className="mb-1">Sin subcuentas</h5>
                      <p className="mb-3 text-muted fs-14">Crea la primera subcuenta para tu cliente.</p>
                      <button type="button" className="btn btn-primary" onClick={abrirAlta}>+ Nueva subcuenta</button>
                    </>
                  }
                />
              </div>
              <div className="col-xl-12">
                <TwilioRebillingPanel />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alta — offcanvas de la plantilla con el formulario real */}
      <W3crmEmployeeOffcanvas ref={offcanvasRef} title="Nueva subcuenta">
        {showCreate ? <CreateModal onClose={cerrarAlta} onCreated={() => void load()} /> : null}
      </W3crmEmployeeOffcanvas>

      {usageSub && <UsagePanel sub={usageSub} onClose={() => setUsageSub(null)} />}
    </SaasW3crmShell>
  );
}
