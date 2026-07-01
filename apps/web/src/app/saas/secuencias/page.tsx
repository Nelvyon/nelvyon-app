"use client";

import { useState, useEffect, useCallback } from "react";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { NelvyonDsCard } from "@/design-system/components";
import type { SaasSequence, SaasSequenceStep } from "@nelvyon/saas";

// ── Types ───────────────────────────────────────────────────────────────────

type SequenceWithSteps = SaasSequence & { steps?: SaasSequenceStep[] };

// ── Step type badge ──────────────────────────────────────────────────────────

function StepTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    email: { label: "Email", cls: "bg-blue-500/20 text-blue-300" },
    sms: { label: "SMS", cls: "bg-green-500/20 text-green-300" },
    whatsapp: { label: "WhatsApp", cls: "bg-emerald-500/20 text-emerald-300" },
    wait:  { label: "Espera", cls: "bg-yellow-500/20 text-yellow-300" },
    branch:{ label: "Bifurcación", cls: "bg-purple-500/20 text-purple-300" },
  };
  const { label, cls } = map[type] ?? { label: type, cls: "bg-gray-500/20 text-gray-300" };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{label}</span>;
}

// ── Enroll Modal ─────────────────────────────────────────────────────────────

function EnrollModal({
  sequence,
  onClose,
  onEnrolled,
}: {
  sequence: SaasSequence;
  onClose: () => void;
  onEnrolled: () => void;
}) {
  const [contactId, setContactId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleEnroll() {
    if (!contactId.trim()) { setErr("Contact ID requerido"); return; }
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/saas/sequences/${sequence.id}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: contactId.trim() }),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0d1117] border border-white/10 rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-white font-semibold mb-1">Inscribir contacto</h3>
        <p className="text-sm text-white/50 mb-4">Secuencia: <span className="text-white/80">{sequence.name}</span></p>
        <input
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 mb-3"
          placeholder="UUID del contacto"
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
        />
        {err && <p className="text-red-400 text-xs mb-3">{err}</p>}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-white/10 text-white/60 text-sm hover:bg-white/5 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleEnroll}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-[#0084ff] text-white text-sm font-medium hover:bg-blue-500 transition disabled:opacity-50"
          >
            {loading ? "Inscribiendo…" : "Inscribir"}
          </button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0d1117] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-white font-semibold mb-4">Añadir paso</h3>

        <div className="flex flex-wrap gap-2 mb-4">
          {(["email", "sms", "whatsapp", "wait", "branch"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setStepType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                stepType === t ? "bg-[#0084ff] text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              {t === "email" ? "Email" : t === "sms" ? "SMS" : t === "whatsapp" ? "WhatsApp" : t === "wait" ? "Espera" : "Bifurcación"}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <label className="block text-xs text-white/50 mb-1">Retraso (días)</label>
            <input className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm" type="number" value={delayDays} onChange={(e) => setDelayDays(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-white/50 mb-1">Retraso (horas)</label>
            <input className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm" type="number" value={delayHours} onChange={(e) => setDelayHours(e.target.value)} />
          </div>
        </div>

        {(stepType === "email" || stepType === "sms" || stepType === "whatsapp") && (
          <>
            {stepType === "email" && (
              <input
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm mb-2 placeholder-white/30"
                placeholder="Asunto del email"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            )}
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm mb-2 placeholder-white/30 h-24 resize-none"
              placeholder={stepType === "email" ? "Cuerpo HTML del email" : "Mensaje SMS / WhatsApp"}
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
            />
          </>
        )}

        {stepType === "branch" && (
          <div className="space-y-2 mb-2">
            <div>
              <label className="block text-xs text-white/50 mb-1">Condición</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm"
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
                <label className="block text-xs text-green-400 mb-1">Sí → posición</label>
                <input className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm" type="number" placeholder="auto" value={branchYes} onChange={(e) => setBranchYes(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-red-400 mb-1">No → posición</label>
                <input className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm" type="number" placeholder="auto" value={branchNo} onChange={(e) => setBranchNo(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {err && <p className="text-red-400 text-xs mb-3">{err}</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-white/60 text-sm hover:bg-white/5 transition">Cancelar</button>
          <button onClick={handleAdd} disabled={loading} className="flex-1 py-2 rounded-lg bg-[#0084ff] text-white text-sm font-medium hover:bg-blue-500 transition disabled:opacity-50">
            {loading ? "Añadiendo…" : "Añadir paso"}
          </button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0d1117] border border-white/10 rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-white font-semibold mb-4">Nueva secuencia</h3>
        <input className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 mb-3" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 mb-3" placeholder="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <select className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm mb-3" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
          <option value="manual">Manual</option>
          <option value="contact_created">Al crear contacto</option>
          <option value="form_submitted">Al enviar formulario</option>
          <option value="tag_added">Al añadir etiqueta</option>
        </select>
        {err && <p className="text-red-400 text-xs mb-3">{err}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-white/60 text-sm hover:bg-white/5 transition">Cancelar</button>
          <button onClick={handleCreate} disabled={loading} className="flex-1 py-2 rounded-lg bg-[#0084ff] text-white text-sm font-medium hover:bg-blue-500 transition disabled:opacity-50">
            {loading ? "Creando…" : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function SecuenciasPage() {
  const [sequences, setSequences] = useState<SequenceWithSteps[]>([]);
  const [selected, setSelected] = useState<SequenceWithSteps | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [enrollTarget, setEnrollTarget] = useState<SaasSequence | null>(null);
  const [showAddStep, setShowAddStep] = useState(false);

  const loadSequences = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch("/api/saas/sequences");
      if (!res.ok) throw new Error("Error al cargar secuencias");
      const d = await res.json() as { sequences: SaasSequence[] };
      setSequences(d.sequences);
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

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="secuencias" />}>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Secuencias</h1>
            <p className="text-white/50 text-sm mt-1">Drip campaigns con branching, steps de espera y detección de respuesta</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-[#0084ff] text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition"
          >
            + Nueva secuencia
          </button>
        </div>

        {err && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{err}</div>
        )}

        {loading ? (
          <div className="text-center py-16 text-white/40">Cargando secuencias…</div>
        ) : sequences.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-white/40 text-lg">Sin secuencias aún</p>
            <p className="text-white/30 text-sm mt-2">Crea tu primera secuencia de email drip con branching automático</p>
            <button onClick={() => setShowCreate(true)} className="mt-4 px-4 py-2 bg-[#0084ff] text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition">
              Crear secuencia
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sequence list */}
            <div className="space-y-3">
              {sequences.map((seq) => (
                <NelvyonDsCard
                  key={seq.id}
                  className={`cursor-pointer transition hover:border-white/20 ${selected?.id === seq.id ? "border-[#0084ff]/50 bg-[#0084ff]/5" : ""}`}
                  onClick={() => void loadDetail(seq)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm truncate">{seq.name}</p>
                      {seq.description && <p className="text-white/40 text-xs mt-0.5 truncate">{seq.description}</p>}
                      <p className="text-white/30 text-xs mt-1">{TRIGGER_LABELS[seq.triggerType] ?? seq.triggerType} · {seq.enrollmentsCount} inscritos</p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                      seq.status === "active" ? "bg-green-500/20 text-green-400"
                      : seq.status === "paused" ? "bg-yellow-500/20 text-yellow-300"
                      : "bg-gray-500/20 text-gray-400"
                    }`}>
                      {seq.status === "active" ? "Activa" : seq.status === "paused" ? "Pausada" : "Archivada"}
                    </span>
                  </div>
                </NelvyonDsCard>
              ))}
            </div>

            {/* Detail panel */}
            {selected ? (
              <div className="lg:col-span-2">
                <NelvyonDsCard>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-semibold">{selected.name}</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEnrollTarget(selected)}
                        className="px-3 py-1.5 bg-[#0084ff]/20 text-[#0084ff] rounded-lg text-xs font-medium hover:bg-[#0084ff]/30 transition"
                      >
                        Inscribir contacto
                      </button>
                      <button
                        onClick={() => void toggleStatus(selected)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          selected.status === "active"
                            ? "bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30"
                            : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        }`}
                      >
                        {selected.status === "active" ? "Pausar" : "Activar"}
                      </button>
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white/60 text-xs font-medium uppercase tracking-wide">Pasos ({selected.steps?.length ?? 0})</h3>
                      <button
                        onClick={() => setShowAddStep(true)}
                        className="text-xs text-[#0084ff] hover:underline"
                      >
                        + Añadir paso
                      </button>
                    </div>
                    {!selected.steps?.length ? (
                      <p className="text-white/30 text-sm py-4 text-center">Sin pasos — añade email, espera o bifurcación</p>
                    ) : (
                      selected.steps.map((step, i) => (
                        <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/3 border border-white/5">
                          <div className="shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/50 text-xs">{i}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <StepTypeBadge type={step.stepType} />
                              {(step.delayDays > 0 || step.delayHours > 0) && (
                                <span className="text-white/30 text-xs">+{step.delayDays}d {step.delayHours}h</span>
                              )}
                            </div>
                            {step.stepType === "email" && (
                              <p className="text-white/70 text-sm truncate">{step.subject || "(sin asunto)"}</p>
                            )}
                            {step.stepType === "branch" && step.branchCondition && (
                              <p className="text-white/50 text-xs">
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
              <div className="lg:col-span-2 flex items-center justify-center text-white/30 text-sm">
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
