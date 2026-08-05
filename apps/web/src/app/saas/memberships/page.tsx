"use client";

/**
 * /saas/memberships sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: planes, miembros y comisiones -> `W3crmContentBox` + `W3crmDataTable`;
 * los dos dialogos (nuevo plan, suscribir) -> `W3crmModal`; KPIs ->
 * `W3crmKpiTile`. Sin componentes nuevos.
 *
 * CONTRATO ACCESIBLE — `saas-memberships.spec.ts:87-98` exige, y aqui se
 * conserva verbatim:
 *   - un `role="tablist"` con `aria-label="Secciones membresías"`,
 *   - tres `role="tab"` con los textos exactos `Planes`, `Miembros`, `Afiliados`,
 *   - visibles ya en la primera carga (por eso la barra de tabs se pinta antes
 *     del bloque de carga, igual que en el modulo original).
 * El `tablist` pasa a ser el `nav nav-tabs` de la plantilla: cambia el marcado,
 * no el rol ni el nombre accesible.
 *
 * Resto del inventario: `saas-memberships.spec.ts` valida ademas el 401 de
 * `GET`/`POST /api/saas/memberships` y de `DELETE /api/saas/memberships/[id]`,
 * que el body supere 100 caracteres y que aparezca `Pro|Memberships|Membresías|Planes`
 * en el texto; `saas-modules.spec.ts:159` que la ruta cargue sin 500.
 *
 * Logica de NELVYON intacta: `/api/saas/memberships` (GET planes, GET
 * `?resource=members`, POST `create_plan`/`subscribe`/`cancel`),
 * `PATCH`/`DELETE /api/saas/memberships/[id]` y
 * `GET /api/saas/affiliates?resource=commissions` con su doble forma de
 * respuesta (array suelto u objeto `{ commissions }`); `readError`; el aviso de
 * exito de 3,5 s; la preseleccion del primer plan activo al suscribir.
 *
 * Unico cambio de comportamiento: los dos `confirm()` nativos pasan al dialogo
 * de sweetalert2 que ya usa el resto del SaaS migrado.
 */
import { useCallback, useEffect, useState } from "react";
import Alert from "sweetalert2";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import {
  W3crmCargando,
  W3crmContentBox,
  W3crmDataTable,
  W3crmModal,
} from "@/features/saas-w3crm/components/W3crmContentBox";

type BillingInterval = "month" | "year" | "lifetime";
type MemberStatus = "active" | "cancelled" | "expired";
type Tab = "planes" | "miembros" | "afiliados";

interface MembershipPlan {
  id: string;
  name: string;
  slug: string;
  priceAmount: number;
  priceCurrency: string;
  billingInterval: BillingInterval;
  includes: { courses: string[]; communities: string[]; features: string[] };
  affiliateCommissionPct: number;
  isActive: boolean;
  createdAt: string;
}

interface MembershipMember {
  id: string;
  planId: string;
  contactEmail: string;
  status: MemberStatus;
  startsAt: string;
  expiresAt: string | null;
  affiliateRef: string | null;
}

interface AffiliateCommission {
  id: string;
  amount: number;
  commissionAmount: number;
  status: string;
  createdAt: string;
}

const INTERVAL_LABELS: Record<string, string> = {
  month: "/ mes",
  year: "/ año",
  lifetime: "pago único",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Activa",
  cancelled: "Cancelada",
  expired: "Expirada",
};
const STATUS_BADGE: Record<string, string> = {
  active: "badge-success",
  cancelled: "badge-primary",
  expired: "badge-danger",
};
const COMM_BADGE: Record<string, string> = {
  paid: "badge-success",
  approved: "badge-primary",
  pending: "badge-warning",
};

/** Un intervalo o un estado fuera de catalogo pintaba `undefined`. */
function intervalo(i: string): string {
  return INTERVAL_LABELS[i] ?? "";
}
function estadoLabel(s: string): string {
  return STATUS_LABEL[s] ?? (s ? String(s) : "—");
}
function estadoBadge(s: string): string {
  return STATUS_BADGE[s] ?? "badge-secondary";
}
function commBadge(s: string): string {
  return COMM_BADGE[s] ?? "badge-secondary";
}
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
/** Importes que pueden llegar nulos o como texto: `toFixed` reventaba. */
function importe(v: unknown): string {
  return num(v).toFixed(2);
}
function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-ES");
}
/** `features` puede faltar entera si el plan viene de una version antigua. */
function features(p: MembershipPlan): string[] {
  return Array.isArray(p.includes?.features) ? p.includes.features : [];
}

