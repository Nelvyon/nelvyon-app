"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

// ── Types ─────────────────────────────────────────────────────────────────────
type WorkflowStatus  = "draft" | "active" | "paused" | "archived";
type TriggerType = "contact_created"|"contact_updated"|"stage_changed"|"deal_stage_changed"|"job_completed"|"manual"|"scheduled"|"form_submitted"|"tag_added"|"email_opened"|"email_clicked"|"webhook_in"|"date_reached"|"sequence_enrolled"|"review_received"|"score_threshold";
type ActionType  = "send_email"|"update_contact"|"change_stage"|"change_deal_stage"|"add_deal_note"|"create_activity"|"create_deal_activity"|"notify"|"delay_minutes"|"webhook_out"|"add_tag"|"send_sms"|"send_whatsapp"|"log_call_activity"|"enroll_sequence"|"create_task"|"update_field";
type ConditionField = "contact.status"|"contact.pipeline_stage"|"contact.value"|"deal.stage"|"deal.value"|"deal.probability";

interface WorkflowCondition { field: ConditionField; operator: "equals"|"greater_than"; value: string | number }
interface WorkflowAction    { type: ActionType; config: Record<string, unknown> }
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

// ── Labels ────────────────────────────────────────────────────────────────────
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
const ALL_ACTIONS  = Object.keys(ACTION_LABELS)  as ActionType[];

const STATUS_TONE: Record<WorkflowStatus, "success"|"warning"|"neutral"|"danger"> = {
  active:"success", paused:"warning", draft:"neutral", archived:"danger",
};
const STATUS_LABEL: Record<WorkflowStatus, string> = {
  active:"Activo", paused:"Pausado", draft:"Borrador", archived:"Archivado",
};

const inp = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none";

