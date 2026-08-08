"use client";

/**
 * /saas/crm sobre la pantalla `customer` de la plantilla oficial W3CRM
 * (`src/app/(apps)/customer/page.jsx`): `page-titles`, cabecera con
 * `h4.heading` y botones, `card > card-body p-0`,
 * `table-responsive active-projects style-1 dt-filter exports`, `tbl-caption`
 * con exportacion CSV, `table.shorting` con checkboxes y `products` en la
 * celda de nombre, badges `badge light border-0`, paginacion
 * `dataTables_paginate paging_simple_numbers` y `Offcanvas` para el panel
 * lateral (patron de `EmployeeOffcanvas`).
 *
 * Dentro va la logica REAL de NELVYON, sin cambios: los 7 endpoints, filtros,
 * pestanas, copilot, notas y deduplicacion.
 */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CSVLink } from "react-csv";
import { Offcanvas } from "react-bootstrap";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";

// ─── Types ────────────────────────────────────────────────────────────────────

type ContactStatus = "lead" | "prospect" | "client" | "churned";
type PipelineStage = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  status: ContactStatus;
  pipelineStage: PipelineStage;
  value: number;
  notes: string | null;
  tags: string[];
  createdAt: string;
}

interface PipelineItem {
  stage: PipelineStage;
  count: number;
  totalValue: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ContactStatus, string> = {
  lead: "Lead",
  prospect: "Prospecto",
  client: "Cliente",
  churned: "Perdido",
};

const STAGE_LABELS: Record<PipelineStage, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  qualified: "Cualificado",
  proposal: "Propuesta",
  won: "Ganado",
  lost: "Perdido",
};

const STAGES: PipelineStage[] = ["new", "contacted", "qualified", "proposal", "won", "lost"];

/** Tonos de badge de W3CRM (`badge light border-0 badge-*`). */
const STATUS_TONE: Record<ContactStatus, string> = {
  lead: "primary",
  prospect: "warning",
  client: "success",
  churned: "danger",
};

const REGISTROS_POR_PAGINA = 9;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function eur(n: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();
}