async function readError(res: Response): Promise<string> {
  const d = (await res.json().catch(() => ({}))) as { error?: string };
  return d.error ?? res.statusText;
}

async function confirmar(title: string, text: string, confirmButtonText: string): Promise<boolean> {
  const r = await Alert.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText,
    cancelButtonText: "Cancelar",
  });
  return Boolean(r.isConfirmed);
}

// ── Nuevo plan ───────────────────────────────────────────────────────────────
function CreatePlanModal({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [commission, setCommission] = useState("0");
  const [feats, setFeats] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr("El nombre es obligatorio"); return; }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/saas/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_plan",
          name: name.trim(),
          priceAmount: Number(price),
          billingInterval: interval,
          affiliateCommissionPct: Number(commission),
          includes: { features: feats.split("\n").map((f) => f.trim()).filter(Boolean) },
        }),
      });
      if (!res.ok) throw new Error(await readError(res));
      onCreated();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al crear plan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <W3crmModal titulo="Nuevo plan de membresía" onClose={onClose} error={err}>
      <form onSubmit={(e) => void submit(e)}>
        <div className="form-group mb-3">
          <label htmlFor="mp-name" className="text-black font-w600">Nombre <span className="required">*</span></label>
          <input id="mp-name" className="form-control" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="row">
          <div className="col-sm-6">
            <div className="form-group mb-3">
              <label htmlFor="mp-price" className="text-black font-w600">Precio (€)</label>
              <input id="mp-price" className="form-control" type="number" min={0} step={0.01}
                value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>
          <div className="col-sm-6">
            <div className="form-group mb-3">
              <label htmlFor="mp-interval" className="text-black font-w600">Facturación</label>
              <select id="mp-interval" className="form-control" value={interval}
                onChange={(e) => setInterval(e.target.value as BillingInterval)}>
                <option value="month">Mensual</option>
                <option value="year">Anual</option>
                <option value="lifetime">Pago único</option>
              </select>
            </div>
          </div>
        </div>
        <div className="form-group mb-3">
          <label htmlFor="mp-comm" className="text-black font-w600">Comisión afiliado (%)</label>
          <input id="mp-comm" className="form-control" type="number" min={0} max={100} step={0.1}
            value={commission} onChange={(e) => setCommission(e.target.value)} />
        </div>
        <div className="form-group mb-3">
          <label htmlFor="mp-feat" className="text-black font-w600">Features incluidas (una por línea)</label>
          <textarea id="mp-feat" className="form-control" rows={3}
            placeholder={"Acceso ilimitado a cursos\nSoporte prioritario"}
            value={feats} onChange={(e) => setFeats(e.target.value)} />
        </div>
        <div className="text-end">
          <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Guardando…" : "Crear plan"}
          </button>
        </div>
      </form>
    </W3crmModal>
  );
}

// ── Suscribir miembro ────────────────────────────────────────────────────────
function SubscribeModal({
  plans,
  onCreated,
  onClose,
}: {
  plans: MembershipPlan[];
  onCreated: () => void;
  onClose: () => void;
}) {
  const activePlans = plans.filter((p) => p.isActive);
  const [planId, setPlanId] = useState(activePlans[0]?.id ?? "");
  const [email, setEmail] = useState("");
  const [affiliateRef, setAffiliateRef] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !planId) { setErr("Email y plan son obligatorios"); return; }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/saas/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "subscribe",
          planId,
          contactEmail: email.trim(),
          affiliateRef: affiliateRef.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await readError(res));
      onCreated();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al suscribir");
    } finally {
      setSaving(false);
    }
  }

  return (
    <W3crmModal titulo="Suscribir miembro" onClose={onClose} error={err}>
      {activePlans.length === 0 ? (
        <>
          <p className="fs-14 text-muted">No hay planes activos. Activa o crea un plan primero.</p>
          <div className="text-end">
            <button type="button" className="btn btn-primary light" onClick={onClose}>Cerrar</button>
          </div>
        </>
      ) : (
        <form onSubmit={(e) => void submit(e)}>
          <div className="form-group mb-3">
            <label htmlFor="sub-email" className="text-black font-w600">Email <span className="required">*</span></label>
            <input id="sub-email" className="form-control" type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-group mb-3">
            <label htmlFor="sub-plan" className="text-black font-w600">Plan <span className="required">*</span></label>
            <select id="sub-plan" className="form-control" value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {activePlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.priceCurrency} {importe(p.priceAmount)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group mb-3">
            <label htmlFor="sub-aff" className="text-black font-w600">Código afiliado (opcional)</label>
            <input id="sub-aff" className="form-control" placeholder="AFF…"
              value={affiliateRef} onChange={(e) => setAffiliateRef(e.target.value)} />
          </div>
          <div className="text-end">
            <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Suscribiendo…" : "Suscribir"}
            </button>
          </div>
        </form>
      )}
    </W3crmModal>
  );
}

