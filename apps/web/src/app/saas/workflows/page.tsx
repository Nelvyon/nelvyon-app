"use client";

/**
 * /saas/workflows sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: listado, recetas, runs y versiones -> `W3crmContentBox` +
 * `W3crmDataTable`; constructor y detalle -> `W3crmModal`; KPIs ->
 * `W3crmKpiTile`; avisos SES/Twilio -> `alert alert-warning`. Sin componentes
 * nuevos.
 *
 * Contratos que la suite verifica y se conservan: el texto "Workflows" visible,
 * la llamada a `/api/saas/workflows` con su `ses_configured`, y que la pagina
 * no produzca `pageerror`. El modulo no exponia `data-testid`; solo se usan los
 * que aceptan los componentes ya portados, para poder certificar.
 *
 * Logica de NELVYON intacta: los ocho endpoints (`/api/saas/workflows`,
 * `/[id]`, `/[id]/activate|pause`, `/[id]/execute`, `/[id]/runs`,
 * `/[id]/versions`, `/recipes`, `/api/saas/starter-pack`), los catalogos de 16
 * triggers y 17 acciones con sus iconos, `defaultConfig`,
 * `defaultTriggerConfig`, los editores de configuracion por tipo, el
 * constructor de tres paneles con reordenacion de acciones y sus dos
 * validaciones, el detalle con sus tres pestanas, la galeria de recetas con
 * filtro por categoria y el kit de arranque.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable, W3crmModal } from "@/features/saas-w3crm/components/W3crmContentBox";

type WorkflowStatus = "draft" | "active" | "paused" | "archived";
type TriggerType = "contact_created"|"contact_updated"|"stage_changed"|"deal_stage_changed"|"job_completed"|"manual"|"scheduled"|"form_submitted"|"tag_added"|"email_opened"|"email_clicked"|"webhook_in"|"date_reached"|"sequence_enrolled"|"review_received"|"score_threshold";
type ActionType = "send_email"|"update_contact"|"change_stage"|"change_deal_stage"|"add_deal_note"|"create_activity"|"create_deal_activity"|"notify"|"delay_minutes"|"webhook_out"|"add_tag"|"send_sms"|"send_whatsapp"|"log_call_activity"|"enroll_sequence"|"create_task"|"update_field";
type ConditionField = "contact.status"|"contact.pipeline_stage"|"contact.value"|"deal.stage"|"deal.value"|"deal.probability";

interface WorkflowCondition { field: ConditionField; operator: "equals"|"greater_than"; value: string | number }
interface WorkflowAction { type: ActionType; config: Record<string, unknown> }
interface Workflow {
  id: string; name: string; description: string | null; status: WorkflowStatus;
  triggerType: TriggerType; triggerConfig: Record<string, unknown>;
  conditions: WorkflowCondition[]; actions: WorkflowAction[];
  runCount: number; lastRunAt: string | null; createdAt: string;
}
interface WorkflowRun {
  id: string; status: "running"|"completed"|"failed";
  stepsExecuted: Array<Record<string, unknown>>; startedAt: string; error: string | null;
}

const TRIGGER_LABELS: Record<TriggerType, string> = {
  contact_created: "Contacto creado", contact_updated: "Contacto actualizado",
  stage_changed: "Cambio etapa contacto", deal_stage_changed: "Cambio etapa oportunidad",
  job_completed: "Pack OS completado", manual: "Manual", scheduled: "Programado",
  form_submitted: "Formulario enviado", tag_added: "Etiqueta añadida",
  email_opened: "Email abierto", email_clicked: "Clic en email",
  webhook_in: "Webhook entrante", date_reached: "Fecha alcanzada",
  sequence_enrolled: "Secuencia iniciada", review_received: "Reseña recibida",
  score_threshold: "Umbral de scoring",
};
const TRIGGER_ICONS: Record<TriggerType, string> = {
  contact_created:"👤", contact_updated:"✏️", stage_changed:"🔄", deal_stage_changed:"💼",
  job_completed:"📦", manual:"▶️", scheduled:"🕐", form_submitted:"📋",
  tag_added:"🏷️", email_opened:"📧", email_clicked:"🖱️", webhook_in:"🔗",
  date_reached:"📅", sequence_enrolled:"📨", review_received:"⭐", score_threshold:"🎯",
};
const ACTION_LABELS: Record<ActionType, string> = {
  send_email:"Enviar email", update_contact:"Actualizar contacto", change_stage:"Cambiar etapa",
  change_deal_stage:"Cambiar etapa oportunidad", add_deal_note:"Nota en oportunidad",
  create_activity:"Crear actividad", create_deal_activity:"Actividad en oportunidad",
  notify:"Notificación interna", delay_minutes:"Esperar (minutos)", webhook_out:"Webhook saliente",
  add_tag:"Añadir etiqueta", send_sms:"Enviar SMS", send_whatsapp:"Enviar WhatsApp",
  log_call_activity:"Registrar llamada", enroll_sequence:"Inscribir en secuencia",
  create_task:"Crear tarea", update_field:"Actualizar campo",
};
const ACTION_ICONS: Record<ActionType, string> = {
  send_email:"📧", update_contact:"✏️", change_stage:"🔄", change_deal_stage:"💼",
  add_deal_note:"📝", create_activity:"📌", create_deal_activity:"📌", notify:"🔔",
  delay_minutes:"⏳", webhook_out:"🔗", add_tag:"🏷️", send_sms:"💬",
  send_whatsapp:"💚", log_call_activity:"📞", enroll_sequence:"📨",
  create_task:"✅", update_field:"🔧",
};

const ALL_TRIGGERS = Object.keys(TRIGGER_LABELS) as TriggerType[];
const ALL_ACTIONS = Object.keys(ACTION_LABELS) as ActionType[];

const STATUS_BADGE: Record<WorkflowStatus, string> = {
  active: "badge-success", paused: "badge-warning", draft: "badge-secondary", archived: "badge-danger",
};
const STATUS_LABEL: Record<WorkflowStatus, string> = {
  active: "Activo", paused: "Pausado", draft: "Borrador", archived: "Archivado",
};

/** Catalogos que pueden crecer en el backend sin dejar la pantalla en blanco. */
function etiquetaTrigger(t: TriggerType | string) { return TRIGGER_LABELS[t as TriggerType] ?? String(t || "—"); }
function iconoTrigger(t: TriggerType | string) { return TRIGGER_ICONS[t as TriggerType] ?? "•"; }
function etiquetaAccion(a: ActionType | string) { return ACTION_LABELS[a as ActionType] ?? String(a || "—"); }
function iconoAccion(a: ActionType | string) { return ACTION_ICONS[a as ActionType] ?? "•"; }
function etiquetaEstado(s: WorkflowStatus | string) { return STATUS_LABEL[s as WorkflowStatus] ?? String(s || "—"); }
function badgeEstado(s: WorkflowStatus | string) { return STATUS_BADGE[s as WorkflowStatus] ?? "badge-secondary"; }
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function fecha(iso: string | null | undefined, conHora = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return conHora ? d.toLocaleString("es-ES") : d.toLocaleDateString("es-ES");
}
/** Colecciones y configuraciones que pueden llegar nulas o no-array. */
function accionesDe(w: Workflow): WorkflowAction[] { return Array.isArray(w.actions) ? w.actions : []; }
function condicionesDe(w: Workflow): WorkflowCondition[] { return Array.isArray(w.conditions) ? w.conditions : []; }
function configDe(c: Record<string, unknown> | null | undefined): Record<string, unknown> {
  return c && typeof c === "object" ? c : {};
}

