"use client";

import { useCallback, useEffect, useState } from "react";

import {
  NelvyonDsBadge,
  NelvyonDsButton,
  NelvyonDsCard,
  NelvyonDsSectionHeader,
} from "@/design-system/components";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { SaasShellLayout, DarkCard, StatCard } from "@/features/saas-shell/components/SaasShellLayout";

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

const STATUS_TONE = {
  lead: "primary",
  prospect: "warning",
  client: "success",
  churned: "danger",
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function eur(n: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
      {initials(name)}
    </div>
  );
}

// ─── Pipeline Board ───────────────────────────────────────────────────────────

function PipelineBoard({ pipeline }: { pipeline: PipelineItem[] }) {
  const map = Object.fromEntries(pipeline.map((p) => [p.stage, p]));
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {STAGES.map((stage) => {
        const d = map[stage] ?? { count: 0, totalValue: 0 };
        return (
          <div
            key={stage}
            className={`rounded-xl border p-4 text-center ${
              stage === "won"
                ? "border-green-500/30 bg-green-500/5"
                : stage === "lost"
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-border bg-card"
            }`}
          >
            <p className="text-xs text-muted-foreground">{STAGE_LABELS[stage]}</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{d.count}</p>
            {d.totalValue > 0 && (
              <p className="mt-1 text-xs font-medium text-primary">{eur(d.totalValue)}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── New Contact Modal ────────────────────────────────────────────────────────

function NewContactModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-semibold text-foreground">Nuevo contacto</h2>
        {error && (
          <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>
        )}
        <form onSubmit={submit} className="space-y-3">
          {(
            [
              { k: "name", label: "Nombre *", type: "text", placeholder: "Nombre completo" },
              { k: "email", label: "Email", type: "email", placeholder: "email@empresa.com" },
              { k: "phone", label: "Teléfono", type: "tel", placeholder: "+34 600 000 000" },
              { k: "company", label: "Empresa", type: "text", placeholder: "Nombre de la empresa" },
              { k: "position", label: "Cargo", type: "text", placeholder: "CEO, Director de Marketing…" },
            ] as const
          ).map(({ k, label, type, placeholder }) => (
            <div key={k}>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
              <input
                type={type}
                value={form[k]}
                onChange={set(k)}
                placeholder={placeholder}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Valor estimado (€)</label>
            <input
              type="number"
              min="0"
              value={form.value}
              onChange={set("value")}
              placeholder="0"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">
              Cancelar
            </NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">
              {saving ? "Guardando…" : "Crear contacto"}
            </NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Contact Detail Panel ─────────────────────────────────────────────────────

function ContactDetail({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [copilot, setCopilot] = useState<{ summary: string; nextBestAction: string; emailDraft: string; score: number } | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(true);

  useEffect(() => {
    setCopilotLoading(true);
    fetch("/api/saas/crm/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: contact.id }),
    })
      .then((r) => r.json())
      .then((d: { suggestion?: typeof copilot }) => { if (d.suggestion) setCopilot(d.suggestion); })
      .catch(() => {})
      .finally(() => setCopilotLoading(false));
  }, [contact.id]);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/saas/crm/contacts/${contact.id}/activities`, {
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
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={contact.name} />
          <div>
            <h3 className="font-semibold text-foreground">{contact.name}</h3>
            {contact.company && <p className="text-sm text-muted-foreground">{contact.company}</p>}
          </div>
        </div>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Estado", value: STATUS_LABELS[contact.status] },
          { label: "Etapa", value: STAGE_LABELS[contact.pipelineStage] },
          { label: "Email", value: contact.email ?? "—" },
          { label: "Teléfono", value: contact.phone ?? "—" },
          { label: "Cargo", value: contact.position ?? "—" },
          { label: "Valor", value: contact.value > 0 ? eur(contact.value) : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-muted/20 p-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {contact.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {contact.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{tag}</span>
          ))}
        </div>
      )}

      <NelvyonDsCard className="border-primary/20 bg-primary/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">IA Copilot</p>
        {copilotLoading ? (
          <p className="mt-2 text-xs text-muted-foreground">Analizando contacto…</p>
        ) : copilot ? (
          <div className="mt-2 space-y-2 text-sm">
            <p className="text-foreground">{copilot.summary}</p>
            <p className="text-xs text-muted-foreground"><strong>Siguiente acción:</strong> {copilot.nextBestAction}</p>
            <pre className="max-h-24 overflow-auto rounded bg-muted/20 p-2 text-xs text-muted-foreground whitespace-pre-wrap">{copilot.emailDraft}</pre>
            <NelvyonDsButton size="sm" variant="ghost" onClick={() => void navigator.clipboard.writeText(copilot.emailDraft)}>
              Copiar email
            </NelvyonDsButton>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">Sin sugerencias</p>
        )}
      </NelvyonDsCard>

      {contact.notes && (
        <div className="rounded-lg bg-muted/10 p-3">
          <p className="mb-1 text-xs text-muted-foreground">Notas</p>
          <p className="text-sm text-foreground">{contact.notes}</p>
        </div>
      )}

      <form onSubmit={addNote} className="mt-auto border-t border-border pt-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Añadir nota</p>
        <div className="flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Escribe una nota sobre este contacto…"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <NelvyonDsButton type="submit" disabled={saving || !note.trim()}>
            Añadir
          </NelvyonDsButton>
        </div>
      </form>
    </div>
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
  const [tab, setTab] = useState<"contacts" | "pipeline">("contacts");

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

  const totalValue = contacts.reduce((s, c) => s + (c.value ?? 0), 0);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="crm" />}>
      <div className="flex h-full flex-col gap-6 pb-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#0084ff]/70">CRM</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Contactos</h1>
            <p className="mt-0.5 text-sm text-white/40">{contacts.length} contactos · {eur(totalValue)} en pipeline</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="rounded-lg bg-gradient-to-r from-[#0084ff] to-[#0047ab] px-4 py-2 text-sm font-medium text-white shadow-[0_0_16px_rgba(0,132,255,0.3)] hover:shadow-[0_0_24px_rgba(0,132,255,0.4)] transition-all"
          >
            + Nuevo contacto
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total", value: contacts.length, accent: true },
            { label: "Clientes", value: contacts.filter((c) => c.status === "client").length, accent: false },
            { label: "Leads", value: contacts.filter((c) => c.status === "lead").length, accent: false },
            { label: "Pipeline €", value: eur(totalValue), accent: false },
          ].map(({ label, value, accent }) => (
            <StatCard key={label} label={label} value={value} accent={accent} />
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-white/[0.07]">
          {(["contacts", "pipeline"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "border-b-2 border-[#0084ff] text-[#0084ff]"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {t === "contacts" ? "Contactos" : "Pipeline"}
            </button>
          ))}
        </div>

        {/* Pipeline view */}
        {tab === "pipeline" && (
          <NelvyonDsCard className="p-5">
            <PipelineBoard pipeline={pipeline} />
          </NelvyonDsCard>
        )}

        {/* Contacts view */}
        {tab === "contacts" && (
          <>
            <div className="flex flex-wrap gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, empresa o email…"
                className="min-w-[220px] flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ContactStatus | "")}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">Todos los estados</option>
                {(Object.keys(STATUS_LABELS) as ContactStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-1 gap-4 overflow-hidden">
              <div className={`flex flex-col gap-2 overflow-y-auto ${selected ? "w-1/2" : "w-full"}`}>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/30" />
                  ))
                ) : contacts.length === 0 ? (
                  <NelvyonDsCard className="p-16 text-center">
                    <p className="text-5xl">👥</p>
                    <p className="mt-4 text-lg font-semibold text-foreground">Sin contactos todavía</p>
                    <p className="mt-2 text-sm text-muted-foreground">Añade tu primer contacto para empezar</p>
                    <NelvyonDsButton className="mt-5" onClick={() => setShowNew(true)}>
                      + Añadir contacto
                    </NelvyonDsButton>
                  </NelvyonDsCard>
                ) : (
                  contacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelected(c)}
                      className={`w-full rounded-xl border p-4 text-left transition-all ${
                        selected?.id === c.id
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/40 hover:bg-muted/20"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar name={c.name} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate font-medium text-foreground">{c.name}</p>
                            <NelvyonDsBadge tone={STATUS_TONE[c.status]}>
                              {STATUS_LABELS[c.status]}
                            </NelvyonDsBadge>
                          </div>
                          {c.company && (
                            <p className="mt-0.5 truncate text-sm text-muted-foreground">{c.company}</p>
                          )}
                          {c.email && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.email}</p>
                          )}
                          {c.value > 0 && (
                            <p className="mt-1 text-xs font-semibold text-primary">{eur(c.value)}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {selected && (
                <NelvyonDsCard className="w-1/2 overflow-y-auto p-5">
                  <ContactDetail contact={selected} onClose={() => setSelected(null)} />
                </NelvyonDsCard>
              )}
            </div>
          </>
        )}
      </div>

      {showNew && <NewContactModal onClose={() => setShowNew(false)} onSaved={load} />}
    </SaasShellLayout>
  );
}