// ── Default configs ────────────────────────────────────────────────────────────
function defaultConfig(type: ActionType): Record<string, unknown> {
  switch (type) {
    case "send_email":         return { to: "{{contact.email}}", subject: "", body: "" };
    case "update_contact":     return { contactId: "{{contact.id}}", fields: {} };
    case "change_stage":       return { contactId: "{{contact.id}}", stage: "qualified" };
    case "change_deal_stage":  return { stage: "proposal" };
    case "add_deal_note":      return { note: "" };
    case "create_activity":    return { contactId: "{{contact.id}}", type: "note", description: "" };
    case "create_deal_activity": return { type: "note", description: "" };
    case "notify":             return { message: "" };
    case "delay_minutes":      return { minutes: 60 };
    case "webhook_out":        return { url: "", method: "POST" };
    case "add_tag":            return { tag: "" };
    case "send_sms":           return { to: "{{contact.phone}}", body: "" };
    case "send_whatsapp":      return { to: "{{contact.phone}}", body: "" };
    case "log_call_activity":  return { to: "{{contact.phone}}", message: "" };
    case "enroll_sequence":    return { sequenceId: "" };
    case "create_task":        return { title: "", description: "", dueInDays: 1 };
    case "update_field":       return { field: "status", value: "" };
    default:                   return {};
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

// ── Action config editor ───────────────────────────────────────────────────────
function ActionConfigEditor({ type, config, onChange }: {
  type: ActionType;
  config: Record<string, unknown>;
  onChange: (cfg: Record<string, unknown>) => void;
}) {
  function set(key: string, val: unknown) { onChange({ ...config, [key]: val }); }
  const s = (k: string) => String(config[k] ?? "");
  const n = (k: string) => Number(config[k] ?? 0);

  if (type === "send_email") return (
    <div className="space-y-2">
      <input className={inp} placeholder="Para ({{contact.email}})" value={s("to")} onChange={e => set("to", e.target.value)} />
      <input className={inp} placeholder="Asunto" value={s("subject")} onChange={e => set("subject", e.target.value)} />
      <textarea className={inp} rows={3} placeholder="Cuerpo (HTML permitido, {{contact.name}})" value={s("body")} onChange={e => set("body", e.target.value)} />
    </div>
  );
  if (type === "notify") return (
    <input className={inp} placeholder="Mensaje de notificación" value={s("message")} onChange={e => set("message", e.target.value)} />
  );
  if (type === "delay_minutes") return (
    <div><label className="mb-1 block text-xs text-muted-foreground">Minutos de espera</label>
      <input type="number" className={inp} value={n("minutes")} onChange={e => set("minutes", Number(e.target.value))} /></div>
  );
  if (type === "webhook_out") return (
    <div className="space-y-2">
      <input className={inp} placeholder="URL" value={s("url")} onChange={e => set("url", e.target.value)} />
      <select className={inp} value={s("method")} onChange={e => set("method", e.target.value)}>
        {["POST","GET","PUT"].map(m => <option key={m}>{m}</option>)}
      </select>
    </div>
  );
  if (type === "add_tag") return (
    <input className={inp} placeholder="Nombre de la etiqueta" value={s("tag")} onChange={e => set("tag", e.target.value)} />
  );
  if (type === "send_sms" || type === "send_whatsapp") return (
    <div className="space-y-2">
      <input className={inp} placeholder="Teléfono ({{contact.phone}})" value={s("to")} onChange={e => set("to", e.target.value)} />
      <textarea className={inp} rows={2} placeholder="Mensaje" value={s("body")} onChange={e => set("body", e.target.value)} />
    </div>
  );
  if (type === "log_call_activity") return (
    <div className="space-y-2">
      <input className={inp} placeholder="Teléfono ({{contact.phone}})" value={s("to")} onChange={e => set("to", e.target.value)} />
      <input className={inp} placeholder="Mensaje (opcional)" value={s("message")} onChange={e => set("message", e.target.value)} />
    </div>
  );
  if (type === "change_stage") return (
    <div className="space-y-2">
      <input className={inp} placeholder="contactId ({{contact.id}})" value={s("contactId")} onChange={e => set("contactId", e.target.value)} />
      <select className={inp} value={s("stage")} onChange={e => set("stage", e.target.value)}>
        {["new","contacted","qualified","proposal","won","lost"].map(s => <option key={s}>{s}</option>)}
      </select>
    </div>
  );
  if (type === "change_deal_stage") return (
    <select className={inp} value={s("stage")} onChange={e => set("stage", e.target.value)}>
      {["lead","proposal","negotiation","won","lost"].map(s => <option key={s}>{s}</option>)}
    </select>
  );
  if (type === "add_deal_note") return (
    <textarea className={inp} rows={2} placeholder="Nota" value={s("note")} onChange={e => set("note", e.target.value)} />
  );
  if (type === "enroll_sequence") return (
    <input className={inp} placeholder="sequenceId (UUID)" value={s("sequenceId")} onChange={e => set("sequenceId", e.target.value)} />
  );
  if (type === "create_task") return (
    <div className="space-y-2">
      <input className={inp} placeholder="Título de la tarea" value={s("title")} onChange={e => set("title", e.target.value)} />
      <input className={inp} placeholder="Descripción (opcional)" value={s("description")} onChange={e => set("description", e.target.value)} />
      <div><label className="mb-1 block text-xs text-muted-foreground">Vence en (días)</label>
        <input type="number" className={inp} value={n("dueInDays")} onChange={e => set("dueInDays", Number(e.target.value))} /></div>
    </div>
  );
  if (type === "update_field") return (
    <div className="space-y-2">
      <select className={inp} value={s("field")} onChange={e => set("field", e.target.value)}>
        {["status","pipeline_stage","value","notes"].map(f => <option key={f}>{f}</option>)}
      </select>
      <input className={inp} placeholder="Nuevo valor" value={s("value")} onChange={e => set("value", e.target.value)} />
    </div>
  );
  if (type === "create_activity") return (
    <div className="space-y-2">
      <select className={inp} value={s("type")} onChange={e => set("type", e.target.value)}>
        {["note","call","email","meeting","task"].map(t => <option key={t}>{t}</option>)}
      </select>
      <textarea className={inp} rows={2} placeholder="Descripción" value={s("description")} onChange={e => set("description", e.target.value)} />
    </div>
  );
  return <p className="text-xs text-muted-foreground italic">Sin configuración adicional</p>;
}

// ── Trigger config editor ──────────────────────────────────────────────────────
function TriggerConfigEditor({ type, config, onChange }: {
  type: TriggerType; config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void;
}) {
  function set(k: string, v: unknown) { onChange({ ...config, [k]: v }); }
  const s = (k: string) => String(config[k] ?? "");
  const n = (k: string) => Number(config[k] ?? 0);

  if (type === "score_threshold") return (
    <div className="space-y-2">
      <div><label className="mb-1 block text-xs text-muted-foreground">Score mínimo</label>
        <input type="number" className={inp} value={n("min_score")} onChange={e => set("min_score", Number(e.target.value))} /></div>
      <div><label className="mb-1 block text-xs text-muted-foreground">Grado (opcional)</label>
        <select className={inp} value={s("grade")} onChange={e => set("grade", e.target.value || undefined)}>
          <option value="">Cualquier grado</option>
          {["A","B","C","D"].map(g => <option key={g}>{g}</option>)}
        </select></div>
      <div><label className="mb-1 block text-xs text-muted-foreground">Categoría (opcional)</label>
        <select className={inp} value={s("category")} onChange={e => set("category", e.target.value || undefined)}>
          <option value="">Cualquier categoría</option>
          {["hot","warm","cold"].map(c => <option key={c}>{c}</option>)}
        </select></div>
    </div>
  );
  if (type === "deal_stage_changed") return (
    <div className="space-y-2">
      <div><label className="mb-1 block text-xs text-muted-foreground">Etapa destino (opcional)</label>
        <select className={inp} value={s("stage_to")} onChange={e => set("stage_to", e.target.value || undefined)}>
          <option value="">Cualquier etapa</option>
          {["lead","proposal","negotiation","won","lost"].map(s => <option key={s}>{s}</option>)}
        </select></div>
    </div>
  );
  if (type === "tag_added") return (
    <input className={inp} placeholder="Etiqueta específica (opcional)" value={s("tag")} onChange={e => set("tag", e.target.value || undefined)} />
  );
  if (type === "form_submitted") return (
    <input className={inp} placeholder="form_id (opcional)" value={s("form_id")} onChange={e => set("form_id", e.target.value || undefined)} />
  );
  if (type === "review_received") return (
    <div><label className="mb-1 block text-xs text-muted-foreground">Rating mínimo</label>
      <input type="number" className={inp} min={1} max={5} value={n("min_rating")} onChange={e => set("min_rating", Number(e.target.value))} /></div>
  );
  if (type === "date_reached") return (
    <div><label className="mb-1 block text-xs text-muted-foreground">Fecha (YYYY-MM-DD)</label>
      <input type="date" className={inp} value={s("date")} onChange={e => set("date", e.target.value)} /></div>
  );
  if (type === "email_opened" || type === "email_clicked") return (
    <input className={inp} placeholder="campania_id (opcional)" value={s("campania_id")} onChange={e => set("campania_id", e.target.value || undefined)} />
  );
  return <p className="text-xs text-muted-foreground italic">Sin configuración adicional para este trigger</p>;
}

// ── Builder Modal ──────────────────────────────────────────────────────────────
function BuilderModal({
  initial, onClose, onSaved,
}: {
  initial?: Partial<Workflow>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName]                 = useState(initial?.name ?? "");
  const [desc, setDesc]                 = useState(initial?.description ?? "");
  const [trigger, setTrigger]           = useState<TriggerType>(initial?.triggerType ?? "contact_created");
  const [triggerCfg, setTriggerCfg]     = useState<Record<string, unknown>>(initial?.triggerConfig ?? defaultTriggerConfig("contact_created"));
  const [conditions, setConditions]     = useState<WorkflowCondition[]>(initial?.conditions ?? []);
  const [actions, setActions]           = useState<WorkflowAction[]>(initial?.actions ?? []);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [activePanel, setActivePanel]   = useState<"trigger"|"conditions"|"actions">("trigger");

  function changeTrigger(t: TriggerType) {
    setTrigger(t);
    setTriggerCfg(defaultTriggerConfig(t));
  }

  function addAction(type: ActionType) {
    setActions(prev => [...prev, { type, config: defaultConfig(type) }]);
  }
  function updateAction(i: number, cfg: Record<string, unknown>) {
    setActions(prev => prev.map((a, idx) => idx === i ? { ...a, config: cfg } : a));
  }
  function removeAction(i: number) {
    setActions(prev => prev.filter((_, idx) => idx !== i));
  }
  function moveAction(i: number, dir: -1 | 1) {
    setActions(prev => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function addCondition() {
    setConditions(prev => [...prev, { field: "contact.status", operator: "equals", value: "lead" }]);
  }
  function updateCondition(i: number, patch: Partial<WorkflowCondition>) {
    setConditions(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  }
  function removeCondition(i: number) {
    setConditions(prev => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    if (!name.trim()) { setError("Nombre obligatorio"); return; }
    if (actions.length === 0) { setError("Añade al menos una acción"); return; }
    setSaving(true); setError(null);
    try {
      const method = initial?.id ? "PATCH" : "POST";
      const url    = initial?.id ? `/api/saas/workflows/${initial.id}` : "/api/saas/workflows";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: desc || null, triggerType: trigger, triggerConfig: triggerCfg, conditions, actions }),
      });
      const d = await res.json() as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error al guardar"); return; }
      onSaved(); onClose();
    } finally { setSaving(false); }
  }

  const panels = [
    { id: "trigger",     label: "① Trigger",     icon: "⚡" },
    { id: "conditions",  label: "② Condiciones",  icon: "🔀" },
    { id: "actions",     label: "③ Acciones",     icon: "🎬" },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex-1">
            <input
              className="w-full bg-transparent text-lg font-semibold text-foreground placeholder-muted-foreground focus:outline-none"
              placeholder="Nombre del workflow"
              value={name} onChange={e => setName(e.target.value)} />
            <input
              className="mt-0.5 w-full bg-transparent text-xs text-muted-foreground placeholder-muted-foreground focus:outline-none"
              placeholder="Descripción (opcional)"
              value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <button onClick={onClose} className="ml-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted/30">✕</button>
        </div>

        {/* Visual flow summary */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-border bg-muted/10 px-6 py-3">
          <div className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${activePanel === "trigger" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActivePanel("trigger")}>
            <span>{TRIGGER_ICONS[trigger]}</span>
            <span>{TRIGGER_LABELS[trigger]}</span>
          </div>
          <span className="text-muted-foreground">→</span>
          <div className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${activePanel === "conditions" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActivePanel("conditions")}>
            <span>🔀</span>
            <span>{conditions.length > 0 ? `${conditions.length} condición${conditions.length > 1 ? "es" : ""}` : "Sin condiciones"}</span>
          </div>
          <span className="text-muted-foreground">→</span>
          <div className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${activePanel === "actions" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActivePanel("actions")}>
            <span>🎬</span>
            <span>{actions.length > 0 ? `${actions.length} acción${actions.length > 1 ? "es" : ""}` : "Sin acciones"}</span>
          </div>
        </div>

        <div className="p-6">
          {error && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}

          {/* Trigger panel */}
          {activePanel === "trigger" && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">¿Cuándo se dispara este workflow?</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ALL_TRIGGERS.map(t => (
                  <button key={t} onClick={() => changeTrigger(t)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs text-left transition-colors ${trigger === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>
                    <span className="text-base">{TRIGGER_ICONS[t]}</span>
                    <span className="font-medium">{TRIGGER_LABELS[t]}</span>
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-border bg-muted/10 p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Configuración del trigger</p>
                <TriggerConfigEditor type={trigger} config={triggerCfg} onChange={setTriggerCfg} />
              </div>
            </div>
          )}

          {/* Conditions panel */}
          {activePanel === "conditions" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Condiciones (opcionales — AND)</p>
                <NelvyonDsButton onClick={addCondition} size="sm">+ Condición</NelvyonDsButton>
              </div>
              {conditions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border py-8 text-center">
                  <p className="text-sm text-muted-foreground">Sin condiciones — el workflow se ejecutará para todos los eventos del trigger.</p>
                </div>
              ) : (
                conditions.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl border border-border p-3">
                    <select className={`${inp} flex-1`} value={c.field}
                      onChange={e => updateCondition(i, { field: e.target.value as ConditionField })}>
                      <option value="contact.status">Estado contacto</option>
                      <option value="contact.pipeline_stage">Etapa pipeline</option>
                      <option value="contact.value">Valor contacto</option>
                      <option value="deal.stage">Etapa oportunidad</option>
                      <option value="deal.value">Valor oportunidad</option>
                      <option value="deal.probability">Probabilidad oportunidad</option>
                    </select>
                    <select className={`${inp} w-32 shrink-0`} value={c.operator}
                      onChange={e => updateCondition(i, { operator: e.target.value as "equals"|"greater_than" })}>
                      <option value="equals">=</option>
                      <option value="greater_than">&gt;</option>
                    </select>
                    <input className={`${inp} w-28 shrink-0`} value={String(c.value)}
                      onChange={e => updateCondition(i, { value: e.target.value })} />
                    <button onClick={() => removeCondition(i)} className="shrink-0 text-muted-foreground hover:text-red-400">✕</button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Actions panel */}
          {activePanel === "actions" && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">Acciones (ejecutadas en orden)</p>
              {actions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border py-8 text-center">
                  <p className="text-sm text-muted-foreground">Añade al menos una acción</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {actions.map((a, i) => (
                    <div key={i} className="rounded-xl border border-border bg-muted/5 p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{ACTION_ICONS[a.type]}</span>
                          <span className="text-sm font-medium text-foreground">{ACTION_LABELS[a.type]}</span>
                          <span className="rounded-md bg-muted/30 px-1.5 py-0.5 text-xs text-muted-foreground">#{i + 1}</span>
                        </div>
                        <div className="flex gap-1">
                          {i > 0 && <button onClick={() => moveAction(i, -1)} className="rounded p-1 text-xs text-muted-foreground hover:text-foreground">↑</button>}
                          {i < actions.length - 1 && <button onClick={() => moveAction(i, 1)} className="rounded p-1 text-xs text-muted-foreground hover:text-foreground">↓</button>}
                          <button onClick={() => removeAction(i)} className="rounded p-1 text-xs text-muted-foreground hover:text-red-400">✕</button>
                        </div>
                      </div>
                      <ActionConfigEditor type={a.type} config={a.config} onChange={cfg => updateAction(i, cfg)} />
                    </div>
                  ))}
                </div>
              )}
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Añadir acción</p>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {ALL_ACTIONS.map(t => (
                    <button key={t} onClick={() => addAction(t)}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
                      <span>{ACTION_ICONS[t]}</span><span>{ACTION_LABELS[t]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-border px-6 py-4">
          <NelvyonDsButton variant="ghost" onClick={onClose} className="flex-none">Cancelar</NelvyonDsButton>
          <NelvyonDsButton onClick={() => void save()} disabled={saving} className="flex-1">
            {saving ? "Guardando…" : initial?.id ? "Actualizar workflow" : "Crear workflow"}
          </NelvyonDsButton>
        </div>
      </div>
    </div>
  );
}

// ── Detail Panel ───────────────────────────────────────────────────────────────
function DetailPanel({
  wf, runs, versions, onClose, onEdit, onRun, onActivate, onPause,
}: {
  wf: Workflow; runs: WorkflowRun[]; versions: Array<{ id: string; versionNum: number; createdAt: string }>;
  onClose: () => void; onEdit: () => void; onRun: () => void;
  onActivate: () => void; onPause: () => void;
}) {
  const [tab, setTab] = useState<"runs"|"versions"|"config">("runs");

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="font-semibold text-foreground">{wf.name}</p>
          <div className="mt-1 flex items-center gap-2">
            <NelvyonDsBadge tone={STATUS_TONE[wf.status]}>{STATUS_LABEL[wf.status]}</NelvyonDsBadge>
            <span className="text-xs text-muted-foreground">{TRIGGER_ICONS[wf.triggerType]} {TRIGGER_LABELS[wf.triggerType]}</span>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/30">✕</button>
      </div>

      <div className="flex gap-1 border-b border-border px-5">
        {(["runs","config","versions"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "runs" ? `Runs (${runs.length})` : t === "config" ? "Configuración" : `Versiones (${versions.length})`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {tab === "runs" && (
          <div className="space-y-3">
            {runs.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">Sin runs aún — activa el workflow y espera el trigger.</p>
              </div>
            ) : runs.map(r => (
              <NelvyonDsCard key={r.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${r.status === "completed" ? "bg-green-400" : r.status === "failed" ? "bg-red-400" : "bg-yellow-400"}`} />
                    <span className="text-sm font-medium text-foreground capitalize">{r.status}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(r.startedAt).toLocaleString("es-ES")}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{r.stepsExecuted.length} pasos ejecutados</p>
                {r.stepsExecuted.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {r.stepsExecuted.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className={String(s.ok) === "true" ? "text-green-400" : "text-red-400"}>{String(s.ok) === "true" ? "✓" : "✗"}</span>
                        <span className="text-muted-foreground">{String(s.action)}</span>
                        {s.error ? <span className="text-red-400 truncate">{String(s.error)}</span> : null}
                      </div>
                    ))}
                  </div>
                )}
                {r.error && <p className="mt-1 text-xs text-red-400">{r.error}</p>}
              </NelvyonDsCard>
            ))}
          </div>
        )}

        {tab === "config" && (
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Trigger</p>
              <div className="rounded-xl border border-border p-3">
                <p className="text-sm font-medium text-foreground">{TRIGGER_ICONS[wf.triggerType]} {TRIGGER_LABELS[wf.triggerType]}</p>
                {Object.keys(wf.triggerConfig).length > 0 && (
                  <pre className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">{JSON.stringify(wf.triggerConfig, null, 2)}</pre>
                )}
              </div>
            </div>
            {wf.conditions.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Condiciones</p>
                {wf.conditions.map((c, i) => (
                  <div key={i} className="mb-1 rounded-lg border border-border p-2 text-xs text-foreground font-mono">
                    {c.field} {c.operator === "greater_than" ? ">" : "="} {String(c.value)}
                  </div>
                ))}
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Acciones ({wf.actions.length})</p>
              {wf.actions.map((a, i) => (
                <div key={i} className="mb-1 rounded-xl border border-border p-3">
                  <p className="text-xs font-medium text-foreground">{ACTION_ICONS[a.type]} {ACTION_LABELS[a.type]}</p>
                  <pre className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{JSON.stringify(a.config, null, 2)}</pre>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Runs totales: {wf.runCount} · Último: {wf.lastRunAt ? new Date(wf.lastRunAt).toLocaleString("es-ES") : "Nunca"}</p>
          </div>
        )}

        {tab === "versions" && (
          <div className="space-y-2">
            {versions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Sin versiones guardadas aún.</p>
            ) : versions.map(v => (
              <div key={v.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                <span className="text-sm font-medium text-foreground">v{v.versionNum}</span>
                <span className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString("es-ES")}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border px-5 py-4">
        {wf.status !== "active" && <NelvyonDsButton onClick={onActivate} size="sm">▶ Activar</NelvyonDsButton>}
        {wf.status === "active"  && <NelvyonDsButton onClick={onPause} variant="ghost" size="sm">⏸ Pausar</NelvyonDsButton>}
        <NelvyonDsButton onClick={onRun} variant="ghost" size="sm">▷ Ejecutar ahora</NelvyonDsButton>
        <NelvyonDsButton onClick={onEdit} variant="ghost" size="sm">✏️ Editar</NelvyonDsButton>
      </div>
    </div>
  );
}

// ── Biblioteca de plantillas oficiales Nelvyon ───────────────────────────────
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
  const [expanded, setExpanded] = useState(true);

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const q = category === "all" ? "" : `?category=${category}`;
      const res = await fetch(`/api/saas/workflows/recipes${q}`);
      if (res.ok) {
        const d = await res.json() as { recipes?: WorkflowRecipe[] };
        setRecipes(d.recipes ?? []);
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
    <NelvyonDsCard className="overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div>
          <p className="font-semibold text-foreground">Biblioteca de plantillas</p>
          <p className="text-xs text-muted-foreground">
            {recipes.length} automatizaciones oficiales Nelvyon. Importa en 1 clic.
          </p>
        </div>
        <span className="text-muted-foreground">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="border-t border-border px-5 pb-5 pt-4">
          <div className="mb-4 flex flex-wrap gap-2">
            {(Object.keys(RECIPE_CATEGORY_LABELS) as Array<RecipeCategory | "all">).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${category === c ? "bg-primary/20 text-primary" : "border border-border text-muted-foreground hover:text-foreground"}`}
              >
                {RECIPE_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/30" />)}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recipes.map((r) => (
                <div key={r.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{r.name}</p>
                    {r.isOfficial && <NelvyonDsBadge tone="primary">Oficial</NelvyonDsBadge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {TRIGGER_ICONS[r.triggerType as TriggerType]} {TRIGGER_LABELS[r.triggerType as TriggerType]}
                  </p>
                  <NelvyonDsButton
                    className="mt-3 w-full"
                    size="sm"
                    disabled={importing === r.id}
                    onClick={() => void importRecipe(r.id)}
                  >
                    {importing === r.id ? "Importando…" : "Importar workflow"}
                  </NelvyonDsButton>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </NelvyonDsCard>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SaasWorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [sesOk, setSesOk]         = useState<boolean | null>(null);
  const [selected, setSelected]   = useState<Workflow | null>(null);
  const [runs, setRuns]           = useState<WorkflowRun[]>([]);
  const [versions, setVersions]   = useState<Array<{ id: string; versionNum: number; createdAt: string }>>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editing, setEditing]     = useState<Workflow | null>(null);
  const [filter, setFilter]       = useState<WorkflowStatus | "all">("all");
  const [installingPack, setInstallingPack] = useState(false);
  const [packMsg, setPackMsg] = useState<string | null>(null);

  async function installStarterPack() {
    setInstallingPack(true);
    setPackMsg(null);
    try {
      const res = await fetch("/api/saas/starter-pack", { method: "POST" });
      const d = await res.json() as { totalWorkflows?: number; totalSequences?: number; error?: string };
      if (!res.ok) { setPackMsg(d.error ?? "Error al instalar pack"); return; }
      setPackMsg(`✅ Kit instalado: ${d.totalWorkflows ?? 6} workflows + ${d.totalSequences ?? 4} secuencias`);
      await load();
    } finally { setInstallingPack(false); }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/workflows");
      if (res.ok) {
        const d = await res.json() as { workflows?: Workflow[]; ses_configured?: boolean };
        setWorkflows(d.workflows ?? []);
        setSesOk(d.ses_configured ?? false);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function openDetail(wf: Workflow) {
    setSelected(wf);
    const [runsRes, versRes] = await Promise.all([
      fetch(`/api/saas/workflows/${wf.id}/runs`),
      fetch(`/api/saas/workflows/${wf.id}/versions`),
    ]);
    if (runsRes.ok)  { const d = await runsRes.json()  as { runs?: WorkflowRun[] };  setRuns(d.runs ?? []); }
    if (versRes.ok)  { const d = await versRes.json() as { versions?: Array<{ id: string; versionNum: number; createdAt: string }> }; setVersions(d.versions ?? []); }
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

  const filtered = filter === "all" ? workflows : workflows.filter(w => w.status === filter);

  const counts = { all: workflows.length, active: 0, paused: 0, draft: 0, archived: 0 };
  workflows.forEach(w => counts[w.status]++);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="workflows" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <NelvyonDsSectionHeader title="Workflows" subtitle="Automaciones trigger → condición → acción. 16 triggers, 17 acciones, 24+ plantillas." />
          <div className="flex gap-2">
            <NelvyonDsButton variant="ghost" disabled={installingPack} onClick={() => void installStarterPack()}>
              {installingPack ? "Instalando…" : "⚡ Kit arranque Nelvyon"}
            </NelvyonDsButton>
            <a href="/saas/workflows/editor" className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white">
              Editor visual
            </a>
            <NelvyonDsButton onClick={() => { setEditing(null); setShowBuilder(true); }}>+ Nuevo workflow</NelvyonDsButton>
          </div>
        </div>

        {packMsg && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${packMsg.startsWith("✅") ? "border-green-500/30 bg-green-500/5 text-green-400" : "border-red-500/30 bg-red-500/5 text-red-400"}`}>
            {packMsg}
          </div>
        )}

        {sesOk === false && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-400">
            ⚠️ <strong>Email no configurado</strong> — las acciones &quot;Enviar email&quot; fallarán hasta definir <code>SES_FROM_EMAIL</code> + <code>SES_ACCESS_KEY_ID</code> en Railway.
          </div>
        )}

        <RecipeGallery onImported={() => void load()} />

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(["all","active","paused","draft","archived"] as const).map(s => (
            <NelvyonDsCard key={s} onClick={() => setFilter(s)}
              className={`cursor-pointer p-4 transition-colors ${filter === s ? "border-primary" : ""}`}>
              <p className="text-xs text-muted-foreground capitalize">{s === "all" ? "Total" : STATUS_LABEL[s as WorkflowStatus]}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{counts[s]}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/30" />)}</div>
        ) : filtered.length === 0 ? (
          <NelvyonDsCard className="p-14 text-center">
            <p className="text-3xl">⚡</p>
            <p className="mt-3 text-lg font-semibold text-foreground">Sin workflows</p>
            <p className="mt-1 text-sm text-muted-foreground">Crea tu primer workflow para automatizar acciones.</p>
            <NelvyonDsButton className="mt-5" onClick={() => { setEditing(null); setShowBuilder(true); }}>+ Crear workflow</NelvyonDsButton>
          </NelvyonDsCard>
        ) : (
          <div className="space-y-3">
            {filtered.map(wf => (
              <NelvyonDsCard key={wf.id} className="p-4 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => void openDetail(wf)}>
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{wf.name}</p>
                      <NelvyonDsBadge tone={STATUS_TONE[wf.status]}>{STATUS_LABEL[wf.status]}</NelvyonDsBadge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{TRIGGER_ICONS[wf.triggerType]} {TRIGGER_LABELS[wf.triggerType]} · {wf.actions.length} acción{wf.actions.length !== 1 ? "es" : ""}</p>
                    {wf.description && <p className="mt-1 text-xs text-muted-foreground truncate">{wf.description}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-foreground">{wf.runCount} runs</p>
                    <p className="text-xs text-muted-foreground">{wf.lastRunAt ? new Date(wf.lastRunAt).toLocaleDateString("es-ES") : "Nunca"}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2" onClick={e => e.stopPropagation()}>
                  {wf.status !== "active" && (
                    <button onClick={() => void changeStatus(wf, "active")}
                      className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs text-green-400 hover:bg-green-500/20 transition-colors">▶ Activar</button>
                  )}
                  {wf.status === "active" && (
                    <button onClick={() => void changeStatus(wf, "paused")}
                      className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-400 hover:bg-yellow-500/20 transition-colors">⏸ Pausar</button>
                  )}
                  <button onClick={() => void runWorkflow(wf)}
                    className="rounded-lg border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors">▷ Ejecutar</button>
                  <button onClick={() => { setEditing(wf); setShowBuilder(true); }}
                    className="rounded-lg border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors">✏️ Editar</button>
                  <button onClick={() => void deleteWorkflow(wf)}
                    className="rounded-lg border border-red-500/20 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10 transition-colors">✕ Eliminar</button>
                </div>
              </NelvyonDsCard>
            ))}
          </div>
        )}
      </div>

      {showBuilder && (
        <BuilderModal
          initial={editing ?? undefined}
          onClose={() => { setShowBuilder(false); setEditing(null); }}
          onSaved={() => void load()} />
      )}

      {selected && !showBuilder && (
        <DetailPanel
          wf={workflows.find(w => w.id === selected.id) ?? selected}
          runs={runs}
          versions={versions}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setShowBuilder(true); }}
          onRun={() => void runWorkflow(selected)}
          onActivate={() => void changeStatus(selected, "active")}
          onPause={() => void changeStatus(selected, "paused")} />
      )}
    </SaasShellLayout>
  );
}