function defaultConfig(type: ActionType): Record<string, unknown> {
  switch (type) {
    case "send_email": return { to: "{{contact.email}}", subject: "", body: "" };
    case "update_contact": return { contactId: "{{contact.id}}", fields: {} };
    case "change_stage": return { contactId: "{{contact.id}}", stage: "qualified" };
    case "change_deal_stage": return { stage: "proposal" };
    case "add_deal_note": return { note: "" };
    case "create_activity": return { contactId: "{{contact.id}}", type: "note", description: "" };
    case "create_deal_activity": return { type: "note", description: "" };
    case "notify": return { message: "" };
    case "delay_minutes": return { minutes: 60 };
    case "webhook_out": return { url: "", method: "POST" };
    case "add_tag": return { tag: "" };
    case "send_sms": return { to: "{{contact.phone}}", body: "" };
    case "send_whatsapp": return { to: "{{contact.phone}}", body: "" };
    case "log_call_activity": return { to: "{{contact.phone}}", message: "" };
    case "enroll_sequence": return { sequenceId: "" };
    case "create_task": return { title: "", description: "", dueInDays: 1 };
    case "update_field": return { field: "status", value: "" };
    default: return {};
  }
}

function defaultTriggerConfig(type: TriggerType): Record<string, unknown> {
  if (type === "score_threshold") return { min_score: 50 };
  if (type === "deal_stage_changed") return { stage_to: "" };
  if (type === "tag_added") return { tag: "" };
  if (type === "form_submitted") return { form_id: "" };
  if (type === "review_received") return { min_rating: 4 };
  if (type === "date_reached") return { date: "" };
  return {};
}

// ── Editor de configuración de acción ─────────────────────────────────────────

