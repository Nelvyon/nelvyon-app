"use client";

/**
 * /saas/team sobre la pantalla `(apps)/user` de la plantilla oficial W3CRM.
 *
 * Marcado de la plantilla: cabecera de pagina + `container-fluid` > `row` >
 * `Tab.Container` con `d-flex justify-content-between align-items-center mb-4`,
 * `h4.heading`, la conmutacion lista/rejilla en
 * `nav nav-pills mix-chart-tab user-m-tabe` con `SVGICON.List` y
 * `SVGICON.GridDots`, el boton `btn btn-primary btn-sm ms-2` y el
 * `col-xl-12 active-p` con las dos `Tab.Pane`.
 *
 * Las vistas son los componentes portados verbatim en `W3crmUserTabs`
 * (`GridTab`, `ListTab`) y la invitacion usa el offcanvas de
 * `EmployeeOffcanvas`, con el formulario real de NELVYON dentro.
 *
 * Logica de NELVYON intacta: `/api/saas/team` con su GET, su POST de
 * invitacion y sus dos PATCH (rol y suspension/reactivacion), los tipos
 * `TeamMember` y `ApiTeamMember`, `ROLE_CONFIG`, `STATUS_CONFIG`,
 * `ROLE_PERMISSIONS`, `initialsFrom`, `mapApiMember`, `timeAgo`,
 * `InviteMemberModal`, `EditRoleModal`, los cinco `useState`, `load` y
 * `suspendMember`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Dropdown, Modal, Nav, Tab } from "react-bootstrap";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import {
  W3crmEmployeeOffcanvas,
  W3crmRowDropdown,
  W3crmUserGrid,
  W3crmUserList,
  type W3crmOffcanvasHandle,
  type W3crmUserGridItem,
  type W3crmUserListItem,
} from "@/features/saas-w3crm/components/W3crmUserTabs";
import { SVGICON } from "@/features/saas-w3crm/constant/theme";

type Role = "owner" | "admin" | "manager" | "user" | "viewer";
type MemberStatus = "active" | "invited" | "suspended";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: MemberStatus;
  avatar: string;
  lastActive: string | null;
}

/** Shape returned by GET /api/saas/team (SaasTeamService). */
interface ApiTeamMember {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  status: MemberStatus;
  lastActiveAt?: string | null;
}

/** `color` traducido a las clases de badge de W3CRM. */
const ROLE_CONFIG: Record<Role, { label: string; color: string; description: string }> = {
  owner: { label: "Propietario", color: "badge-warning", description: "Acceso total. No se puede modificar." },
  admin: { label: "Administrador", color: "badge-primary", description: "Acceso completo excepto billing y configuración de cuenta." },
  manager: { label: "Manager", color: "badge-primary", description: "Gestiona CRM, campañas y puede ver reportes." },
  user: { label: "Usuario", color: "badge-success", description: "Acceso a módulos asignados sin configuración." },
  viewer: { label: "Solo lectura", color: "badge-secondary", description: "Puede ver pero no modificar datos." },
};

const STATUS_CONFIG: Record<MemberStatus, { label: string; tone: string }> = {
  active: { label: "Activo", tone: "badge-success" },
  invited: { label: "Invitado", tone: "badge-warning" },
  suspended: { label: "Suspendido", tone: "badge-danger" },
};

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  owner: ["Todo"],
  admin: ["CRM", "Campañas", "Workflows", "Funnels", "Reportes", "Integraciones", "Equipo"],
  manager: ["CRM", "Campañas", "Workflows", "Citas", "Reportes (solo vista)"],
  user: ["CRM (asignados)", "Citas", "Chat"],
  viewer: ["Dashboard (solo vista)", "Reportes (solo vista)"],
};

/** Un rol o estado fuera del catalogo no puede dejar la pantalla en blanco. */
const ROL_DESCONOCIDO = { label: "Sin rol", color: "badge-secondary", description: "Rol no reconocido." };
const ESTADO_DESCONOCIDO = { label: "Desconocido", tone: "badge-secondary" };