/** Avatar con las clases de avatar de la plantilla. */
function Avatar({ name }: { name: string }) {
  return (
    <span
      className="avatar avatar-md rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center"
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

// ─── Pipeline Board ───────────────────────────────────────────────────────────

function PipelineBoard({ pipeline }: { pipeline: PipelineItem[] }) {
  const map = Object.fromEntries(pipeline.map((p) => [p.stage, p]));
  return (
    <div className="row">
      {STAGES.map((stage) => {
        const d = map[stage] ?? { count: 0, totalValue: 0 };
        return (
          <div key={stage} className="col-xl-2 col-lg-4 col-sm-6">
            <div className="card">
              <div className="card-body text-center">
                <p className="mb-1 text-muted fs-14">{STAGE_LABELS[stage]}</p>
                <h2 className="mb-0">{d.count}</h2>
                {d.totalValue > 0 && (
                  <p className="mb-0 text-primary fs-13">{eur(d.totalValue)}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── New Contact Offcanvas ────────────────────────────────────────────────────

function NewContactOffcanvas({
  show,
  onClose,
  onSaved,
}: {
  show: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", position: "", value: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("El nombre es obligatorio"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          company: form.company.trim() || null,
          position: form.position.trim() || null,
          value: form.value ? Number(form.value) : 0,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Error al guardar");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  const campos = [
    { k: "name", label: "Nombre", req: true, type: "text", placeholder: "Nombre completo" },
    { k: "email", label: "Email", req: false, type: "email", placeholder: "email@empresa.com" },
    { k: "phone", label: "Teléfono", req: false, type: "tel", placeholder: "+34 600 000 000" },
    { k: "company", label: "Empresa", req: false, type: "text", placeholder: "Nombre de la empresa" },
    { k: "position", label: "Cargo", req: false, type: "text", placeholder: "CEO, Director de Marketing…" },
    { k: "value", label: "Valor estimado (€)", req: false, type: "number", placeholder: "0" },
  ] as const;

  return (
    <Offcanvas show={show} onHide={onClose} className="offcanvas-end customeoff" placement="end">
      <div className="offcanvas-header">
        <h5 className="modal-title">Nuevo contacto</h5>
        <button type="button" className="btn-close" onClick={onClose} aria-label="Cerrar">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div className="offcanvas-body">
        <div className="container-fluid">
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={submit}>
            <div className="row">
              {campos.map(({ k, label, req, type, placeholder }) => (
                <div className="col-xl-6 mb-3" key={k}>
                  <label className="form-label" htmlFor={`crm-${k}`}>
                    {label}{req ? <span className="text-danger">*</span> : null}
                  </label>
                  <input
                    id={`crm-${k}`}
                    type={type}
                    className="form-control"
                    placeholder={placeholder}
                    value={form[k]}
                    onChange={set(k)}
                    {...(type === "number" ? { min: 0 } : {})}
                  />
                </div>
              ))}
            </div>
            <div>
              <button type="submit" className="btn btn-primary me-1" disabled={saving}>
                {saving ? "Guardando…" : "Crear contacto"}
              </button>
              <button type="button" className="btn btn-danger light ms-1" onClick={onClose}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </Offcanvas>
  );
}

// ─── Contact Detail Offcanvas ─────────────────────────────────────────────────

function ContactDetailOffcanvas({ contact, onClose }: { contact: Contact | null; onClose: () => void }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [copilot, setCopilot] = useState<{ summary: string; nextBestAction: string; emailDraft: string; score: number } | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(true);

  const contactId = contact?.id;

  useEffect(() => {
    if (!contactId) return;
    setCopilotLoading(true);
    fetch("/api/saas/crm/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId }),
    })
      .then((r) => r.json())
      .then((d: { suggestion?: typeof copilot }) => { if (d.suggestion) setCopilot(d.suggestion); })
      .catch(() => {})
      .finally(() => setCopilotLoading(false));
  }, [contactId]);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim() || !contactId) return;
    setSaving(true);
    try {
      await fetch(`/api/saas/crm/contacts/${contactId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityType: "note", description: note.trim() }),
      });
      setNote("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Offcanvas show={Boolean(contact)} onHide={onClose} className="offcanvas-end customeoff" placement="end">
      <div className="offcanvas-header">
        <h5 className="modal-title">{contact?.name ?? ""}</h5>
        <button type="button" className="btn-close" onClick={onClose} aria-label="Cerrar">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div className="offcanvas-body">
        {contact ? (
          <div className="container-fluid">
            <div className="d-flex align-items-center mb-3 gap-3">
              <Avatar name={contact.name} />
              <div>
                <h6 className="mb-0">{contact.name}</h6>
                {contact.company && <span className="text-muted fs-13">{contact.company}</span>}
              </div>
            </div>

            <div className="row">
              {[
                { label: "Estado", value: STATUS_LABELS[contact.status] },
                { label: "Etapa", value: STAGE_LABELS[contact.pipelineStage] },
                { label: "Email", value: contact.email ?? "—" },
                { label: "Teléfono", value: contact.phone ?? "—" },
                { label: "Cargo", value: contact.position ?? "—" },
                { label: "Valor", value: contact.value > 0 ? eur(contact.value) : "—" },
              ].map(({ label, value }) => (
                <div className="col-6 mb-3" key={label}>
                  <span className="text-muted fs-13 d-block">{label}</span>
                  <span className="fw-medium">{value}</span>
                </div>
              ))}
            </div>

            {contact.tags.length > 0 && (
              <div className="mb-3">
                {contact.tags.map((tag) => (
                  <span key={tag} className="badge light border-0 badge-primary me-1">{tag}</span>
                ))}
              </div>
            )}

            <div className="card">
              <div className="card-header">
                <h4 className="card-title">IA Copilot</h4>
              </div>
              <div className="card-body">
                {copilotLoading ? (
                  <p className="mb-0 text-muted fs-13">Analizando contacto…</p>
                ) : copilot ? (
                  <>
                    <p className="mb-2">{copilot.summary}</p>
                    <p className="mb-2 text-muted fs-13"><strong>Siguiente acción:</strong> {copilot.nextBestAction}</p>
                    <pre className="bg-light p-2 fs-13" style={{ maxHeight: 120, overflow: "auto", whiteSpace: "pre-wrap" }}>{copilot.emailDraft}</pre>
                    <button
                      type="button"
                      className="btn btn-primary light btn-sm"
                      onClick={() => void navigator.clipboard.writeText(copilot.emailDraft)}
                    >
                      Copiar email
                    </button>
                  </>
                ) : (
                  <p className="mb-0 text-muted fs-13">Sin sugerencias</p>
                )}
              </div>
            </div>

            {contact.notes && (
              <div className="card">
                <div className="card-header"><h4 className="card-title">Notas</h4></div>
                <div className="card-body"><p className="mb-0">{contact.notes}</p></div>
              </div>
            )}

            <form onSubmit={addNote}>
              <label className="form-label" htmlFor="crm-nota">Añadir nota</label>
              <div className="input-group">
                <input
                  id="crm-nota"
                  className="form-control"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Escribe una nota sobre este contacto…"
                />
                <button type="submit" className="btn btn-primary" disabled={saving || !note.trim()}>
                  Añadir
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </Offcanvas>
  );
}

// ─── Dedupe panel ─────────────────────────────────────────────────────────────

type DedupeGroup = {
  dedupeKey: string;
  email: string | null;
  contactIds: string[];
  count: number;
};

function CrmDedupePanel({ onMerged }: { onMerged: () => void }) {
  const [groups, setGroups] = useState<DedupeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/crm/dedupe");
      if (res.ok) {
        const d = (await res.json()) as { groups?: DedupeGroup[] };
        setGroups(d.groups ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function mergeGroup(group: DedupeGroup) {
    const keepId = group.contactIds[0];
    const mergeIds = group.contactIds.slice(1);
    if (!keepId || mergeIds.length === 0) return;
    setMerging(group.dedupeKey);
    try {
      const res = await fetch("/api/saas/crm/dedupe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepId, mergeIds }),
      });
      if (res.ok) {
        await load();
        onMerged();
      }
    } finally {
      setMerging(null);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="card-body d-flex align-items-center" role="status">
          <div className="spinner-border text-primary me-3" aria-hidden="true" />
          <span className="text-muted">Cargando duplicados…</span>
        </div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-4">
          <h5 className="mb-1">Sin duplicados detectados</h5>
          <p className="mb-0 text-muted fs-14">Los contactos se agrupan por email, teléfono o nombre normalizado.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="text-muted fs-14">{groups.length} grupos de duplicados · fusiona para limpiar el CRM</p>
      {groups.map((g) => (
        <div className="card" key={g.dedupeKey}>
          <div className="card-body d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <h6 className="mb-0">{g.email ?? g.dedupeKey}</h6>
              <span className="text-muted fs-13">{g.count} contactos · IDs: {g.contactIds.join(", ")}</span>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={merging === g.dedupeKey}
              onClick={() => void mergeGroup(g)}
            >
              {merging === g.dedupeKey ? "Fusionando…" : "Fusionar (conservar el más antiguo)"}
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SaasCrmPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContactStatus | "">("");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [tab, setTab] = useState<"contacts" | "pipeline" | "dedupe">("contacts");
  const [currentPage, setCurrentPage] = useState(1);
  const [isClient, setIsClient] = useState(false);
  const filtroRef = useRef<HTMLDivElement>(null);
  const [mostrarFiltro, setMostrarFiltro] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const [cRes, pRes] = await Promise.all([
        fetch(`/api/saas/crm/contacts?${params.toString()}`),
        fetch("/api/saas/crm/pipeline"),
      ]);
      const cData = (await cRes.json().catch(() => ({ contacts: [] }))) as { contacts: Contact[] };
      const pData = (await pRes.json().catch(() => ({ pipeline: [] }))) as { pipeline: PipelineItem[] };
      setContacts(cData.contacts ?? []);
      setPipeline(pData.pipeline ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setIsClient(true); }, []);
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, tab]);

  const totalValue = contacts.reduce((s, c) => s + (c.value ?? 0), 0);

  // Paginacion de la plantilla (`recordsPage`, `prePage`, `changeCPage`, `nextPage`).
  const lastIndex = currentPage * REGISTROS_POR_PAGINA;
  const firstIndex = lastIndex - REGISTROS_POR_PAGINA;
  const records = contacts.slice(firstIndex, lastIndex);
  const npage = Math.max(1, Math.ceil(contacts.length / REGISTROS_POR_PAGINA));
  const number = [...Array(npage + 1).keys()].slice(1);
  function prePage() { if (currentPage !== 1) setCurrentPage(currentPage - 1); }
  function changeCPage(id: number) { setCurrentPage(id); }
  function nextPage() { if (currentPage !== npage) setCurrentPage(currentPage + 1); }

  const csvlink = {
    headers: [
      { label: "Nombre", key: "name" },
      { label: "Email", key: "email" },
      { label: "Teléfono", key: "phone" },
      { label: "Empresa", key: "company" },
      { label: "Cargo", key: "position" },
      { label: "Estado", key: "status" },
      { label: "Etapa", key: "pipelineStage" },
      { label: "Valor", key: "value" },
    ],
    data: contacts,
    filename: "nelvyon-crm-contactos.csv",
  };

  return (
    <SaasW3crmShell>
      <W3crmPageTitle
        mainTitle="CRM"
        parentTitle="SaaS"
        pageTitle="Contactos"
        actionLabel="+ Nuevo contacto"
        onAction={() => setShowNew(true)}
      />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-12 bst-seller">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h4 className="heading mb-0">
                Contactos <span className="text-muted fs-14">· {contacts.length} · {eur(totalValue)} en pipeline</span>
              </h4>
              <div className="d-flex align-items-center">
                <button
                  type="button"
                  className="btn btn-primary btn-sm me-2"
                  aria-expanded={mostrarFiltro}
                  onClick={() => setMostrarFiltro((v) => !v)}
                >
                  <i className="fa-solid fa-filter me-2"></i>Filtrar
                </button>
                <Link
                  href="#"
                  scroll={false}
                  className="btn btn-primary btn-sm ms-2"
                  onClick={(e) => { e.preventDefault(); setShowNew(true); }}
                >
                  + Nuevo contacto
                </Link>
              </div>
            </div>

            {mostrarFiltro && (
              <div className="card" ref={filtroRef}>
                <div className="card-body">
                  <div className="row">
                    <div className="col-xl-8 mb-2">
                      <label className="form-label" htmlFor="crm-buscar">Buscar</label>
                      <input
                        id="crm-buscar"
                        className="form-control"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nombre, empresa o email…"
                      />
                    </div>
                    <div className="col-xl-4 mb-2">
                      <label className="form-label" htmlFor="crm-estado">Estado</label>
                      <select
                        id="crm-estado"
                        className="form-control"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as ContactStatus | "")}
                      >
                        <option value="">Todos los estados</option>
                        {(Object.keys(STATUS_LABELS) as ContactStatus[]).map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <ul className="nav nav-tabs mb-3" role="tablist">
              {([
                ["contacts", "Contactos"],
                ["pipeline", "Pipeline"],
                ["dedupe", "Duplicados"],
              ] as const).map(([id, label]) => (
                <li className="nav-item" key={id} role="presentation">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    className={`nav-link ${tab === id ? "active" : ""}`}
                    onClick={() => setTab(id)}
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>

            {tab === "dedupe" && <CrmDedupePanel onMerged={() => void load()} />}

            {tab === "pipeline" && <PipelineBoard pipeline={pipeline} />}

            {tab === "contacts" && (
              <div className="card">
                <div className="card-body p-0">
                  <div className="table-responsive active-projects style-1 dt-filter exports">
                    <div className="tbl-caption">
                      <div>
                        {isClient && contacts.length > 0 && (
                          <CSVLink {...csvlink} className="btn btn-primary light btn-sm me-2">
                            <i className="fa-solid fa-file-excel" /> Exportar
                          </CSVLink>
                        )}
                      </div>
                    </div>
                    <div id="contacts-tbl_wrapper" className="dataTables_wrapper no-footer">
                      {loading ? (
                        <div className="d-flex align-items-center justify-content-center py-5" role="status">
                          <div className="spinner-border text-primary me-3" aria-hidden="true" />
                          <span className="text-muted">Cargando contactos…</span>
                        </div>
                      ) : contacts.length === 0 ? (
                        <div className="text-center py-5">
                          <h5 className="mb-1">Sin contactos todavía</h5>
                          <p className="text-muted fs-14">Añade tu primer contacto para empezar</p>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>
                            + Añadir contacto
                          </button>
                        </div>
                      ) : (
                        <>
                          <table id="crm-tbl" className="table shorting">
                            <thead>
                              <tr>
                                <th>Contacto</th>
                                <th>Email</th>
                                <th>Teléfono</th>
                                <th>Empresa</th>
                                <th>Etapa</th>
                                <th>Valor</th>
                                <th>Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {records.map((item) => (
                                <tr key={item.id} onClick={() => setSelected(item)} style={{ cursor: "pointer" }}>
                                  <td>
                                    <div className="products">
                                      <Avatar name={item.name} />
                                      <div>
                                        <h6>{item.name}</h6>
                                        <span>{item.position ?? "—"}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    {item.email ? (
                                      <span className="text-primary">{item.email}</span>
                                    ) : (
                                      <span>—</span>
                                    )}
                                  </td>
                                  <td><span>{item.phone ?? "—"}</span></td>
                                  <td><span>{item.company ?? "—"}</span></td>
                                  <td><span>{STAGE_LABELS[item.pipelineStage]}</span></td>
                                  <td><span>{item.value > 0 ? eur(item.value) : "—"}</span></td>
                                  <td>
                                    <span className={`badge light border-0 badge-${STATUS_TONE[item.status]}`}>
                                      {STATUS_LABELS[item.status]}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="d-sm-flex text-center justify-content-between align-items-center">
                            <div className="dataTables_info">
                              Mostrando {firstIndex + 1} a {Math.min(lastIndex, contacts.length)} de {contacts.length} contactos
                            </div>
                            <div
                              className="dataTables_paginate paging_simple_numbers justify-content-center"
                              id="crm-tbl_paginate"
                            >
                              <Link
                                className={`paginate_button previous ${currentPage === 1 ? "disabled" : ""}`}
                                href="#"
                                scroll={false}
                                onClick={(e) => { e.preventDefault(); prePage(); }}
                              >
                                <i className="fa-solid fa-angle-left" />
                              </Link>
                              <span>
                                {number.map((n) => (
                                  <Link
                                    href="#"
                                    scroll={false}
                                    key={n}
                                    className={`paginate_button ${currentPage === n ? "current" : ""} `}
                                    onClick={(e) => { e.preventDefault(); changeCPage(n); }}
                                  >
                                    {n}
                                  </Link>
                                ))}
                              </span>
                              <Link
                                className={`paginate_button next ${currentPage === npage ? "disabled" : ""}`}
                                href="#"
                                scroll={false}
                                onClick={(e) => { e.preventDefault(); nextPage(); }}
                              >
                                <i className="fa-solid fa-angle-right" />
                              </Link>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <NewContactOffcanvas show={showNew} onClose={() => setShowNew(false)} onSaved={load} />
      <ContactDetailOffcanvas contact={selected} onClose={() => setSelected(null)} />
    </SaasW3crmShell>
  );
}