function ActionConfigEditor({ type, config, onChange }: {
  type: ActionType; config: Record<string, unknown>; onChange: (cfg: Record<string, unknown>) => void;
}) {
  function set(key: string, val: unknown) { onChange({ ...config, [key]: val }); }
  const s = (k: string) => String(config[k] ?? "");
  const n = (k: string) => num(config[k]);

  if (type === "send_email") return (
    <>
      <input className="form-control mb-2" placeholder="Para ({{contact.email}})" value={s("to")} onChange={(e) => set("to", e.target.value)} />
      <input className="form-control mb-2" placeholder="Asunto" value={s("subject")} onChange={(e) => set("subject", e.target.value)} />
      <textarea className="form-control" rows={3} placeholder="Cuerpo (HTML permitido, {{contact.name}})" value={s("body")} onChange={(e) => set("body", e.target.value)} />
    </>
  );
  if (type === "notify") return (
    <input className="form-control" placeholder="Mensaje de notificación" value={s("message")} onChange={(e) => set("message", e.target.value)} />
  );
  if (type === "delay_minutes") return (
    <>
      <label className="form-label">Minutos de espera</label>
      <input type="number" className="form-control" value={n("minutes")} onChange={(e) => set("minutes", Number(e.target.value))} />
    </>
  );
  if (type === "webhook_out") return (
    <>
      <input className="form-control mb-2" placeholder="URL" value={s("url")} onChange={(e) => set("url", e.target.value)} />
      <select className="form-control" value={s("method")} onChange={(e) => set("method", e.target.value)}>
        {["POST", "GET", "PUT"].map((m) => <option key={m}>{m}</option>)}
      </select>
    </>
  );
  if (type === "add_tag") return (
    <input className="form-control" placeholder="Nombre de la etiqueta" value={s("tag")} onChange={(e) => set("tag", e.target.value)} />
  );
  if (type === "send_sms" || type === "send_whatsapp") return (
    <>
      <input className="form-control mb-2" placeholder="Teléfono ({{contact.phone}})" value={s("to")} onChange={(e) => set("to", e.target.value)} />
      <textarea className="form-control" rows={2} placeholder="Mensaje" value={s("body")} onChange={(e) => set("body", e.target.value)} />
    </>
  );
  if (type === "log_call_activity") return (
    <>
      <input className="form-control mb-2" placeholder="Teléfono ({{contact.phone}})" value={s("to")} onChange={(e) => set("to", e.target.value)} />
      <input className="form-control" placeholder="Mensaje (opcional)" value={s("message")} onChange={(e) => set("message", e.target.value)} />
    </>
  );
  if (type === "change_stage") return (
    <>
      <input className="form-control mb-2" placeholder="contactId ({{contact.id}})" value={s("contactId")} onChange={(e) => set("contactId", e.target.value)} />
      <select className="form-control" value={s("stage")} onChange={(e) => set("stage", e.target.value)}>
        {["new", "contacted", "qualified", "proposal", "won", "lost"].map((x) => <option key={x}>{x}</option>)}
      </select>
    </>
  );
  if (type === "change_deal_stage") return (
    <select className="form-control" value={s("stage")} onChange={(e) => set("stage", e.target.value)}>
      {["lead", "proposal", "negotiation", "won", "lost"].map((x) => <option key={x}>{x}</option>)}
    </select>
  );
  if (type === "add_deal_note") return (
    <textarea className="form-control" rows={2} placeholder="Nota" value={s("note")} onChange={(e) => set("note", e.target.value)} />
  );
  if (type === "enroll_sequence") return (
    <input className="form-control" placeholder="sequenceId (UUID)" value={s("sequenceId")} onChange={(e) => set("sequenceId", e.target.value)} />
  );
  if (type === "create_task") return (
    <>
      <input className="form-control mb-2" placeholder="Título de la tarea" value={s("title")} onChange={(e) => set("title", e.target.value)} />
      <input className="form-control mb-2" placeholder="Descripción (opcional)" value={s("description")} onChange={(e) => set("description", e.target.value)} />
      <label className="form-label">Vence en (días)</label>
      <input type="number" className="form-control" value={n("dueInDays")} onChange={(e) => set("dueInDays", Number(e.target.value))} />
    </>
  );
  if (type === "update_field") return (
    <>
      <select className="form-control mb-2" value={s("field")} onChange={(e) => set("field", e.target.value)}>
        {["status", "pipeline_stage", "value", "notes"].map((f) => <option key={f}>{f}</option>)}
      </select>
      <input className="form-control" placeholder="Nuevo valor" value={s("value")} onChange={(e) => set("value", e.target.value)} />
    </>
  );
  if (type === "create_activity") return (
    <>
      <select className="form-control mb-2" value={s("type")} onChange={(e) => set("type", e.target.value)}>
        {["note", "call", "email", "meeting", "task"].map((t) => <option key={t}>{t}</option>)}
      </select>
      <textarea className="form-control" rows={2} placeholder="Descripción" value={s("description")} onChange={(e) => set("description", e.target.value)} />
    </>
  );
  return <p className="fs-12 text-muted mb-0">Sin configuración adicional</p>;
}

// ── Editor de configuración de trigger ────────────────────────────────────────

function TriggerConfigEditor({ type, config, onChange }: {
  type: TriggerType; config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void;
}) {
  function set(k: string, v: unknown) { onChange({ ...config, [k]: v }); }
  const s = (k: string) => String(config[k] ?? "");
  const n = (k: string) => num(config[k]);

  if (type === "score_threshold") return (
    <>
      <label className="form-label">Score mínimo</label>
      <input type="number" className="form-control mb-2" value={n("min_score")} onChange={(e) => set("min_score", Number(e.target.value))} />
      <label className="form-label">Grado (opcional)</label>
      <select className="form-control mb-2" value={s("grade")} onChange={(e) => set("grade", e.target.value || undefined)}>
        <option value="">Cualquier grado</option>
        {["A", "B", "C", "D"].map((g) => <option key={g}>{g}</option>)}
      </select>
      <label className="form-label">Categoría (opcional)</label>
      <select className="form-control" value={s("category")} onChange={(e) => set("category", e.target.value || undefined)}>
        <option value="">Cualquier categoría</option>
        {["hot", "warm", "cold"].map((c) => <option key={c}>{c}</option>)}
      </select>
    </>
  );
  if (type === "deal_stage_changed") return (
    <>
      <label className="form-label">Etapa destino (opcional)</label>
      <select className="form-control" value={s("stage_to")} onChange={(e) => set("stage_to", e.target.value || undefined)}>
        <option value="">Cualquier etapa</option>
        {["lead", "proposal", "negotiation", "won", "lost"].map((x) => <option key={x}>{x}</option>)}
      </select>
    </>
  );
  if (type === "tag_added") return (
    <input className="form-control" placeholder="Etiqueta específica (opcional)" value={s("tag")} onChange={(e) => set("tag", e.target.value || undefined)} />
  );
  if (type === "form_submitted") return (
    <input className="form-control" placeholder="form_id (opcional)" value={s("form_id")} onChange={(e) => set("form_id", e.target.value || undefined)} />
  );
  if (type === "review_received") return (
    <>
      <label className="form-label">Rating mínimo</label>
      <input type="number" className="form-control" min={1} max={5} value={n("min_rating")} onChange={(e) => set("min_rating", Number(e.target.value))} />
    </>
  );
  if (type === "date_reached") return (
    <>
      <label className="form-label">Fecha</label>
      <input type="date" className="form-control" value={s("date")} onChange={(e) => set("date", e.target.value)} />
    </>
  );
  if (type === "email_opened" || type === "email_clicked") return (
    <input className="form-control" placeholder="campania_id (opcional)" value={s("campania_id")} onChange={(e) => set("campania_id", e.target.value || undefined)} />
  );
  return <p className="fs-12 text-muted mb-0">Sin configuración adicional para este trigger</p>;
}