function rolDe(role: Role | string) {
  return ROLE_CONFIG[role as Role] ?? ROL_DESCONOCIDO;
}
function estadoDe(status: MemberStatus | string) {
  return STATUS_CONFIG[status as MemberStatus] ?? ESTADO_DESCONOCIDO;
}
function permisosDe(role: Role | string): string[] {
  return ROLE_PERMISSIONS[role as Role] ?? [];
}

function initialsFrom(name: string, email: string): string {
  const base = name.trim() || email;
  const parts = base.split(/[\s@._-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  return letters || "?";
}

function mapApiMember(m: ApiTeamMember): TeamMember {
  const name = (m.name ?? "").trim() || m.email;
  return {
    id: m.id,
    name,
    email: m.email,
    role: m.role,
    status: m.status,
    avatar: initialsFrom(name, m.email),
    lastActive: m.lastActiveAt ?? null,
  };
}

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const d = Date.now() - t;
  if (d < 3600000) return `Hace ${Math.floor(d / 60000)}min`;
  if (d < 86400000) return `Hace ${Math.floor(d / 3600000)}h`;
  return `Hace ${Math.floor(d / 86400000)} días`;
}

/** Formulario real de invitacion — vive dentro del offcanvas de la plantilla. */
function InviteMemberModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name.trim() || null, role }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(d.error ?? "No se pudo enviar la invitación");
        return;
      }
      onClose();
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={invite} data-testid="form-invitacion">
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <div className="row">
        <div className="col-xl-6 mb-3">
          <label htmlFor="invitar-nombre" className="form-label">Nombre</label>
          <input id="invitar-nombre" type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre y apellidos" />
        </div>
        <div className="col-xl-6 mb-3">
          <label htmlFor="invitar-email" className="form-label">Email <span className="text-danger">*</span></label>
          <input id="invitar-email" type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.com" required />
        </div>
        <div className="col-xl-12 mb-3">
          <label className="form-label">Rol <span className="text-danger">*</span></label>
          {(["admin", "manager", "user", "viewer"] as Role[]).map((r) => {
            const rc = rolDe(r);
            return (
              <div className="form-check mb-2" key={r}>
                <input
                  className="form-check-input"
                  type="radio"
                  name="role"
                  id={`rol-${r}`}
                  value={r}
                  checked={role === r}
                  onChange={() => setRole(r)}
                />
                <label className="form-check-label" htmlFor={`rol-${r}`}>
                  <strong>{rc.label}</strong>
                  <span className="d-block text-muted fs-13">{rc.description}</span>
                  <span className="d-block text-primary fs-13">Acceso: {permisosDe(r).join(", ")}</span>
                </label>
              </div>
            );
          })}
        </div>
      </div>
      <div className="d-flex gap-2">
        <button type="button" className="btn btn-primary light" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={sending || !email}>
          {sending ? "Enviando invitación…" : "Enviar invitación"}
        </button>
      </div>
    </form>
  );
}

