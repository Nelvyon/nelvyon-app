"use client";

import { useState, useEffect, useCallback } from "react";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import {
  NelvyonDsBadge,
  NelvyonDsButton,
  NelvyonDsCard,
  NelvyonDsSectionHeader,
} from "@/design-system/components";
import { KpiTile } from "@/features/saas-shell/components/SaasDashboardWidgets";
import { SaasEmptyState } from "@/features/saas-shell/components/SaasEmptyState";
import type { SaasSequence, SaasSequenceStep } from "@nelvyon/saas";

// ── Types ───────────────────────────────────────────────────────────────────

type SequenceWithSteps = SaasSequence & { steps?: SaasSequenceStep[] };

// ── Step type badge ──────────────────────────────────────────────────────────

const STEP_TYPE_LABELS: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
  wait: "Espera",
  branch: "Bifurcación",
};

const STEP_TYPE_TONE: Record<string, "primary" | "success" | "warning" | "neutral"> = {
  email: "primary",
  sms: "success",
  whatsapp: "success",
  wait: "warning",
  branch: "neutral",
};

function StepTypeBadge({ type }: { type: string }) {
  return (
    <NelvyonDsBadge tone={STEP_TYPE_TONE[type] ?? "neutral"}>
      {STEP_TYPE_LABELS[type] ?? type}
    </NelvyonDsBadge>
  );
}

// ── Enroll Modal ─────────────────────────────────────────────────────────────

type CrmContact = { id: string; name: string; email: string | null; company?: string | null };

function EnrollModal({
  sequence,
  onClose,
  onEnrolled,
}: {
  sequence: SaasSequence;
  onClose: () => void;
  onEnrolled: () => void;
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
      const d = await res.json() as { contacts?: CrmContact[] };
      setContacts(d.contacts ?? []);
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
        const d = await res.json().catch(() => ({})) as { error?: string };
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h3 className="mb-1 font-semibold text-foreground">Inscribir contacto</h3>
        <p className="mb-4 text-sm text-muted-foreground">Secuencia: <span className="text-foreground">{sequence.name}</span></p>
        <input
          className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          placeholder="Buscar por nombre, email o empresa…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="mb-3 max-h-48 overflow-y-auto rounded-lg border border-border">
          {searching ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">Buscando contactos…</p>
          ) : contacts.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">Sin contactos — prueba otra búsqueda</p>
          ) : (
            contacts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c)}
                className={`w-full border-b border-border/60 px-3 py-2 text-left text-sm last:border-0 transition ${
                  selected?.id === c.id ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted/20"
                }`}
              >
                <span className="font-medium">{c.name}</span>
                {c.email && <span className="block text-xs text-muted-foreground">{c.email}</span>}
              </button>
            ))
          )}
        </div>
        {selected && (
          <p className="mb-3 text-xs text-muted-foreground">
            Seleccionado: <span className="text-foreground">{selected.name}</span>
            {selected.email ? ` · ${selected.email}` : ""}
          </p>
        )}
        {err && <p className="mb-3 text-xs text-destructive">{err}</p>}
        <div className="flex gap-2">
          <NelvyonDsButton type="button" variant="ghost" className="flex-1" onClick={onClose}>
            Cancelar
          </NelvyonDsButton>
          <NelvyonDsButton type="button" className="flex-1" disabled={loading || !selected} onClick={handleEnroll}>
            {loading ? "Inscribiendo…" : "Inscribir"}
          </NelvyonDsButton>
        </div>
      </div>
    </div>
  );
}

// ── Add Step Modal ───────────────────────────────────────────────────────────