// ── Tab Planes ───────────────────────────────────────────────────────────────
function PlanesTab({
  plans,
  onRefresh,
  onError,
  onOk,
}: {
  plans: MembershipPlan[];
  onRefresh: () => void;
  onError: (m: string) => void;
  onOk: (m: string) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function deletePlan(id: string, name: string) {
    if (!(await confirmar(`¿Eliminar plan "${name}"?`, "Esta acción no se puede deshacer.", "Eliminar"))) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/saas/memberships/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readError(res));
      onOk("Plan eliminado");
      onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(p: MembershipPlan) {
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/saas/memberships/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      if (!res.ok) throw new Error(await readError(res));
      onOk(p.isActive ? "Plan desactivado" : "Plan activado");
      onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error al actualizar");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <W3crmContentBox
        titulo={`Planes (${plans.length})`}
        icono="fa-solid fa-ticket"
        acciones={
          <button type="button" className="btn btn-primary btn-sm me-2" onClick={() => setShowCreate(true)}>
            + Nuevo plan
          </button>
        }
      >
        {plans.length === 0 ? (
          <W3crmEmptyState title="No hay planes" description="Crea el primero para empezar." />
        ) : (
          <W3crmDataTable
            filas={plans}
            etiqueta="planes"
            wrapperId="plans_wrapper"
            porPagina={10}
            columnas={[
              { titulo: "Plan" },
              { titulo: "Precio" },
              { titulo: "Incluye" },
              { titulo: "Comisión" },
              { titulo: "Estado" },
              { titulo: "Gestión", alFinal: true },
            ]}
            render={(p) => {
              const fs = features(p);
              return (
                <tr key={p.id}>
                  <td>
                    <span className="fw-bold">{p.name || "—"}</span>
                    <div className="text-muted fs-12">{p.slug || "—"}</div>
                  </td>
                  <td>
                    <span className="fw-bold">{p.priceCurrency || "EUR"} {importe(p.priceAmount)}</span>{" "}
                    <span className="text-muted fs-12">{intervalo(p.billingInterval)}</span>
                  </td>
                  <td>
                    {fs.length === 0 ? (
                      <span className="text-muted fs-12">—</span>
                    ) : (
                      <ul className="mb-0 ps-3 fs-12 text-muted">
                        {fs.slice(0, 3).map((f, i) => <li key={`${p.id}-f-${i}`}>{f}</li>)}
                        {fs.length > 3 ? <li>+{fs.length - 3} más</li> : null}
                      </ul>
                    )}
                  </td>
                  <td>{num(p.affiliateCommissionPct) > 0 ? `${num(p.affiliateCommissionPct)}%` : "—"}</td>
                  <td>
                    <span className={`badge ${p.isActive ? "badge-success" : "badge-secondary"}`}>
                      {p.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="text-end">
                    <button type="button" className="btn btn-primary light btn-sm me-1" disabled={busyId === p.id}
                      aria-label={`${p.isActive ? "Desactivar" : "Activar"} plan ${p.name}`}
                      onClick={() => void toggleActive(p)}>
                      {p.isActive ? "Desactivar" : "Activar"}
                    </button>
                    <button type="button" className="btn btn-danger light btn-sm" disabled={busyId === p.id}
                      aria-label={`Eliminar plan ${p.name}`}
                      onClick={() => void deletePlan(p.id, p.name)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              );
            }}
          />
        )}
      </W3crmContentBox>
      {showCreate && <CreatePlanModal onCreated={onRefresh} onClose={() => setShowCreate(false)} />}
    </>
  );
}

// ── Tab Miembros ─────────────────────────────────────────────────────────────
function MiembrosTab({
  plans,
  onError,
  onOk,
}: {
  plans: MembershipPlan[];
  onError: (m: string) => void;
  onOk: (m: string) => void;
}) {
  const [members, setMembers] = useState<MembershipMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const planMap = new Map(plans.map((p) => [p.id, p.name]));

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/saas/memberships?resource=members");
      if (!res.ok) throw new Error(await readError(res));
      const d = (await res.json().catch(() => ({}))) as { members?: MembershipMember[] };
      setMembers(Array.isArray(d.members) ? d.members : []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Error al cargar miembros");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function cancel(id: string, email: string) {
    if (!(await confirmar(`¿Cancelar membresía de ${email}?`, "El miembro perderá el acceso asociado al plan.", "Cancelar membresía"))) return;
    setBusyId(id);
    try {
      const res = await fetch("/api/saas/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", memberId: id }),
      });
      if (!res.ok) throw new Error(await readError(res));
      onOk("Membresía cancelada");
      await load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error al cancelar");
    } finally {
      setBusyId(null);
    }
  }

  const activeCount = members.filter((m) => m.status === "active").length;

  return (
    <>
      <W3crmContentBox
        titulo={`Miembros (${members.length} · ${activeCount} activos)`}
        icono="fa-solid fa-users"
        acciones={
          <button type="button" className="btn btn-primary btn-sm me-2" onClick={() => setShowSubscribe(true)}>
            + Suscribir miembro
          </button>
        }
      >
        {loadError && (
          <div className="alert alert-danger d-flex align-items-center justify-content-between" role="alert">
            <span>{loadError}</span>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void load()}>Reintentar</button>
          </div>
        )}
        {loading ? (
          <W3crmCargando texto="Cargando miembros…" />
        ) : members.length === 0 ? (
          <W3crmEmptyState title="Aún no hay miembros" description="Usa «Suscribir miembro» para dar de alta el primero." />
        ) : (
          <W3crmDataTable
            filas={members}
            etiqueta="miembros"
            wrapperId="members_wrapper"
            porPagina={10}
            columnas={[
              { titulo: "Email" },
              { titulo: "Plan" },
              { titulo: "Estado" },
              { titulo: "Inicio" },
              { titulo: "Expira" },
              { titulo: "Afiliado" },
              { titulo: "Gestión", alFinal: true },
            ]}
            render={(m) => (
              <tr key={m.id}>
                <td><span className="fw-bold">{m.contactEmail || "—"}</span></td>
                <td>{planMap.get(m.planId) ?? (m.planId ? String(m.planId).slice(0, 8) : "—")}</td>
                <td><span className={`badge ${estadoBadge(m.status)}`}>{estadoLabel(m.status)}</span></td>
                <td>{fecha(m.startsAt)}</td>
                <td>{fecha(m.expiresAt)}</td>
                <td className="text-muted fs-12">{m.affiliateRef || "—"}</td>
                <td className="text-end">
                  {m.status === "active" && (
                    <button type="button" className="btn btn-danger light btn-sm" disabled={busyId === m.id}
                      aria-label={`Cancelar membresía de ${m.contactEmail}`}
                      onClick={() => void cancel(m.id, m.contactEmail)}>
                      Cancelar
                    </button>
                  )}
                </td>
              </tr>
            )}
          />
        )}
      </W3crmContentBox>
      {showSubscribe && (
        <SubscribeModal
          plans={plans}
          onCreated={() => { onOk("Miembro suscrito"); void load(); }}
          onClose={() => setShowSubscribe(false)}
        />
      )}
    </>
  );
}