/** Edicion de rol en un `Modal` de react-bootstrap con `form-control`. */
function EditRoleModal({ member, onClose, onSaved }: { member: TeamMember; onClose: () => void; onSaved: () => void }) {
  const [role, setRole] = useState<Role>(member.role === "owner" ? "admin" : member.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, role }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(d.error ?? "No se pudo actualizar el rol");
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal className="modal fade" show onHide={onClose} centered>
      <div className="modal-header">
        <h5 className="modal-title">Editar rol — {member.name}</h5>
        <button type="button" className="btn-close" onClick={onClose} aria-label="Cerrar" />
      </div>
      <div className="modal-body">
        <form onSubmit={save} data-testid="form-rol">
          {error && <div className="alert alert-danger" role="alert">{error}</div>}
          {(["admin", "manager", "user", "viewer"] as Role[]).map((r) => {
            const rc = rolDe(r);
            return (
              <div className="form-check mb-2" key={r}>
                <input
                  className="form-check-input"
                  type="radio"
                  name="edit-role"
                  id={`edit-rol-${r}`}
                  value={r}
                  checked={role === r}
                  onChange={() => setRole(r)}
                />
                <label className="form-check-label" htmlFor={`edit-rol-${r}`}>
                  <strong>{rc.label}</strong>
                  <span className="d-block text-muted fs-13">{rc.description}</span>
                </label>
              </div>
            );
          })}
          <div className="d-flex gap-2 mt-3">
            <button type="button" className="btn btn-primary light" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Guardando…" : "Guardar rol"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default function SaasTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const offcanvasRef = useRef<W3crmOffcanvasHandle>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/team");
      if (res.ok) {
        const d = (await res.json()) as { members?: ApiTeamMember[] };
        setMembers(Array.isArray(d.members) ? d.members.map(mapApiMember) : []);
      } else {
        setMembers([]);
      }
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function suspendMember(id: string) {
    const member = members.find((m) => m.id === id);
    if (!member) return;
    const action = member.status === "suspended" ? "reactivate" : "suspend";
    setActionError(null);
    const res = await fetch("/api/saas/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setActionError(d.error ?? "No se pudo actualizar el estado del miembro");
      return;
    }
    void load();
  }

  function abrirInvitacion() {
    setShowInvite(true);
    offcanvasRef.current?.showEmployeModal();
  }
  function cerrarInvitacion() {
    setShowInvite(false);
    offcanvasRef.current?.hideEmployeModal();
    void load();
  }

  const itemsGrid: W3crmUserGridItem[] = members.map((m) => {
    const rc = rolDe(m.role);
    const sc = estadoDe(m.status);
    return {
      activo: m.status === "active",
      iniciales: m.avatar,
      titulo: m.name,
      email: m.email,
      // `card__info` es la fila de tres cifras de la plantilla (posts/followers/
      // following): solo admite valores cortos. Meter ahi "Administrador" o
      // "Suspendido" ensanchaba el `li` a 90px y desbordaba la pagina 72px.
      // Rol y estado van a `post-pos`, que es el slot "etiqueta: valor".
      estadisticas: [
        { valor: String(permisosDe(m.role).length), etiqueta: "módulos" },
        { valor: m.status === "active" ? "Sí" : "No", etiqueta: "activo" },
        { valor: m.role === "owner" ? "Sí" : "No", etiqueta: "dueño" },
      ],
      detalles: [
        { etiqueta: "Rol", valor: rc.label },
        { etiqueta: "Estado", valor: sc.label },
        { etiqueta: "Última actividad", valor: m.lastActive ? timeAgo(m.lastActive) : "Nunca" },
      ],
      acciones: (
        <>
          <button type="button" className="btn btn-primary btn-sm me-2" onClick={() => setSelectedMember(m)}>
            Editar rol
          </button>{" "}
          <button
            type="button"
            className="btn btn-secondary btn-sm ms-2"
            disabled={m.role === "owner"}
            onClick={() => void suspendMember(m.id)}
          >
            {m.status === "suspended" ? "Reactivar" : "Suspender"}
          </button>
        </>
      ),
    };
  });

  const itemsLista: W3crmUserListItem[] = members.map((m) => {
    const sc = estadoDe(m.status);
    return {
      clave: m.id,
      iniciales: m.avatar,
      titulo: m.name,
      email: m.email,
      posicion: rolDe(m.role).label,
      fecha: m.lastActive ? timeAgo(m.lastActive) : "Nunca",
      estado: <span className={`badge badge-sm ${sc.tone}`}>{sc.label}</span>,
      acciones: (
        <W3crmRowDropdown etiqueta={`Acciones de ${m.name}`}>
          <Dropdown.Item onClick={() => setSelectedMember(m)}>Editar rol</Dropdown.Item>
          <Dropdown.Item disabled={m.role === "owner"} onClick={() => void suspendMember(m.id)}>
            {m.status === "suspended" ? "Reactivar" : "Suspender"}
          </Dropdown.Item>
        </W3crmRowDropdown>
      ),
    };
  });

  const csvCabeceras = [
    { label: "Nombre", key: "nombre" },
    { label: "Email", key: "email" },
    { label: "Rol", key: "rol" },
    { label: "Estado", key: "estado" },
    { label: "Última actividad", key: "actividad" },
  ];
  const csvFilas = members.map((m) => ({
    nombre: m.name,
    email: m.email,
    rol: rolDe(m.role).label,
    estado: estadoDe(m.status).label,
    actividad: m.lastActive ? timeAgo(m.lastActive) : "Nunca",
  }));

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Gestión de Equipo" parentTitle="Cuenta" pageTitle="Equipo" />
      <div className="container-fluid">
        {actionError && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            {actionError}
            <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setActionError(null)} />
          </div>
        )}

        <div className="row">
          {[
            { label: "Total miembros", value: members.length },
            { label: "Activos", value: members.filter((m) => m.status === "active").length },
            { label: "Invitaciones pendientes", value: members.filter((m) => m.status === "invited").length },
            { label: "Roles distintos", value: new Set(members.map((m) => m.role)).size },
          ].map(({ label, value }) => (
            <div className="col-xl-3 col-sm-6" key={label}>
              <div className="card">
                <div className="card-body">
                  <span className="d-block text-muted fs-13 text-uppercase mb-1">{label}</span>
                  <h3 className="mb-0">{value}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="row">
          <Tab.Container defaultActiveKey="Grid">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 className="heading mb-0">Miembros del equipo</h4>
              <div className="d-flex align-items-center">
                <Nav as="ul" className="nav nav-pills mix-chart-tab user-m-tabe" id="pills-tab">
                  <Nav.Item as="li" className="nav-item" role="presentation">
                    <Nav.Link as="button" type="button" className="nav-link" eventKey="List" aria-label="Vista de lista">
                      {SVGICON.List}
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item as="li" className="nav-item">
                    <Nav.Link as="button" type="button" className="nav-link" eventKey="Grid" aria-label="Vista de rejilla">
                      {SVGICON.GridDots}
                    </Nav.Link>
                  </Nav.Item>
                </Nav>
                <button type="button" className="btn btn-primary btn-sm ms-2" onClick={abrirInvitacion}>
                  + Invitar miembro
                </button>
              </div>
            </div>
            <div className="col-xl-12 active-p">
              {loading ? (
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex align-items-center justify-content-center py-5" role="status">
                      <div className="spinner-border text-primary me-3" aria-hidden="true" />
                      <span className="text-muted">Cargando…</span>
                    </div>
                  </div>
                </div>
              ) : members.length === 0 ? (
                <div className="card">
                  <div className="card-body text-center py-5">
                    <h5 className="mb-1">Sin miembros</h5>
                    <p className="mb-3 text-muted fs-14">Invita a tu primer colaborador para empezar.</p>
                    <button type="button" className="btn btn-primary" onClick={abrirInvitacion}>
                      + Invitar miembro
                    </button>
                  </div>
                </div>
              ) : (
                <Tab.Content>
                  <Tab.Pane eventKey="Grid">
                    <W3crmUserGrid items={itemsGrid} />
                  </Tab.Pane>
                  <Tab.Pane eventKey="List">
                    <W3crmUserList
                      titulo="Lista de miembros"
                      items={itemsLista}
                      csvCabeceras={csvCabeceras}
                      csvFilas={csvFilas}
                      csvNombre="equipo.csv"
                    />
                  </Tab.Pane>
                </Tab.Content>
              )}
            </div>
          </Tab.Container>
        </div>
      </div>

      {/* Invitacion — offcanvas de `EmployeeOffcanvas` con el formulario real */}
      <W3crmEmployeeOffcanvas ref={offcanvasRef} title="Invitar miembro">
        {showInvite ? <InviteMemberModal onClose={cerrarInvitacion} /> : null}
      </W3crmEmployeeOffcanvas>

      {selectedMember && (
        <EditRoleModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onSaved={() => void load()}
        />
      )}
    </SaasW3crmShell>
  );
}