function AddStepModal({
  sequence,
  onClose,
  onAdded,
}: {
  sequence: SaasSequence;
  onClose: () => void;
  onAdded: () => void;
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
        const d = await res.json().catch(() => ({})) as { error?: string };
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h3 className="mb-4 font-semibold text-foreground">Añadir paso</h3>

        <div className="mb-4 flex flex-wrap gap-2">
          {(["email", "sms", "whatsapp", "wait", "branch"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setStepType(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                stepType === t ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "email" ? "Email" : t === "sms" ? "SMS" : t === "whatsapp" ? "WhatsApp" : t === "wait" ? "Espera" : "Bifurcación"}
            </button>
          ))}
        </div>

        <div className="mb-3 flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Retraso (días)</label>
            <input className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground" type="number" value={delayDays} onChange={(e) => setDelayDays(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Retraso (horas)</label>
            <input className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground" type="number" value={delayHours} onChange={(e) => setDelayHours(e.target.value)} />
          </div>
        </div>

        {(stepType === "email" || stepType === "sms" || stepType === "whatsapp") && (
          <>
            {stepType === "email" && (
              <input
                className="mb-2 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground"
                placeholder="Asunto del email"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            )}
            <textarea
              className="mb-2 h-24 w-full resize-none rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground"
              placeholder={stepType === "email" ? "Cuerpo HTML del email" : "Mensaje SMS / WhatsApp"}
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
            />
          </>
        )}

        {stepType === "branch" && (
          <div className="mb-2 space-y-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Condición</label>
              <select
                className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                value={branchField}
                onChange={(e) => setBranchField(e.target.value as "replied" | "opened" | "clicked")}
              >
                <option value="replied">Ha respondido</option>
                <option value="opened">Ha abierto email</option>
                <option value="clicked">Ha hecho click</option>
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-success">Sí → posición</label>
                <input className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground" type="number" placeholder="auto" value={branchYes} onChange={(e) => setBranchYes(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-destructive">No → posición</label>
                <input className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground" type="number" placeholder="auto" value={branchNo} onChange={(e) => setBranchNo(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {err && <p className="mb-3 text-xs text-destructive">{err}</p>}
        <div className="mt-4 flex gap-2">
          <NelvyonDsButton type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancelar</NelvyonDsButton>
          <NelvyonDsButton type="button" className="flex-1" disabled={loading} onClick={handleAdd}>
            {loading ? "Añadiendo…" : "Añadir paso"}
          </NelvyonDsButton>
        </div>
      </div>
    </div>
  );
}

// ── Create Sequence Modal ────────────────────────────────────────────────────

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
        const d = await res.json().catch(() => ({})) as { error?: string };
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h3 className="mb-4 font-semibold text-foreground">Nueva secuencia</h3>
        <input className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground" placeholder="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <select className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
          <option value="manual">Manual</option>
          <option value="contact_created">Al crear contacto</option>
          <option value="form_submitted">Al enviar formulario</option>
          <option value="tag_added">Al añadir etiqueta</option>
        </select>
        {err && <p className="mb-3 text-xs text-destructive">{err}</p>}
        <div className="flex gap-2">
          <NelvyonDsButton type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancelar</NelvyonDsButton>
          <NelvyonDsButton type="button" className="flex-1" disabled={loading} onClick={handleCreate}>
            {loading ? "Creando…" : "Crear"}
          </NelvyonDsButton>
        </div>
      </div>
    </div>
  );
}

