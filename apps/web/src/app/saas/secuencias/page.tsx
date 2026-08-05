"use client";

/**
 * /saas/secuencias sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: los cuatro modales -> `W3crmModal`; galeria de plantillas y detalle
 * de secuencia -> `W3crmContentBox`; pasos -> `W3crmDataTable`.
 *
 * Logica de NELVYON intacta: `GET/POST /api/saas/sequences`,
 * `GET/POST /api/saas/sequences/templates`,
 * `GET/PATCH /api/saas/sequences/[id]`, `POST /api/saas/sequences/[id]/enroll`,
 * `POST /api/saas/sequences/[id]/steps` y `GET /api/saas/crm/contacts`;
 * `EnrollModal` con su busqueda con rebote de 300 ms, `AddStepModal` con los
 * cinco tipos de paso y el cuerpo que arma por tipo, `CreateSequenceModal`,
 * `SequenceTemplateGallery` con su filtro por categoria, `loadSequences`,
 * `loadDetail`, `toggleStatus` y los avisos `ses_configured` /
 * `twilio_configured`.
 */
import { useState, useEffect, useCallback } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable, W3crmModal } from "@/features/saas-w3crm/components/W3crmContentBox";
import type { SaasSequence, SaasSequenceStep } from "@nelvyon/saas";

type SequenceWithSteps = SaasSequence & { steps?: SaasSequenceStep[] };

const STEP_TYPE_LABELS: Record<string, string> = {
  email: "Email", sms: "SMS", whatsapp: "WhatsApp", wait: "Espera", branch: "Bifurcación",
};

const STEP_TYPE_BADGE: Record<string, string> = {
  email: "badge-primary", sms: "badge-success", whatsapp: "badge-success",
  wait: "badge-warning", branch: "badge-secondary",
};

const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manual", contact_created: "Nuevo contacto",
  form_submitted: "Formulario", tag_added: "Etiqueta",
};

const SEQ_STATUS_BADGE: Record<string, string> = {
  active: "badge-success", paused: "badge-warning", archived: "badge-secondary",
};
const SEQ_STATUS_LABELS: Record<string, string> = {
  active: "Activa", paused: "Pausada", archived: "Archivada",
};

/** Catalogos que pueden crecer en el backend sin dejar la pantalla en blanco. */
function etiquetaPaso(t: string) { return STEP_TYPE_LABELS[t] ?? String(t || "—"); }
function badgePaso(t: string) { return STEP_TYPE_BADGE[t] ?? "badge-secondary"; }
function etiquetaTrigger(t: string) { return TRIGGER_LABELS[t] ?? String(t || "—"); }
function etiquetaEstado(s: string) { return SEQ_STATUS_LABELS[s] ?? String(s || "—"); }
function badgeEstado(s: string) { return SEQ_STATUS_BADGE[s] ?? "badge-secondary"; }
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
/** `steps` puede llegar nulo o no-array. */
function pasosDe(s: SequenceWithSteps | null): SaasSequenceStep[] {
  return Array.isArray(s?.steps) ? s.steps : [];
}

// ── Inscribir contacto ───────────────────────────────────────────────────────

type CrmContact = { id: string; name: string; email: string | null; company?: string | null };