// ── Constructor ───────────────────────────────────────────────────────────────

function BuilderModal({ initial, onClose, onSaved }: {
  initial?: Partial<Workflow>; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [trigger, setTrigger] = useState<TriggerType>(initial?.triggerType ?? "contact_created");
  const [triggerCfg, setTriggerCfg] = useState<Record<string, unknown>>(
    initial?.triggerConfig ? configDe(initial.triggerConfig) : defaultTriggerConfig("contact_created"),
  );
  const [conditions, setConditions] = useState<WorkflowCondition[]>(Array.isArray(initial?.conditions) ? initial.conditions : []);
  const [actions, setActions] = useState<WorkflowAction[]>(Array.isArray(initial?.actions) ? initial.actions : []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"trigger"|"conditions"|"actions">("trigger");

  function changeTrigger(t: TriggerType) { setTrigger(t); setTriggerCfg(defaultTriggerConfig(t)); }
  function addAction(type: ActionType) { setActions((prev) => [...prev, { type, config: defaultConfig(type) }]); }
  function updateAction(i: number, cfg: Record<string, unknown>) {
    setActions((prev) => prev.map((a, idx) => idx === i ? { ...a, config: cfg } : a));
  }
  function removeAction(i: number) { setActions((prev) => prev.filter((_, idx) => idx !== i)); }
  function moveAction(i: number, dir: -1 | 1) {
    setActions((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  }
  function addCondition() {
    setConditions((prev) => [...prev, { field: "contact.status", operator: "equals", value: "lead" }]);
  }
  function updateCondition(i: number, patch: Partial<WorkflowCondition>) {
    setConditions((prev) => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  }
  function removeCondition(i: number) { setConditions((prev) => prev.filter((_, idx) => idx !== i)); }

  async function save() {
    if (!name.trim()) { setError("Nombre obligatorio"); return; }
    if (actions.length === 0) { setError("Añade al menos una acción"); return; }
    setSaving(true); setError(null);
    try {
      const method = initial?.id ? "PATCH" : "POST";
      const url = initial?.id ? `/api/saas/workflows/${initial.id}` : "/api/saas/workflows";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: desc || null, triggerType: trigger, triggerConfig: triggerCfg, conditions, actions }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error al guardar"); return; }
      onSaved(); onClose();
    } finally { setSaving(false); }
  }

  return (
    <W3crmModal titulo={initial?.id ? "Editar workflow" : "Nuevo workflow"} onClose={onClose} error={error} size="lg" testId="modal-workflow">
      <div className="row">
        <div className="col-lg-6">
          <div className="form-group mb-3">
            <label htmlFor="wf-nombre" className="text-black font-w600">Nombre <span className="required">*</span></label>
            <input id="wf-nombre" type="text" className="form-control" placeholder="Nombre del workflow"
              value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <div className="col-lg-6">
          <div className="form-group mb-3">
            <label htmlFor="wf-descripcion" className="text-black font-w600">Descripción</label>
            <input id="wf-descripcion" type="text" className="form-control" placeholder="Opcional"
              value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Resumen del flujo: trigger → condiciones → acciones */}
      <ul className="nav nav-tabs mb-3" role="tablist">
        {([
          { id: "trigger" as const, txt: `${iconoTrigger(trigger)} ${etiquetaTrigger(trigger)}` },
          { id: "conditions" as const, txt: `🔀 ${conditions.length > 0 ? `${conditions.length} condición${conditions.length > 1 ? "es" : ""}` : "Sin condiciones"}` },
          { id: "actions" as const, txt: `🎬 ${actions.length > 0 ? `${actions.length} acción${actions.length > 1 ? "es" : ""}` : "Sin acciones"}` },
        ]).map((p) => (
          <li className="nav-item" key={p.id} role="presentation">
            <button type="button" role="tab" aria-selected={activePanel === p.id}
              className={`nav-link ${activePanel === p.id ? "active" : ""}`}
              onClick={() => setActivePanel(p.id)}>
              {p.txt}
            </button>
          </li>
        ))}
      </ul>

      {activePanel === "trigger" && (
        <>
          <p className="fw-bold fs-14">¿Cuándo se dispara este workflow?</p>
          <div className="mb-3">
            {ALL_TRIGGERS.map((t) => (
              <button key={t} type="button" aria-pressed={trigger === t}
                className={`btn btn-sm me-1 mb-1 ${trigger === t ? "btn-primary" : "btn-primary light"}`}
                onClick={() => changeTrigger(t)}>
                {TRIGGER_ICONS[t]} {TRIGGER_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="card mb-0">
            <div className="card-body">
              <p className="fw-bold fs-14 mb-2">Configuración del trigger</p>
              <TriggerConfigEditor type={trigger} config={triggerCfg} onChange={setTriggerCfg} />
            </div>
          </div>
        </>
      )}

      {activePanel === "conditions" && (
        <>
          <div className="d-flex align-items-center justify-content-between mb-2">
            <p className="fw-bold fs-14 mb-0">Condiciones (opcionales — AND)</p>
            <button type="button" className="btn btn-primary light btn-sm" onClick={addCondition}>+ Condición</button>
          </div>
          {conditions.length === 0 ? (
            <W3crmEmptyState title="Sin condiciones" description="El workflow se ejecutará para todos los eventos del trigger." />
          ) : (
            conditions.map((c, i) => (
              <div className="row align-items-end mb-2" key={i}>
                <div className="col-lg-5">
                  <label className="visually-hidden" htmlFor={`wf-campo-${i}`}>Campo condición {i + 1}</label>
                  <select id={`wf-campo-${i}`} className="form-control" value={c.field}
                    onChange={(e) => updateCondition(i, { field: e.target.value as ConditionField })}>
                    <option value="contact.status">Estado contacto</option>
                    <option value="contact.pipeline_stage">Etapa pipeline</option>
                    <option value="contact.value">Valor contacto</option>
                    <option value="deal.stage">Etapa oportunidad</option>
                    <option value="deal.value">Valor oportunidad</option>
                    <option value="deal.probability">Probabilidad oportunidad</option>
                  </select>
                </div>
                <div className="col-lg-3">
                  <label className="visually-hidden" htmlFor={`wf-op-${i}`}>Operador condición {i + 1}</label>
                  <select id={`wf-op-${i}`} className="form-control" value={c.operator}
                    onChange={(e) => updateCondition(i, { operator: e.target.value as "equals"|"greater_than" })}>
                    <option value="equals">=</option>
                    <option value="greater_than">&gt;</option>
                  </select>
                </div>
                <div className="col-lg-3">
                  <label className="visually-hidden" htmlFor={`wf-valor-${i}`}>Valor condición {i + 1}</label>
                  <input id={`wf-valor-${i}`} className="form-control" value={String(c.value)}
                    onChange={(e) => updateCondition(i, { value: e.target.value })} />
                </div>
                <div className="col-lg-1">
                  <button type="button" className="btn btn-danger btn-sm content-icon"
                    aria-label={`Quitar condición ${i + 1}`} onClick={() => removeCondition(i)}>
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {activePanel === "actions" && (
        <>
          <p className="fw-bold fs-14">Acciones (ejecutadas en orden)</p>
          {actions.length === 0 ? (
            <W3crmEmptyState title="Sin acciones" description="Añade al menos una acción." />
          ) : (
            actions.map((a, i) => (
              <div className="card mb-2" key={i}>
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="fw-bold fs-14">
                      {iconoAccion(a.type)} {etiquetaAccion(a.type)}
                      <span className="badge badge-secondary light ms-2">#{i + 1}</span>
                    </span>
                    <span>
                      {i > 0 && (
                        <button type="button" className="btn btn-primary light btn-sm content-icon me-1"
                          aria-label={`Subir acción ${i + 1}`} onClick={() => moveAction(i, -1)}>
                          <i className="fa-solid fa-angle-up" />
                        </button>
                      )}
                      {i < actions.length - 1 && (
                        <button type="button" className="btn btn-primary light btn-sm content-icon me-1"
                          aria-label={`Bajar acción ${i + 1}`} onClick={() => moveAction(i, 1)}>
                          <i className="fa-solid fa-angle-down" />
                        </button>
                      )}
                      <button type="button" className="btn btn-danger btn-sm content-icon"
                        aria-label={`Quitar acción ${i + 1}`} onClick={() => removeAction(i)}>
                        <i className="fa-solid fa-trash" />
                      </button>
                    </span>
                  </div>
                  <ActionConfigEditor type={a.type} config={configDe(a.config)} onChange={(cfg) => updateAction(i, cfg)} />
                </div>
              </div>
            ))
          )}
          <p className="fw-bold fs-14 mt-3 mb-2">Añadir acción</p>
          <div>
            {ALL_ACTIONS.map((t) => (
              <button key={t} type="button" className="btn btn-primary light btn-sm me-1 mb-1" onClick={() => addAction(t)}>
                {ACTION_ICONS[t]} {ACTION_LABELS[t]}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="text-end mt-3">
        <button type="button" className="btn btn-danger light me-2" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
          {saving ? "Guardando…" : initial?.id ? "Actualizar workflow" : "Crear workflow"}
        </button>
      </div>
    </W3crmModal>
  );
}

// ── Detalle ───────────────────────────────────────────────────────────────────

function DetailPanel({ wf, runs, versions, onClose, onEdit, onRun, onActivate, onPause }: {
  wf: Workflow; runs: WorkflowRun[]; versions: Array<{ id: string; versionNum: number; createdAt: string }>;
  onClose: () => void; onEdit: () => void; onRun: () => void;
  onActivate: () => void; onPause: () => void;
}) {
  const [tab, setTab] = useState<"runs"|"versions"|"config">("runs");
  const acciones = accionesDe(wf);
  const condiciones = condicionesDe(wf);

  return (
    <W3crmModal titulo={wf.name || "Workflow"} onClose={onClose} size="lg" testId="detalle-workflow">
      <div className="d-flex align-items-center mb-3">
        <span className={`badge ${badgeEstado(wf.status)} me-2`}>{etiquetaEstado(wf.status)}</span>
        <span className="text-muted fs-14">{iconoTrigger(wf.triggerType)} {etiquetaTrigger(wf.triggerType)}</span>
      </div>

      <ul className="nav nav-tabs mb-3" role="tablist">
        {(["runs", "config", "versions"] as const).map((t) => (
          <li className="nav-item" key={t} role="presentation">
            <button type="button" role="tab" aria-selected={tab === t}
              className={`nav-link ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t === "runs" ? `Runs (${runs.length})` : t === "config" ? "Configuración" : `Versiones (${versions.length})`}
            </button>
          </li>
        ))}
      </ul>

      {tab === "runs" && (
        runs.length === 0 ? (
          <W3crmEmptyState title="Sin runs aún" description="Activa el workflow y espera el trigger." />
        ) : (
          <W3crmDataTable
            filas={runs}
            etiqueta="runs"
            wrapperId="runs_wrapper"
            porPagina={10}
            columnas={[{ titulo: "Estado" }, { titulo: "Inicio" }, { titulo: "Pasos" }, { titulo: "Detalle", alFinal: true }]}
            render={(r) => {
              const pasos = Array.isArray(r.stepsExecuted) ? r.stepsExecuted : [];
              return (
                <tr key={r.id}>
                  <td>
                    <span className={`badge ${r.status === "completed" ? "badge-success" : r.status === "failed" ? "badge-danger" : "badge-warning"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>{fecha(r.startedAt, true)}</td>
                  <td>{pasos.length}</td>
                  <td className="text-end">
                    {pasos.map((s, i) => (
                      <div key={i} className="fs-12">
                        <span className={String(s.ok) === "true" ? "text-success" : "text-danger"}>
                          {String(s.ok) === "true" ? "✓" : "✗"}
                        </span>{" "}
                        <span className="text-muted">{String(s.action ?? "—")}</span>
                        {s.error ? <span className="text-danger"> {String(s.error)}</span> : null}
                      </div>
                    ))}
                    {r.error ? <div className="fs-12 text-danger">{r.error}</div> : null}
                  </td>
                </tr>
              );
            }}
          />
        )
      )}

      {tab === "config" && (
        <>
          <div className="card mb-2">
            <div className="card-body">
              <p className="fw-bold fs-14 mb-1">Trigger</p>
              <p className="mb-1">{iconoTrigger(wf.triggerType)} {etiquetaTrigger(wf.triggerType)}</p>
              {Object.keys(configDe(wf.triggerConfig)).length > 0 && (
                <pre className="border rounded p-2 fs-12 mb-0">{JSON.stringify(configDe(wf.triggerConfig), null, 2)}</pre>
              )}
            </div>
          </div>
          {condiciones.length > 0 && (
            <div className="card mb-2">
              <div className="card-body">
                <p className="fw-bold fs-14 mb-1">Condiciones</p>
                {condiciones.map((c, i) => (
                  <div key={i} className="fs-12"><code>{c.field} {c.operator === "greater_than" ? ">" : "="} {String(c.value)}</code></div>
                ))}
              </div>
            </div>
          )}
          <div className="card mb-2">
            <div className="card-body">
              <p className="fw-bold fs-14 mb-1">Acciones ({acciones.length})</p>
              {acciones.map((a, i) => (
                <div key={i} className="mb-2">
                  <p className="mb-1 fs-14">{iconoAccion(a.type)} {etiquetaAccion(a.type)}</p>
                  <pre className="border rounded p-2 fs-12 mb-0">{JSON.stringify(configDe(a.config), null, 2)}</pre>
                </div>
              ))}
            </div>
          </div>
          <p className="fs-12 text-muted mb-0">
            Runs totales: {num(wf.runCount)} · Último: {fecha(wf.lastRunAt, true)}
          </p>
        </>
      )}

      {tab === "versions" && (
        versions.length === 0 ? (
          <W3crmEmptyState title="Sin versiones guardadas aún" />
        ) : (
          <W3crmDataTable
            filas={versions}
            etiqueta="versiones"
            wrapperId="versions_wrapper"
            porPagina={10}
            columnas={[{ titulo: "Versión" }, { titulo: "Creada", alFinal: true }]}
            render={(v) => (
              <tr key={v.id}>
                <td><span className="fw-bold">v{num(v.versionNum)}</span></td>
                <td className="text-end">{fecha(v.createdAt, true)}</td>
              </tr>
            )}
          />
        )
      )}

      <div className="text-end mt-3">
        {wf.status !== "active" && <button type="button" className="btn btn-primary btn-sm me-2" onClick={onActivate}>Activar</button>}
        {wf.status === "active" && <button type="button" className="btn btn-primary light btn-sm me-2" onClick={onPause}>Pausar</button>}
        <button type="button" className="btn btn-primary light btn-sm me-2" onClick={onRun}>Ejecutar ahora</button>
        <button type="button" className="btn btn-primary light btn-sm me-2" onClick={onEdit}>Editar</button>
        <button type="button" className="btn btn-danger light btn-sm" onClick={onClose}>Cerrar</button>
      </div>
    </W3crmModal>
  );
}

// ── Biblioteca de plantillas oficiales Nelvyon ────────────────────────────────

type RecipeCategory = "lead-nurture" | "onboarding" | "re-engagement" | "sales" | "support" | "event-based" | "custom";
interface WorkflowRecipe {
  id: string; name: string; description: string; category: RecipeCategory;
  triggerType: TriggerType; tags: string[]; isOfficial: boolean;
}

const RECIPE_CATEGORY_LABELS: Record<RecipeCategory | "all", string> = {
  all: "Todas",
  "lead-nurture": "Lead nurture",
  onboarding: "Onboarding",
  "re-engagement": "Re-engagement",
  sales: "Ventas",
  support: "Soporte",
  "event-based": "Eventos",
  custom: "Personalizadas",
};

function RecipeGallery({ onImported }: { onImported: () => void }) {
  const [recipes, setRecipes] = useState<WorkflowRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<RecipeCategory | "all">("all");
  const [importing, setImporting] = useState<string | null>(null);

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const q = category === "all" ? "" : `?category=${category}`;
      const res = await fetch(`/api/saas/workflows/recipes${q}`);
      if (res.ok) {
        const d = (await res.json().catch(() => ({}))) as { recipes?: WorkflowRecipe[] };
        setRecipes(Array.isArray(d.recipes) ? d.recipes : []);
      }
    } finally { setLoading(false); }
  }, [category]);

  useEffect(() => { void loadRecipes(); }, [loadRecipes]);

  async function importRecipe(id: string) {
    setImporting(id);
    try {
      const res = await fetch("/api/saas/workflows/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", recipe_id: id }),
      });
      if (res.ok) onImported();
    } finally { setImporting(null); }
  }

  return (
    <W3crmContentBox titulo="Biblioteca de plantillas" icono="fa-solid fa-layer-group" testId="galeria-recetas">
      <p className="fs-12 text-muted">{recipes.length} automatizaciones oficiales Nelvyon. Importa en 1 clic.</p>
      <div className="mb-3">
        {(Object.keys(RECIPE_CATEGORY_LABELS) as Array<RecipeCategory | "all">).map((c) => (
          <button key={c} type="button" aria-pressed={category === c}
            className={`btn btn-sm me-1 mb-1 ${category === c ? "btn-primary" : "btn-primary light"}`}
            onClick={() => setCategory(c)}>
            {RECIPE_CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>
      {loading ? (
        <W3crmCargando texto="Cargando plantillas…" />
      ) : recipes.length === 0 ? (
        <W3crmEmptyState title="Sin plantillas" description="No hay plantillas en esta categoría." />
      ) : (
        <div className="row">
          {recipes.map((r) => (
            <div className="col-xl-4 col-md-6 mb-3" key={r.id}>
              <div className="card mb-0 h-100">
                <div className="card-body">
                  <h6 className="mb-1">
                    {r.name}
                    {r.isOfficial && <span className="badge badge-primary ms-2">Oficial</span>}
                  </h6>
                  <p className="fs-12 text-muted mb-2">{r.description}</p>
                  <p className="fs-12 text-muted mb-3">{iconoTrigger(r.triggerType)} {etiquetaTrigger(r.triggerType)}</p>
                  <button type="button" className="btn btn-primary btn-sm" disabled={importing === r.id}
                    onClick={() => void importRecipe(r.id)}>
                    {importing === r.id ? "Importando…" : "Importar workflow"}
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

// ── Página ────────────────────────────────────────────────────────────────────

export default function SaasWorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sesOk, setSesOk] = useState<boolean | null>(null);
  const [twilioOk, setTwilioOk] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<Workflow | null>(null);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [versions, setVersions] = useState<Array<{ id: string; versionNum: number; createdAt: string }>>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editing, setEditing] = useState<Workflow | null>(null);
  const [filter, setFilter] = useState<WorkflowStatus | "all">("all");
  const [installingPack, setInstallingPack] = useState(false);
  const [packMsg, setPackMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/workflows");
      if (res.ok) {
        const d = (await res.json().catch(() => ({}))) as { workflows?: Workflow[]; ses_configured?: boolean; twilio_configured?: boolean };
        setWorkflows(Array.isArray(d.workflows) ? d.workflows : []);
        setSesOk(d.ses_configured ?? false);
        setTwilioOk(d.twilio_configured ?? false);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function installStarterPack() {
    setInstallingPack(true);
    setPackMsg(null);
    try {
      const res = await fetch("/api/saas/starter-pack", { method: "POST" });
      const d = (await res.json().catch(() => ({}))) as { totalWorkflows?: number; totalSequences?: number; error?: string };
      if (!res.ok) { setPackMsg(d.error ?? "Error al instalar pack"); return; }
      setPackMsg(`✅ Kit instalado: ${d.totalWorkflows ?? 6} workflows + ${d.totalSequences ?? 4} secuencias`);
      await load();
    } finally { setInstallingPack(false); }
  }

  async function openDetail(wf: Workflow) {
    setSelected(wf);
    const [runsRes, versRes] = await Promise.all([
      fetch(`/api/saas/workflows/${wf.id}/runs`),
      fetch(`/api/saas/workflows/${wf.id}/versions`),
    ]);
    if (runsRes.ok) {
      const d = (await runsRes.json().catch(() => ({}))) as { runs?: WorkflowRun[] };
      setRuns(Array.isArray(d.runs) ? d.runs : []);
    }
    if (versRes.ok) {
      const d = (await versRes.json().catch(() => ({}))) as { versions?: Array<{ id: string; versionNum: number; createdAt: string }> };
      setVersions(Array.isArray(d.versions) ? d.versions : []);
    }
  }

  async function changeStatus(wf: Workflow, status: "active" | "paused") {
    const ep = status === "active" ? "activate" : "pause";
    const res = await fetch(`/api/saas/workflows/${wf.id}/${ep}`, { method: "POST" });
    if (res.ok) { await load(); if (selected?.id === wf.id) void openDetail({ ...wf, status }); }
  }

  async function runWorkflow(wf: Workflow) {
    const res = await fetch(`/api/saas/workflows/${wf.id}/execute`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ triggerData: { source: "manual" } }),
    });
    if (res.ok) { await load(); void openDetail(wf); }
  }

  async function deleteWorkflow(wf: Workflow) {
    const res = await fetch(`/api/saas/workflows/${wf.id}`, { method: "DELETE" });
    if (res.ok) { setSelected(null); await load(); }
  }

  const filtered = filter === "all" ? workflows : workflows.filter((w) => w.status === filter);

  const counts: Record<WorkflowStatus | "all", number> = { all: workflows.length, active: 0, paused: 0, draft: 0, archived: 0 };
  // Un estado fuera de catalogo no debe romper el recuento.
  workflows.forEach((w) => { if (w.status in counts) counts[w.status] += 1; });

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Workflows" parentTitle="Gestión" pageTitle="Workflows" />
      <div className="container-fluid">
        <div className="row">
          {packMsg && (
            <div className="col-xl-12">
              <div className={`alert ${packMsg.startsWith("✅") ? "alert-success" : "alert-danger"} alert-dismissible fade show`} role="status">
                {packMsg}
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setPackMsg(null)} />
              </div>
            </div>
          )}
          {sesOk === false && (
            <div className="col-xl-12">
              <div className="alert alert-warning" role="alert">
                <strong>Email no configurado</strong> — las acciones &quot;Enviar email&quot; fallarán hasta definir{" "}
                <code>SES_FROM_EMAIL</code> + <code>SES_ACCESS_KEY_ID</code> en Railway.
              </div>
            </div>
          )}
          {twilioOk === false && (
            <div className="col-xl-12">
              <div className="alert alert-warning" role="alert">
                <strong>SMS no configurado</strong> — las acciones &quot;Enviar SMS&quot; fallarán hasta definir{" "}
                <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code> y <code>TWILIO_FROM_NUMBER</code>.
              </div>
            </div>
          )}

          {([
            { s: "all" as const, label: "Total" },
            { s: "active" as const, label: STATUS_LABEL.active },
            { s: "paused" as const, label: STATUS_LABEL.paused },
            { s: "draft" as const, label: STATUS_LABEL.draft },
            { s: "archived" as const, label: STATUS_LABEL.archived },
          ]).map(({ s, label }) => (
            <div className="col-xl col-md-4 col-6 mb-3" key={s}>
              <button type="button" className="btn p-0 border-0 w-100 text-start" aria-pressed={filter === s}
                aria-label={`Filtrar por ${label}`} onClick={() => setFilter(s)}>
                <W3crmKpiTile label={label} value={counts[s]} accent={filter === s} />
              </button>
            </div>
          ))}

          <div className="col-xl-12">
            <div className="mb-3">
              <ul className="d-flex align-items-center flex-wrap">
                <li>
                  <button type="button" className="btn btn-primary" onClick={() => { setEditing(null); setShowBuilder(true); }}>
                    + Nuevo workflow
                  </button>
                </li>
                <li>
                  <a href="/saas/workflows/editor" className="btn btn-primary light mx-1">Editor visual</a>
                </li>
                <li>
                  <button type="button" className="btn btn-primary light" disabled={installingPack}
                    onClick={() => void installStarterPack()}>
                    {installingPack ? "Instalando…" : "⚡ Kit arranque Nelvyon"}
                  </button>
                </li>
              </ul>
            </div>

            <RecipeGallery onImported={() => void load()} />

            <W3crmContentBox titulo="Workflows" icono="fa-solid fa-bolt">
              {loading ? (
                <W3crmCargando texto="Cargando workflows…" />
              ) : filtered.length === 0 ? (
                <W3crmEmptyState
                  title="Sin workflows"
                  description="Crea tu primer workflow para automatizar acciones."
                />
              ) : (
                <W3crmDataTable
                  filas={filtered}
                  etiqueta="workflows"
                  reiniciarEn={filter}
                  columnas={[{ titulo: "Nombre" }, { titulo: "Trigger" }, { titulo: "Acciones" }, { titulo: "Runs" }, { titulo: "Último" }, { titulo: "Estado" }, { titulo: "Gestión", alFinal: true }]}
                  render={(wf) => {
                    const acciones = accionesDe(wf);
                    return (
                      <tr key={wf.id}>
                        <td>
                          <span className="fw-bold">{wf.name || "—"}</span>
                          {wf.description ? <div className="text-muted fs-12">{wf.description}</div> : null}
                        </td>
                        <td><span className="fs-12">{iconoTrigger(wf.triggerType)} {etiquetaTrigger(wf.triggerType)}</span></td>
                        <td>{acciones.length}</td>
                        <td>{num(wf.runCount)}</td>
                        <td>{fecha(wf.lastRunAt)}</td>
                        <td><span className={`badge ${badgeEstado(wf.status)}`}>{etiquetaEstado(wf.status)}</span></td>
                        <td className="text-end">
                          <button type="button" className="btn btn-primary light btn-sm me-1"
                            aria-label={`Ver detalle de ${wf.name}`} onClick={() => void openDetail(wf)}>
                            Detalle
                          </button>
                          {wf.status !== "active" && (
                            <button type="button" className="btn btn-primary btn-sm me-1"
                              aria-label={`Activar ${wf.name}`} onClick={() => void changeStatus(wf, "active")}>
                              Activar
                            </button>
                          )}
                          {wf.status === "active" && (
                            <button type="button" className="btn btn-primary light btn-sm me-1"
                              aria-label={`Pausar ${wf.name}`} onClick={() => void changeStatus(wf, "paused")}>
                              Pausar
                            </button>
                          )}
                          <button type="button" className="btn btn-primary light btn-sm content-icon me-1"
                            aria-label={`Ejecutar ${wf.name}`} onClick={() => void runWorkflow(wf)}>
                            <i className="fa-solid fa-play" />
                          </button>
                          <button type="button" className="btn btn-warning btn-sm content-icon me-1"
                            aria-label={`Editar ${wf.name}`} onClick={() => { setEditing(wf); setShowBuilder(true); }}>
                            <i className="fa fa-edit" />
                          </button>
                          <button type="button" className="btn btn-danger btn-sm content-icon"
                            aria-label={`Eliminar ${wf.name}`} onClick={() => void deleteWorkflow(wf)}>
                            <i className="fa-solid fa-trash" />
                          </button>
                        </td>
                      </tr>
                    );
                  }}
                />
              )}
            </W3crmContentBox>
          </div>
        </div>
      </div>

      {showBuilder && (
        <BuilderModal
          initial={editing ?? undefined}
          onClose={() => { setShowBuilder(false); setEditing(null); }}
          onSaved={() => void load()}
        />
      )}

      {selected && !showBuilder && (
        <DetailPanel
          wf={workflows.find((w) => w.id === selected.id) ?? selected}
          runs={runs}
          versions={versions}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setShowBuilder(true); }}
          onRun={() => void runWorkflow(selected)}
          onActivate={() => void changeStatus(selected, "active")}
          onPause={() => void changeStatus(selected, "paused")}
        />
      )}
    </SaasW3crmShell>
  );
}