// ── Sequence template gallery ────────────────────────────────────────────────

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
  const [expanded, setExpanded] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = category === "all" ? "" : `?category=${category}`;
      const res = await fetch(`/api/saas/sequences/templates${q}`);
      if (res.ok) {
        const d = await res.json() as { templates?: SeqTemplate[] };
        setTemplates(d.templates ?? []);
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
    <NelvyonDsCard className="overflow-hidden border-primary/20">
      <button type="button" className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left" onClick={() => setExpanded((v) => !v)}>
        <div>
          <p className="font-semibold text-foreground">Plantillas oficiales Nelvyon</p>
          <p className="text-xs text-muted-foreground">{templates.length} secuencias drip — email, SMS y WhatsApp</p>
        </div>
        <span className="text-muted-foreground">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="border-t border-border px-5 pb-5 pt-4">
          <div className="mb-4 flex flex-wrap gap-2">
            {(Object.keys(SEQ_CAT_LABELS) as Array<SeqTemplateCategory | "all">).map((c) => (
              <button key={c} type="button" onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1 text-xs ${category === c ? "bg-primary/20 text-primary" : "border border-border text-muted-foreground"}`}>
                {SEQ_CAT_LABELS[c]}
              </button>
            ))}
          </div>
          {loading ? (
            <p className="py-4 text-sm text-muted-foreground">Cargando plantillas…</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {templates.map((t) => (
                <div key={t.id} className="rounded-xl border border-border p-4">
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                  <NelvyonDsButton
                    variant="ghost"
                    size="sm"
                    className="mt-3 w-full"
                    disabled={importing === t.id}
                    onClick={() => void importTpl(t.id)}
                  >
                    {importing === t.id ? "Importando…" : "Importar secuencia"}
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

// ── Main Page ────────────────────────────────────────────────────────────────

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
      const d = await res.json() as { sequences: SaasSequence[]; ses_configured?: boolean; twilio_configured?: boolean };
      setSequences(d.sequences);
      setSesConfigured(typeof d.ses_configured === "boolean" ? d.ses_configured : null);
      setTwilioConfigured(typeof d.twilio_configured === "boolean" ? d.twilio_configured : null);
    } catch (e) {
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
      const d = await res.json() as { sequence: SaasSequence; steps: SaasSequenceStep[] };
      const full: SequenceWithSteps = { ...d.sequence, steps: d.steps };
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

  const TRIGGER_LABELS: Record<string, string> = {
    manual: "Manual", contact_created: "Nuevo contacto",
    form_submitted: "Formulario", tag_added: "Etiqueta",
  };

  const SEQ_STATUS_TONE: Record<string, "success" | "warning" | "neutral"> = {
    active: "success", paused: "warning", archived: "neutral",
  };
  const SEQ_STATUS_LABELS: Record<string, string> = {
    active: "Activa", paused: "Pausada", archived: "Archivada",
  };

  const totalEnrollments = sequences.reduce((sum, s) => sum + s.enrollmentsCount, 0);
  const activeCount = sequences.filter((s) => s.status === "active").length;

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="secuencias" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader
            title="Secuencias"
            subtitle="Secuencias drip multicanal — plantillas oficiales Nelvyon"
          />
          <NelvyonDsButton onClick={() => setShowCreate(true)}>+ Nueva secuencia</NelvyonDsButton>
        </div>

        {err && (
          <NelvyonDsCard className="border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">⚠ {err}</p>
          </NelvyonDsCard>
        )}

        {sesConfigured === false && (
          <NelvyonDsCard className="border-warning/30 bg-warning/5 p-4">
            <p className="text-sm text-warning">
              <strong>Email no configurado:</strong> las variables{" "}
              <code className="text-xs">SES_FROM_EMAIL</code> y{" "}
              <code className="text-xs">SES_ACCESS_KEY_ID</code> no están definidas en el servidor.
              Los pasos de email en secuencias fallarán hasta configurar SES (y salir de sandbox si aplica).
            </p>
          </NelvyonDsCard>
        )}

        {twilioConfigured === false && (
          <NelvyonDsCard className="border-warning/30 bg-warning/5 p-4">
            <p className="text-sm text-warning">
              <strong>SMS no configurado:</strong> define{" "}
              <code className="text-xs">TWILIO_ACCOUNT_SID</code>,{" "}
              <code className="text-xs">TWILIO_AUTH_TOKEN</code> y{" "}
              <code className="text-xs">TWILIO_FROM_NUMBER</code>. Los pasos SMS fallarán hasta configurar Twilio.
            </p>
          </NelvyonDsCard>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <KpiTile icon="🔄" label="Secuencias" value={sequences.length} />
          <KpiTile icon="⚡" label="Activas" value={activeCount} accent />
          <KpiTile icon="👥" label="Inscritos" value={totalEnrollments} />
        </div>

        <SequenceTemplateGallery onImported={() => void loadSequences()} />

        {loading ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/30" />
            ))}
          </div>
        ) : sequences.length === 0 ? (
          <SaasEmptyState
            title="Sin secuencias aún"
            description="Crea tu primera secuencia de email drip con branching automático, o importa una plantilla oficial arriba."
            action={<NelvyonDsButton onClick={() => setShowCreate(true)}>Crear secuencia</NelvyonDsButton>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Sequence list */}
            <div className="space-y-3">
              {sequences.map((seq) => (
                <NelvyonDsCard
                  key={seq.id}
                  className={`cursor-pointer transition hover:border-primary/40 ${selected?.id === seq.id ? "border-primary/50 bg-primary/5" : ""}`}
                  onClick={() => void loadDetail(seq)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{seq.name}</p>
                      {seq.description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{seq.description}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">{TRIGGER_LABELS[seq.triggerType] ?? seq.triggerType} · {seq.enrollmentsCount} inscritos</p>
                    </div>
                    <NelvyonDsBadge tone={SEQ_STATUS_TONE[seq.status] ?? "neutral"}>
                      {SEQ_STATUS_LABELS[seq.status] ?? seq.status}
                    </NelvyonDsBadge>
                  </div>
                </NelvyonDsCard>
              ))}
            </div>

            {/* Detail panel */}
            {selected ? (
              <div className="lg:col-span-2">
                <NelvyonDsCard>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-semibold text-foreground">{selected.name}</h2>
                    <div className="flex gap-2">
                      <NelvyonDsButton variant="ghost" size="sm" onClick={() => setEnrollTarget(selected)}>
                        Inscribir contacto
                      </NelvyonDsButton>
                      <NelvyonDsButton
                        variant={selected.status === "active" ? "secondary" : "primary"}
                        size="sm"
                        onClick={() => void toggleStatus(selected)}
                      >
                        {selected.status === "active" ? "Pausar" : "Activar"}
                      </NelvyonDsButton>
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pasos ({selected.steps?.length ?? 0})</h3>
                      <button type="button" onClick={() => setShowAddStep(true)} className="text-xs text-primary hover:underline">
                        + Añadir paso
                      </button>
                    </div>
                    {!selected.steps?.length ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">Sin pasos — añade email, espera o bifurcación</p>
                    ) : (
                      selected.steps.map((step, i) => (
                        <div key={step.id} className="flex items-start gap-3 rounded-lg border border-border bg-muted/10 p-3">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">{i}</div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <StepTypeBadge type={step.stepType} />
                              {(step.delayDays > 0 || step.delayHours > 0) && (
                                <span className="text-xs text-muted-foreground">+{step.delayDays}d {step.delayHours}h</span>
                              )}
                            </div>
                            {step.stepType === "email" && (
                              <p className="truncate text-sm text-foreground">{step.subject || "(sin asunto)"}</p>
                            )}
                            {step.stepType === "branch" && step.branchCondition && (
                              <p className="text-xs text-muted-foreground">
                                Si {step.branchCondition.field} → pos {step.branchYesPosition ?? "auto"} | No → pos {step.branchNoPosition ?? "auto"}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </NelvyonDsCard>
              </div>
            ) : (
              <div className="flex items-center justify-center text-sm text-muted-foreground lg:col-span-2">
                Selecciona una secuencia para editar sus pasos
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateSequenceModal onClose={() => setShowCreate(false)} onCreated={loadSequences} />
      )}
      {enrollTarget && (
        <EnrollModal sequence={enrollTarget} onClose={() => setEnrollTarget(null)} onEnrolled={loadSequences} />
      )}
      {showAddStep && selected && (
        <AddStepModal
          sequence={selected}
          onClose={() => setShowAddStep(false)}
          onAdded={() => void loadDetail(selected)}
        />
      )}
    </SaasShellLayout>
  );
}