function EnrollModal({ sequence, onClose, onEnrolled }: {
  sequence: SaasSequence; onClose: () => void; onEnrolled: () => void;
}) {
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<CrmContact | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadContacts = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("search", q.trim());
      const res = await fetch(`/api/saas/crm/contacts?${params.toString()}`);
      if (!res.ok) throw new Error("No se pudieron cargar contactos");
      const d = (await res.json().catch(() => ({}))) as { contacts?: CrmContact[] };
      setContacts(Array.isArray(d.contacts) ? d.contacts : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al buscar contactos");
      setContacts([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { void loadContacts(search); }, 300);
    return () => clearTimeout(t);
  }, [search, loadContacts]);

  async function handleEnroll() {
    if (!selected) { setErr("Selecciona un contacto"); return; }
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/saas/sequences/${sequence.id}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: selected.id }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Error al inscribir");
      }
      onEnrolled();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <W3crmModal titulo="Inscribir contacto" onClose={onClose} error={err} testId="modal-inscribir">
      <p className="fs-14 text-muted">Secuencia: <strong>{sequence.name}</strong></p>
      <div className="form-group mb-3">
        <label htmlFor="sq-buscar" className="text-black font-w600">Buscar contacto</label>
        <input id="sq-buscar" type="text" className="form-control" placeholder="Buscar por nombre, email o empresa…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="table-responsive mb-3" style={{ maxHeight: 260, overflowY: "auto" }}>
        <div className="dataTables_wrapper no-footer">
          {searching ? (
            <W3crmCargando texto="Buscando contactos…" />
          ) : contacts.length === 0 ? (
            <W3crmEmptyState title="Sin contactos" description="Prueba con otra búsqueda." />
          ) : (
            <table className="table table-responsive-lg table-striped table-condensed flip-content">
              <thead>
                <tr>
                  <th className="text-black">Contacto</th>
                  <th className="text-black">Email</th>
                  <th className="text-black text-end">Seleccionar</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id}>
                    <td><span className="fw-bold">{c.name || "—"}</span></td>
                    <td><span className="text-muted fs-12">{c.email ?? "—"}</span></td>
                    <td className="text-end">
                      <button type="button"
                        className={`btn btn-sm ${selected?.id === c.id ? "btn-primary" : "btn-primary light"}`}
                        aria-pressed={selected?.id === c.id}
                        onClick={() => setSelected(c)}>
                        {selected?.id === c.id ? "Seleccionado" : "Seleccionar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <div className="text-end">
        <button type="button" className="btn btn-danger light me-2" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary" disabled={loading || !selected} onClick={() => void handleEnroll()}>
          {loading ? "Inscribiendo…" : "Inscribir"}
        </button>
      </div>
    </W3crmModal>
  );
}

// ── Añadir paso ──────────────────────────────────────────────────────────────