// ── Tab Afiliados ────────────────────────────────────────────────────────────
function AfiliadosTab() {
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/affiliates?resource=commissions");
      if (!res.ok) throw new Error(await readError(res));
      // La API devuelve AffiliateCommission[] directamente (no { commissions }).
      const d = (await res.json().catch(() => [])) as AffiliateCommission[] | { commissions?: AffiliateCommission[] };
      const list = Array.isArray(d) ? d : d.commissions;
      setCommissions(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar comisiones");
      setCommissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const total = commissions.reduce((s, c) => s + num(c.commissionAmount), 0);
  const pending = commissions
    .filter((c) => c.status === "pending")
    .reduce((s, c) => s + num(c.commissionAmount), 0);

  return (
    <>
      <div className="row">
        <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Total comisiones" value={`€ ${importe(total)}`} /></div>
        <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Pendiente de pago" value={`€ ${importe(pending)}`} accent /></div>
        <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Conversiones" value={commissions.length} /></div>
      </div>
      <W3crmContentBox titulo="Comisiones de afiliado" icono="fa-solid fa-handshake">
        {error && (
          <div className="alert alert-danger d-flex align-items-center justify-content-between" role="alert">
            <span>{error}</span>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void load()}>Reintentar</button>
          </div>
        )}
        {loading ? (
          <W3crmCargando texto="Cargando comisiones…" />
        ) : commissions.length === 0 ? (
          <W3crmEmptyState
            title="Sin comisiones de afiliado"
            description="Aparecerán al suscribir con código de afiliado."
          />
        ) : (
          <W3crmDataTable
            filas={commissions}
            etiqueta="comisiones"
            wrapperId="commissions_wrapper"
            porPagina={10}
            columnas={[{ titulo: "Venta (€)" }, { titulo: "Comisión (€)" }, { titulo: "Estado" }, { titulo: "Fecha", alFinal: true }]}
            render={(c) => (
              <tr key={c.id}>
                <td>€ {importe(c.amount)}</td>
                <td className="fw-bold">€ {importe(c.commissionAmount)}</td>
                <td><span className={`badge ${commBadge(c.status)}`}>{c.status || "—"}</span></td>
                <td className="text-end">{fecha(c.createdAt)}</td>
              </tr>
            )}
          />
        )}
      </W3crmContentBox>
    </>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────
export default function SaasMembershipsPage() {
  const [tab, setTab] = useState<Tab>("planes");
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/memberships");
      if (!res.ok) throw new Error(await readError(res));
      const d = (await res.json().catch(() => ({}))) as { plans?: MembershipPlan[] };
      setPlans(Array.isArray(d.plans) ? d.plans : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar planes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPlans(); }, [loadPlans]);

  function flashOk(msg: string) {
    setActionOk(msg);
    setActionError(null);
    window.setTimeout(() => setActionOk(null), 3500);
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "planes", label: "Planes" },
    { id: "miembros", label: "Miembros" },
    { id: "afiliados", label: "Afiliados" },
  ];

  const activePlans = plans.filter((p) => p.isActive).length;
  const desde = plans.length ? `${Math.min(...plans.map((p) => num(p.priceAmount))).toFixed(0)} €` : "—";

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Membresías" parentTitle="Gestión" pageTitle="Membresías" />
      <div className="container-fluid">
        <div className="row">
          {(actionError || error) && (
            <div className="col-xl-12">
              <div className="alert alert-danger d-flex align-items-center justify-content-between" role="alert">
                <span>{actionError ?? error}</span>
                {error && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => void loadPlans()}>
                    Reintentar
                  </button>
                )}
              </div>
            </div>
          )}
          {actionOk && (
            <div className="col-xl-12">
              <div className="alert alert-success" role="status">{actionOk}</div>
            </div>
          )}

          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Planes" value={plans.length} /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Planes activos" value={activePlans} accent /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Desde" value={desde} /></div>

          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              Planes recurrentes, acceso a cursos y comunidades, comisiones de afiliado
            </p>

            {/* CONTRATO: `aria-label="Secciones membresías"` y los tres `role="tab"`
                con los textos `Planes`, `Miembros`, `Afiliados` — no tocar. */}
            <ul className="nav nav-tabs mb-3" role="tablist" aria-label="Secciones membresías">
              {TABS.map((t) => (
                <li className="nav-item" key={t.id} role="presentation">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === t.id}
                    className={`nav-link ${tab === t.id ? "active" : ""}`}
                    onClick={() => setTab(t.id)}
                  >
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>

            {loading && tab === "planes" ? (
              <W3crmContentBox titulo="Planes" icono="fa-solid fa-ticket">
                <W3crmCargando texto="Cargando planes…" />
              </W3crmContentBox>
            ) : (
              <>
                {tab === "planes" && (
                  <PlanesTab
                    plans={plans}
                    onRefresh={() => void loadPlans()}
                    onError={setActionError}
                    onOk={flashOk}
                  />
                )}
                {tab === "miembros" && <MiembrosTab plans={plans} onError={setActionError} onOk={flashOk} />}
                {tab === "afiliados" && <AfiliadosTab />}
              </>
            )}
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
