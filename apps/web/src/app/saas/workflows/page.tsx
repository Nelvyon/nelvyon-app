"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NelvyonDsBadge, NelvyonDsStatusDot } from "@/design-system/components";
import { SaasEmptyState, SAAS_EMPTY_DESCRIPTION, SAAS_EMPTY_TITLE } from "@/features/saas-shell/components/SaasEmptyState";
import { SaasCan } from "@/features/saas-shell/components/SaasCan";
import { SaasPermissionDenied } from "@/features/saas-shell/components/SaasPermissionDenied";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { SaasShellLayout, DarkCard } from "@/features/saas-shell/components/SaasShellLayout";
import { useSaasPermissions } from "@/features/saas-shell/useSaasPermissions";

type WorkflowStatus = "draft" | "active" | "paused" | "archived";
type TriggerType = "contact_created" | "contact_updated" | "stage_changed" | "deal_stage_changed" | "job_completed" | "manual" | "scheduled";
type WorkflowCondition = { field: string; operator: string; value: string | number };
type WorkflowAction = { type: string; config: Record<string, unknown> };
type Workflow = {
  id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  triggerType: TriggerType;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  runCount: number;
  lastRunAt: string | null;
};
type WorkflowRun = { id: string; status: "running" | "completed" | "failed"; stepsExecuted: Array<Record<string, unknown>>; startedAt: string; error: string | null };

const TRIGGERS: TriggerType[] = ["contact_created", "contact_updated", "stage_changed", "deal_stage_changed", "job_completed", "manual", "scheduled"];

const TRIGGER_LABELS: Record<TriggerType, string> = {
  contact_created: "Contacto creado",
  contact_updated: "Contacto actualizado",
  stage_changed: "Cambio etapa contacto",
  deal_stage_changed: "Cambio etapa oportunidad",
  job_completed: "Job completado",
  manual: "Manual",
  scheduled: "Programado",
};