function AddStepModal({ sequence, onClose, onAdded }: {
  sequence: SaasSequence; onClose: () => void; onAdded: () => void;
}) {
  const [stepType, setStepType] = useState<"email" | "sms" | "whatsapp" | "wait" | "branch">("email");
  const [delayDays, setDelayDays] = useState("0");
  const [delayHours, setDelayHours] = useState("0");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [branchField, setBranchField] = useState<"replied" | "opened" | "clicked">("replied");
  const [branchYes, setBranchYes] = useState("");
  const [branchNo, setBranchNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleAdd() {
    setLoading(true); setErr(null);
    const body: Record<string, unknown> = {
      step_type: stepType,
      delay_days: Number(delayDays) || 0,
      delay_hours: Number(delayHours) || 0,
    };
    if (stepType === "email") { body.subject = subject; body.body_html = bodyHtml; }
    if (stepType === "sms" || stepType === "whatsapp") { body.body_html = bodyHtml || subject; }
    if (stepType === "branch") {
      body.branch_condition = { field: branchField, op: "eq", value: true };
      if (branchYes) body.branch_yes_position = Number(branchYes);
      if (branchNo) body.branch_no_position = Number(branchNo);
    }
    try {
      const res = await fetch(`/api/saas/sequences/${sequence.id}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Error al añadir step");
      }
      onAdded(); onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <W3crmModal titulo="Añadir paso" onClose={onClose} error={err} testId="modal-paso">
      <div className="mb-3">
        <label className="text-black font-w600 d-block mb-2">Tipo de paso</label>
        {(["email", "sms", "whatsapp", "wait", "branch"] as const).map((t) => (
          <button key={t} type="button" aria-pressed={stepType === t}
            className={`btn btn-sm me-1 mb-1 ${stepType === t ? "btn-primary" : "btn-primary light"}`}
            onClick={() => setStepType(t)}>
            {STEP_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="row">
        <div className="col-6">
          <div className="form-group mb-3">
            <label htmlFor="sq-dias" className="text-black font-w600">Retraso (días)</label>
            <input id="sq-dias" type="number" className="form-control" value={delayDays} onChange={(e) => setDelayDays(e.target.value)} />
          </div>
        </div>
        <div className="col-6">
          <div className="form-group mb-3">
            <label htmlFor="sq-horas" className="text-black font-w600">Retraso (horas)</label>
            <input id="sq-horas" type="number" className="form-control" value={delayHours} onChange={(e) => setDelayHours(e.target.value)} />
          </div>
        </div>

        {(stepType === "email" || stepType === "sms" || stepType === "whatsapp") && (
          <>
            {stepType === "email" && (
              <div className="col-lg-12">
                <div className="form-group mb-3">
                  <label htmlFor="sq-asunto" className="text-black font-w600">Asunto del email</label>
                  <input id="sq-asunto" type="text" className="form-control" value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
              </div>
            )}
            <div className="col-lg-12">
              <div className="form-group mb-3">
                <label htmlFor="sq-cuerpo" className="text-black font-w600">
                  {stepType === "email" ? "Cuerpo HTML del email" : "Mensaje SMS / WhatsApp"}
                </label>
                <textarea id="sq-cuerpo" className="form-control" rows={5} value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} />
              </div>
            </div>
          </>
        )}

        {stepType === "branch" && (
          <>
            <div className="col-lg-12">
              <div className="form-group mb-3">
                <label htmlFor="sq-condicion" className="text-black font-w600">Condición</label>
                <select id="sq-condicion" className="form-control" value={branchField}
                  onChange={(e) => setBranchField(e.target.value as "replied" | "opened" | "clicked")}>
                  <option value="replied">Ha respondido</option>
                  <option value="opened">Ha abierto email</option>
                  <option value="clicked">Ha hecho click</option>
                </select>
              </div>
            </div>
            <div className="col-6">
              <div className="form-group mb-3">
                <label htmlFor="sq-si" className="text-black font-w600">Sí → posición</label>
                <input id="sq-si" type="number" className="form-control" placeholder="auto" value={branchYes} onChange={(e) => setBranchYes(e.target.value)} />
              </div>
            </div>
            <div className="col-6">
              <div className="form-group mb-3">
                <label htmlFor="sq-no" className="text-black font-w600">No → posición</label>
                <input id="sq-no" type="number" className="form-control" placeholder="auto" value={branchNo} onChange={(e) => setBranchNo(e.target.value)} />
              </div>
            </div>
          </>
        )}

        <div className="col-lg-12">
          <div className="text-end">
            <button type="button" className="btn btn-danger light me-2" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={loading} onClick={() => void handleAdd()}>
              {loading ? "Añadiendo…" : "Añadir paso"}
            </button>
          </div>
        </div>
      </div>
    </W3crmModal>
  );
}

// ── Nueva secuencia ──────────────────────────────────────────────────────────

function CreateSequenceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState<string>("manual");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) { setErr("Nombre requerido"); return; }
    setLoading(true); setErr(null);
    try {
      const res = await fetch("/api/saas/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || null, trigger_type: trigger }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Error al crear");
      }
      onCreated(); onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <W3crmModal titulo="Nueva secuencia" onClose={onClose} error={err} testId="modal-secuencia">
      <div className="row">
        <div className="col-lg-12">
          <div className="form-group mb-3">
            <label htmlFor="sq-nombre" className="text-black font-w600">Nombre <span className="required">*</span></label>
            <input id="sq-nombre" type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <div className="col-lg-12">
          <div className="form-group mb-3">
            <label htmlFor="sq-descripcion" className="text-black font-w600">Descripción</label>
            <input id="sq-descripcion" type="text" className="form-control" placeholder="Opcional"
              value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <div className="col-lg-12">
          <div className="form-group mb-3">
            <label htmlFor="sq-trigger" className="text-black font-w600">Disparador</label>
            <select id="sq-trigger" className="form-control" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
              <option value="manual">Manual</option>
              <option value="contact_created">Al crear contacto</option>
              <option value="form_submitted">Al enviar formulario</option>
              <option value="tag_added">Al añadir etiqueta</option>
            </select>
          </div>
        </div>
        <div className="col-lg-12">
          <div className="text-end">
            <button type="button" className="btn btn-danger light me-2" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={loading} onClick={() => void handleCreate()}>
              {loading ? "Creando…" : "Crear"}
            </button>
          </div>
        </div>
      </div>
    </W3crmModal>
  );
}

// ── Galería de plantillas ────────────────────────────────────────────────────

type SeqTemplateCategory = "welcome" | "nurture" | "sales" | "re-engagement" | "reviews" | "multichannel";
interface SeqTemplate {
  id: string; name: string; description: string; category: SeqTemplateCategory; tags: string[];
}

const SEQ_CAT_LABELS: Record<SeqTemplateCategory | "all", string> = {
  all: "Todas", welcome: "Welcome", nurture: "Nurture", sales: "Ventas",
  "re-engagement": "Re-engage", reviews: "Reviews", multichannel: "Multi-canal",
};

function SequenceTemplateGallery({ onImported }: { onImported: () => void }) {
  const [templates, setTemplates] = useState<SeqTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<SeqTemplateCategory | "all">("all");
  const [importing, setImporting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = category === "all" ? "" : `?category=${category}`;
      const res = await fetch(`/api/saas/sequences/templates${q}`);
      if (res.ok) {
        const d = (await res.json().catch(() => ({}))) as { templates?: SeqTemplate[] };
        setTemplates(Array.isArray(d.templates) ? d.templates : []);
      }
    } finally { setLoading(false); }
  }, [category]);

  useEffect(() => { void load(); }, [load]);

  async function importTpl(id: string) {
    setImporting(id);
    try {
      const res = await fetch("/api/saas/sequences/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", template_id: id }),
      });
      if (res.ok) onImported();
    } finally { setImporting(null); }
  }

  return (
    <W3crmContentBox
      titulo={`Plantillas oficiales Nelvyon (${templates.length})`}
      icono="fa-solid fa-layer-group"
      testId="galeria-plantillas"
    >
      <p className="fs-12 text-muted">Secuencias drip — email, SMS y WhatsApp.</p>
      <div className="mb-3">
        {(Object.keys(SEQ_CAT_LABELS) as Array<SeqTemplateCategory | "all">).map((c) => (
          <button key={c} type="button" aria-pressed={category === c}
            className={`btn btn-sm me-1 mb-1 ${category === c ? "btn-primary" : "btn-primary light"}`}
            onClick={() => setCategory(c)}>
            {SEQ_CAT_LABELS[c]}
          </button>
        ))}
      </div>
      {loading ? (
        <W3crmCargando texto="Cargando plantillas…" />
      ) : templates.length === 0 ? (
        <W3crmEmptyState title="Sin plantillas" description="No hay plantillas en esta categoría." />
      ) : (
        <div className="row">
          {templates.map((t) => (
            <div className="col-xl-4 col-md-6 mb-3" key={t.id}>
              <div className="card mb-0 h-100">
                <div className="card-body">
                  <h6 className="mb-1">{t.name}</h6>
                  <p className="fs-12 text-muted mb-3">{t.description}</p>
                  <button type="button" className="btn btn-primary btn-sm" disabled={importing === t.id}
                    onClick={() => void importTpl(t.id)}>
                    {importing === t.id ? "Importando…" : "Importar secuencia"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </W3crmContentBox>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────

export default function SecuenciasPage() {
  const [sequences, setSequences] = useState<SequenceWithSteps[]>([]);
  const [selected, setSelected] = useState<SequenceWithSteps | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [sesConfigured, setSesConfigured] = useState<boolean | null>(null);
  const [twilioConfigured, setTwilioConfigured] = useState<boolean | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [enrollTarget, setEnrollTarget] = useState<SaasSequence | null>(null);
  const [showAddStep, setShowAddStep] = useState(false);

  const loadSequences = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch("/api/saas/sequences");
      if (!res.ok) throw new Error("Error al cargar secuencias");
      const d = (await res.json().catch(() => ({}))) as {
        sequences?: SaasSequence[]; ses_configured?: boolean; twilio_configured?: boolean;
      };
      setSequences(Array.isArray(d.sequences) ? d.sequences : []);
      setSesConfigured(typeof d.ses_configured === "boolean" ? d.ses_configured : null);
      setTwilioConfigured(typeof d.twilio_configured === "boolean" ? d.twilio_configured : null);
    } catch (e) {
      setSequences([]);
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadSequences(); }, [loadSequences]);

  async function loadDetail(seq: SaasSequence) {
    try {
      const res = await fetch(`/api/saas/sequences/${seq.id}`);
      if (!res.ok) return;
      const d = (await res.json().catch(() => ({}))) as { sequence?: SaasSequence; steps?: SaasSequenceStep[] };
      // Sin `sequence` en la respuesta se conserva la que ya se tenia: el
      // detalle no puede quedar en blanco por un payload incompleto.
      const base = d.sequence ?? seq;
      const full: SequenceWithSteps = { ...base, steps: Array.isArray(d.steps) ? d.steps : [] };
      setSelected(full);
      setSequences((prev) => prev.map((s) => (s.id === seq.id ? full : s)));
    } catch { /* noop */ }
  }

  async function toggleStatus(seq: SaasSequence) {
    const next = seq.status === "active" ? "paused" : "active";
    try {
      const res = await fetch(`/api/saas/sequences/${seq.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) return;
      await loadSequences();
      if (selected?.id === seq.id) void loadDetail(seq);
    } catch { /* noop */ }
  }

  const totalEnrollments = sequences.reduce((sum, s) => sum + num(s.enrollmentsCount), 0);
  const activeCount = sequences.filter((s) => s.status === "active").length;
  const pasosSeleccion = pasosDe(selected);

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Secuencias" parentTitle="Comunicación" pageTitle="Secuencias" />
      <div className="container-fluid">
        <div className="row">
          {err && (
            <div className="col-xl-12">
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {err}
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setErr(null)} />
              </div>
            </div>
          )}
          {sesConfigured === false && (
            <div className="col-xl-12">
              <div className="alert alert-warning" role="alert">
                <strong>Email no configurado:</strong> las variables <code>SES_FROM_EMAIL</code> y{" "}
                <code>SES_ACCESS_KEY_ID</code> no están definidas en el servidor. Los pasos de email en
                secuencias fallarán hasta configurar SES (y salir de sandbox si aplica).
              </div>
            </div>
          )}
          {twilioConfigured === false && (
            <div className="col-xl-12">
              <div className="alert alert-warning" role="alert">
                <strong>SMS no configurado:</strong> define <code>TWILIO_ACCOUNT_SID</code>,{" "}
                <code>TWILIO_AUTH_TOKEN</code> y <code>TWILIO_FROM_NUMBER</code>. Los pasos SMS fallarán
                hasta configurar Twilio.
              </div>
            </div>
          )}

          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Secuencias" value={sequences.length} accent /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Activas" value={activeCount} /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Inscritos" value={totalEnrollments.toLocaleString("es-ES")} /></div>

          <div className="col-xl-12">
            <div className="mb-3">
              <ul className="d-flex align-items-center flex-wrap">
                <li><button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Nueva secuencia</button></li>
              </ul>
            </div>

            <SequenceTemplateGallery onImported={() => void loadSequences()} />

            <W3crmContentBox titulo="Secuencias" icono="fa-solid fa-arrows-turn-right">
              {loading ? (
                <W3crmCargando texto="Cargando secuencias…" />
              ) : sequences.length === 0 ? (
                <W3crmEmptyState
                  title="Sin secuencias aún"
                  description="Crea tu primera secuencia de email drip con branching automático, o importa una plantilla oficial arriba."
                />
              ) : (
                <W3crmDataTable
                  filas={sequences}
                  etiqueta="secuencias"
                  columnas={[{ titulo: "Nombre" }, { titulo: "Disparador" }, { titulo: "Inscritos" }, { titulo: "Estado" }, { titulo: "Acciones", alFinal: true }]}
                  render={(seq) => (
                    <tr key={seq.id}>
                      <td>
                        <span className="fw-bold">{seq.name || "—"}</span>
                        {seq.description ? <div className="text-muted fs-12">{seq.description}</div> : null}
                      </td>
                      <td>{etiquetaTrigger(seq.triggerType)}</td>
                      <td>{num(seq.enrollmentsCount).toLocaleString("es-ES")}</td>
                      <td><span className={`badge ${badgeEstado(seq.status)}`}>{etiquetaEstado(seq.status)}</span></td>
                      <td className="text-end">
                        <button type="button" className="btn btn-primary light btn-sm me-1"
                          aria-label={`Ver pasos de ${seq.name}`} onClick={() => void loadDetail(seq)}>
                          Ver pasos
                        </button>
                        <button type="button" className="btn btn-primary light btn-sm me-1"
                          aria-label={`Inscribir contacto en ${seq.name}`} onClick={() => setEnrollTarget(seq)}>
                          Inscribir
                        </button>
                        <button type="button"
                          className={`btn btn-sm ${seq.status === "active" ? "btn-primary light" : "btn-primary"}`}
                          aria-label={seq.status === "active" ? `Pausar ${seq.name}` : `Activar ${seq.name}`}
                          onClick={() => void toggleStatus(seq)}>
                          {seq.status === "active" ? "Pausar" : "Activar"}
                        </button>
                      </td>
                    </tr>
                  )}
                />
              )}
            </W3crmContentBox>

            {selected && (
              <W3crmContentBox
                testId="detalle-secuencia"
                icono="fa-solid fa-arrows-turn-right"
                titulo={
                  <>
                    {selected.name || "—"}
                    <span className={`badge ${badgeEstado(selected.status)} ms-2`}>{etiquetaEstado(selected.status)}</span>
                    <span className="text-muted fs-12 ms-2">Pasos ({pasosSeleccion.length})</span>
                  </>
                }
                acciones={
                  <>
                    <button type="button" className="btn btn-primary btn-sm me-2" onClick={() => setShowAddStep(true)}>
                      + Añadir paso
                    </button>
                    <button type="button" className="btn btn-primary light btn-sm me-2" onClick={() => setEnrollTarget(selected)}>
                      Inscribir contacto
                    </button>
                    <button type="button"
                      className={`btn btn-sm me-2 ${selected.status === "active" ? "btn-primary light" : "btn-primary"}`}
                      onClick={() => void toggleStatus(selected)}>
                      {selected.status === "active" ? "Pausar" : "Activar"}
                    </button>
                    <button type="button" className="btn btn-danger light btn-sm me-2" onClick={() => setSelected(null)}>
                      Cerrar
                    </button>
                  </>
                }
              >
                {pasosSeleccion.length === 0 ? (
                  <W3crmEmptyState title="Sin pasos" description="Añade un paso de email, espera o bifurcación." />
                ) : (
                  <W3crmDataTable
                    filas={pasosSeleccion}
                    etiqueta="pasos"
                    wrapperId="pasos_wrapper"
                    porPagina={10}
                    columnas={[{ titulo: "#" }, { titulo: "Tipo" }, { titulo: "Retraso" }, { titulo: "Contenido", alFinal: true }]}
                    render={(step, i) => (
                      <tr key={step.id}>
                        <td>{i}</td>
                        <td><span className={`badge ${badgePaso(step.stepType)}`}>{etiquetaPaso(step.stepType)}</span></td>
                        <td>
                          {num(step.delayDays) > 0 || num(step.delayHours) > 0
                            ? `+${num(step.delayDays)}d ${num(step.delayHours)}h`
                            : "—"}
                        </td>
                        <td className="text-end">
                          {step.stepType === "email" ? (
                            <span>{step.subject || "(sin asunto)"}</span>
                          ) : step.stepType === "branch" && step.branchCondition ? (
                            <span className="text-muted fs-12">
                              Si {step.branchCondition.field} → pos {step.branchYesPosition ?? "auto"} | No → pos {step.branchNoPosition ?? "auto"}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    )}
                  />
                )}
              </W3crmContentBox>
            )}
          </div>
        </div>
      </div>

      {showCreate && <CreateSequenceModal onClose={() => setShowCreate(false)} onCreated={loadSequences} />}
      {enrollTarget && (
        <EnrollModal sequence={enrollTarget} onClose={() => setEnrollTarget(null)} onEnrolled={loadSequences} />
      )}
      {showAddStep && selected && (
        <AddStepModal sequence={selected} onClose={() => setShowAddStep(false)} onAdded={() => void loadDetail(selected)} />
      )}
    </SaasW3crmShell>
  );
}