export default function SaasWorkflowsPage() {
  const router = useRouter();
  const { can, isViewer } = useSaasPermissions();
  const canWrite = can("workflows.write");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [sesConfigured, setSesConfigured] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<Workflow | null>(null);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>("manual");
  const [conditions, setConditions] = useState<WorkflowCondition[]>([]);
  const [actions, setActions] = useState<WorkflowAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tenantPlan, setTenantPlan] = useState<"starter" | "pro" | "enterprise">("starter");
  const [tenantCompany, setTenantCompany] = useState("");

  async function loadTenant() {
    const res = await fetch("/api/saas/dashboard", { credentials: "same-origin" });
    if (res.status === 401) {
      router.replace(`/auth/login?next=${encodeURIComponent("/saas/workflows")}`);
      return;
    }
    if (!res.ok) return;
    const body = (await res.json()) as { tenant: { companyName: string; plan: "starter" | "pro" | "enterprise"; onboardingCompleted: boolean } };
    if (!body?.tenant?.onboardingCompleted) {
      router.replace("/saas/onboarding");
      return;
    }
    setTenantCompany(body.tenant.companyName);
    setTenantPlan(body.tenant.plan);
  }

  async function loadWorkflows() {
    const res = await fetch("/api/saas/workflows", { credentials: "same-origin" });
    if (res.status === 401) {
      router.replace(`/auth/login?next=${encodeURIComponent("/saas/workflows")}`);
      return;
    }
    if (!res.ok) throw new Error("No se pudieron cargar workflows");
    const body = (await res.json()) as { workflows: Workflow[]; ses_configured?: boolean };
    setWorkflows(body.workflows ?? []);
    setSesConfigured(body.ses_configured ?? false);
  }

  async function refreshAll() {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadTenant(), loadWorkflows()]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar workflows");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openDetail(wf: Workflow) {
    setSelected(wf);
    const res = await fetch(`/api/saas/workflows/${wf.id}/runs`, { credentials: "same-origin" });
    if (!res.ok) return;
    const body = (await res.json()) as { runs: WorkflowRun[] };
    setRuns(body.runs ?? []);
  }

  function resetWizard() {
    setWizardStep(1);
    setName("");
    setDescription("");
    setTriggerType("manual");
    setConditions([]);
    setActions([]);
  }

  async function saveWorkflow() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/saas/workflows", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, triggerType, conditions, actions }),
      });
      if (!res.ok) throw new Error("No se pudo crear workflow");
      setShowEditor(false);
      resetWizard();
      await loadWorkflows();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(wf: Workflow, status: "active" | "paused") {
    const endpoint = status === "active" ? "activate" : "pause";
    const res = await fetch(`/api/saas/workflows/${wf.id}/${endpoint}`, { method: "POST", credentials: "same-origin" });
    if (res.ok) await loadWorkflows();
  }

  async function deleteWorkflow(id: string) {
    const res = await fetch(`/api/saas/workflows/${id}`, { method: "DELETE", credentials: "same-origin" });
    if (res.ok) {
      if (selected?.id === id) {
        setSelected(null);
        setRuns([]);
      }
      await loadWorkflows();
    }
  }

  async function runWorkflow(id: string) {
    const res = await fetch(`/api/saas/workflows/${id}/execute`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ triggerData: { source: "manual" } }),
    });
    if (res.ok) {
      await loadWorkflows();
      if (selected?.id === id) await openDetail(selected);
    }
  }

  const selectedSummary = useMemo(() => {
    if (!selected) return null;
    return workflows.find((w) => w.id === selected.id) ?? selected;
  }, [selected, workflows]);

  return (
    <SaasShellLayout
      sidebar={<SaasSidebar activeId="workflows" tenantCompany={tenantCompany || undefined} tenantPlan={tenantPlan} />}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#0084ff]/70">Automatización</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Workflows</h1>
        <p className="mt-0.5 text-sm text-white/40">Motor automático trigger → condición → acción</p>
      </div>

      {isViewer ? (
        <SaasPermissionDenied message="Tu rol es solo lectura. Puedes ver workflows, pero no crearlos ni ejecutarlos." />
      ) : null}

      {sesConfigured === false ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <strong>Email no configurado:</strong> las acciones de tipo "Enviar email" fallarán hasta que definas <code className="text-amber-200">SES_FROM_EMAIL</code> y <code className="text-amber-200">SES_ACCESS_KEY_ID</code> en Railway.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <SaasCan action="workflows.write">
          <button onClick={() => setShowEditor(true)} className="rounded-lg bg-gradient-to-r from-[#0084ff] to-[#0047ab] px-4 py-2 text-sm font-medium text-white shadow-[0_0_12px_rgba(0,132,255,0.3)] hover:shadow-[0_0_20px_rgba(0,132,255,0.4)] transition-all">
            + Nuevo workflow
          </button>
        </SaasCan>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">{error}</div>
      ) : null}

      {loading ? (
        <DarkCard><p className="text-sm text-white/40">Cargando workflows…</p></DarkCard>
      ) : workflows.length === 0 ? (
        <SaasEmptyState
          title={SAAS_EMPTY_TITLE}
          description={SAAS_EMPTY_DESCRIPTION}
          action={
            canWrite ? (
              <button onClick={() => setShowEditor(true)} className="rounded-lg bg-gradient-to-r from-[#0084ff] to-[#0047ab] px-4 py-2 text-sm font-medium text-white shadow-[0_0_12px_rgba(0,132,255,0.3)]">
                Crear primer workflow
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3">
          {workflows.map((wf) => (
            <DarkCard key={wf.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button className="text-left text-base font-semibold text-white hover:text-[#0084ff] transition-colors" onClick={() => void openDetail(wf)}>
                  {wf.name}
                </button>
                <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${wf.status === "active" ? "bg-emerald-500/15 text-emerald-400" : wf.status === "paused" ? "bg-amber-500/15 text-amber-400" : "bg-white/[0.06] text-white/40"}`}>
                  {wf.status}
                </span>
              </div>
              <div className="grid gap-1 text-sm text-white/40 sm:grid-cols-3">
                <div>Trigger: <span className="text-white/60">{wf.triggerType}</span></div>
                <div>Runs: <span className="text-white/60">{wf.runCount}</span></div>
                <div>Última: <span className="text-white/60">{wf.lastRunAt ? new Date(wf.lastRunAt).toLocaleString("es-ES") : "Nunca"}</span></div>
              </div>
              <div className="flex flex-wrap gap-2">
                <SaasCan action="workflows.write">
                  {wf.status !== "active" ? (
                    <button onClick={() => void changeStatus(wf, "active")} className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400 hover:bg-emerald-500/20 transition-all">Activar</button>
                  ) : null}
                  {wf.status === "active" ? (
                    <button onClick={() => void changeStatus(wf, "paused")} className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-400 hover:bg-amber-500/20 transition-all">Pausar</button>
                  ) : null}
                </SaasCan>
                <SaasCan action="workflows.execute">
                  <button onClick={() => void runWorkflow(wf.id)} className="rounded-md border border-[#0084ff]/20 bg-[#0084ff]/10 px-3 py-1 text-xs text-[#0084ff] hover:bg-[#0084ff]/20 transition-all">Ejecutar</button>
                </SaasCan>
                <SaasCan action="workflows.delete">
                  <button onClick={() => void deleteWorkflow(wf.id)} className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10 transition-all">Eliminar</button>
                </SaasCan>
              </div>
            </DarkCard>
          ))}
        </div>
      )}

      {showEditor && canWrite ? (
        <DarkCard glow className="space-y-4">
          <p className="text-base font-semibold text-white">Crear workflow (Paso {wizardStep}/5)</p>
          {wizardStep === 1 ? (
            <div className="grid gap-2">
              <input className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#0084ff]/40 focus:outline-none" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
              <textarea className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#0084ff]/40 focus:outline-none" placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          ) : null}
          {wizardStep === 2 ? (
            <select className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-[#0084ff]/40 focus:outline-none" value={triggerType} onChange={(e) => setTriggerType(e.target.value as TriggerType)}>
              {TRIGGERS.map((t) => <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>)}
            </select>
          ) : null}
          {wizardStep === 3 ? (
            <div className="space-y-2">
              <button onClick={() => setConditions((prev) => [...prev, { field: "contact.status", operator: "equals", value: "lead" }])} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/60 hover:text-white transition-all">
                + Agregar condición ejemplo
              </button>
              <p className="text-sm text-white/40">{conditions.length} condiciones</p>
            </div>
          ) : null}
          {wizardStep === 4 ? (
            <div className="space-y-2">
              <button onClick={() => setActions((prev) => [...prev, { type: "notify", config: { message: "Workflow ejecutado" } }])} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/60 hover:text-white transition-all">
                + Agregar acción ejemplo
              </button>
              <p className="text-sm text-white/40">{actions.length} acciones</p>
            </div>
          ) : null}
          {wizardStep === 5 ? (
            <div className="space-y-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-sm text-white/50">
              <div>Nombre: <span className="text-white/80">{name || "(sin nombre)"}</span></div>
              <div>Trigger: <span className="text-white/80">{triggerType}</span></div>
              <div>Condiciones: <span className="text-white/80">{conditions.length}</span></div>
              <div>Acciones: <span className="text-white/80">{actions.length}</span></div>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setWizardStep((s) => Math.max(1, s - 1))} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/60 hover:text-white transition-all">Atrás</button>
            {wizardStep < 5 ? <button onClick={() => setWizardStep((s) => Math.min(5, s + 1))} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/60 hover:text-white transition-all">Siguiente</button> : null}
            {wizardStep === 5 ? (
              <button onClick={() => void saveWorkflow()} disabled={saving} className="rounded-lg bg-gradient-to-r from-[#0084ff] to-[#0047ab] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 shadow-[0_0_12px_rgba(0,132,255,0.3)]">
                {saving ? "Guardando…" : "Guardar"}
              </button>
            ) : null}
            <button onClick={() => { setShowEditor(false); resetWizard(); }} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/60 hover:text-white transition-all">Cerrar</button>
          </div>
        </DarkCard>
      ) : null}

      {selectedSummary ? (
        <DarkCard className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-base font-semibold text-white">Detalle: {selectedSummary.name}</p>
            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${selectedSummary.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-white/[0.06] text-white/40"}`}>{selectedSummary.status}</span>
          </div>
          <p className="text-sm text-white/40">{selectedSummary.description ?? "Sin descripción"}</p>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Historial de runs</p>
            {runs.length === 0 ? (
              <SaasEmptyState title={SAAS_EMPTY_TITLE} description="Ejecuta el workflow para ver el historial aquí." className="p-4" />
            ) : (
              <div className="space-y-2">
                {runs.map((run) => (
                  <div key={run.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <NelvyonDsStatusDot status={run.status === "failed" ? "crit" : "ok"} />
                      <span className="font-medium text-white/80">{run.status}</span>
                      <span className="text-white/35">{new Date(run.startedAt).toLocaleString("es-ES")}</span>
                    </div>
                    <p className="mt-1 text-white/35">Steps: {run.stepsExecuted.length}</p>
                    {run.error ? <p className="mt-1 text-xs text-red-400">{run.error}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DarkCard>
      ) : null}
    </SaasShellLayout>
  );
}
