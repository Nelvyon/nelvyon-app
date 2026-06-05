"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader, NelvyonDsStatusDot } from "@/design-system/components";
import { SaasEmptyState, SAAS_EMPTY_DESCRIPTION, SAAS_EMPTY_TITLE } from "@/features/saas-shell/components/SaasEmptyState";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type WorkflowStatus = "draft" | "active" | "paused" | "archived";
type TriggerType = "contact_created" | "contact_updated" | "stage_changed" | "job_completed" | "manual" | "scheduled";
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

const TRIGGERS: TriggerType[] = ["contact_created", "contact_updated", "stage_changed", "job_completed", "manual", "scheduled"];

export default function SaasWorkflowsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
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
    const body = (await res.json()) as { workflows: Workflow[] };
    setWorkflows(body.workflows ?? []);
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
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <SaasSidebar activeId="workflows" tenantCompany={tenantCompany || undefined} tenantPlan={tenantPlan} />
        <main className="space-y-6">
          <NelvyonDsSectionHeader title="Workflows" subtitle="Motor automatico trigger -> condicion -> accion" />
          <div className="flex flex-wrap gap-2">
            <NelvyonDsButton onClick={() => setShowEditor(true)}>Nuevo workflow</NelvyonDsButton>
          </div>
          {error ? <NelvyonDsCard className="text-sm text-destructive">{error}</NelvyonDsCard> : null}
          {loading ? (
            <NelvyonDsCard>Cargando workflows...</NelvyonDsCard>
          ) : workflows.length === 0 ? (
            <SaasEmptyState
              title={SAAS_EMPTY_TITLE}
              description={SAAS_EMPTY_DESCRIPTION}
              action={<NelvyonDsButton onClick={() => setShowEditor(true)}>Crear primer workflow</NelvyonDsButton>}
            />
          ) : (
            <div className="grid gap-4">
              {workflows.map((wf) => (
                <NelvyonDsCard key={wf.id} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button className="text-left text-base font-semibold text-foreground hover:text-primary" onClick={() => void openDetail(wf)}>
                      {wf.name}
                    </button>
                    <NelvyonDsBadge>{wf.status}</NelvyonDsBadge>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <div>Trigger: {wf.triggerType}</div>
                    <div>Runs: {wf.runCount}</div>
                    <div>Ultima ejecucion: {wf.lastRunAt ? new Date(wf.lastRunAt).toLocaleString() : "Nunca"}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {wf.status !== "active" ? <NelvyonDsButton onClick={() => void changeStatus(wf, "active")}>Activar</NelvyonDsButton> : null}
                    {wf.status === "active" ? <NelvyonDsButton onClick={() => void changeStatus(wf, "paused")}>Pausar</NelvyonDsButton> : null}
                    <NelvyonDsButton onClick={() => void runWorkflow(wf.id)}>Ejecutar</NelvyonDsButton>
                    <NelvyonDsButton onClick={() => void deleteWorkflow(wf.id)}>Eliminar</NelvyonDsButton>
                  </div>
                </NelvyonDsCard>
              ))}
            </div>
          )}

          {showEditor ? (
            <NelvyonDsCard className="space-y-4">
              <div className="text-base font-semibold text-foreground">Crear workflow (Paso {wizardStep}/5)</div>
              {wizardStep === 1 ? (
                <div className="grid gap-2">
                  <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
                  <textarea className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Descripcion" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              ) : null}
              {wizardStep === 2 ? (
                <div className="grid gap-2">
                  <select className="rounded-md border bg-background px-3 py-2 text-sm" value={triggerType} onChange={(e) => setTriggerType(e.target.value as TriggerType)}>
                    {TRIGGERS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {wizardStep === 3 ? (
                <div className="space-y-2">
                  <NelvyonDsButton
                    onClick={() =>
                      setConditions((prev) => [...prev, { field: "contact.status", operator: "equals", value: "lead" }])
                    }
                  >
                    Agregar condicion ejemplo
                  </NelvyonDsButton>
                  <div className="text-sm text-muted-foreground">{conditions.length} condiciones</div>
                </div>
              ) : null}
              {wizardStep === 4 ? (
                <div className="space-y-2">
                  <NelvyonDsButton
                    onClick={() =>
                      setActions((prev) => [...prev, { type: "notify", config: { message: "Workflow ejecutado" } }])
                    }
                  >
                    Agregar accion ejemplo
                  </NelvyonDsButton>
                  <div className="text-sm text-muted-foreground">{actions.length} acciones</div>
                </div>
              ) : null}
              {wizardStep === 5 ? (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>Nombre: {name || "(sin nombre)"}</div>
                  <div>Trigger: {triggerType}</div>
                  <div>Condiciones: {conditions.length}</div>
                  <div>Acciones: {actions.length}</div>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <NelvyonDsButton onClick={() => setWizardStep((s) => Math.max(1, s - 1))}>Atras</NelvyonDsButton>
                {wizardStep < 5 ? <NelvyonDsButton onClick={() => setWizardStep((s) => Math.min(5, s + 1))}>Siguiente</NelvyonDsButton> : null}
                {wizardStep === 5 ? (
                  <NelvyonDsButton onClick={() => void saveWorkflow()} disabled={saving}>
                    {saving ? "Guardando..." : "Guardar"}
                  </NelvyonDsButton>
                ) : null}
                <NelvyonDsButton
                  onClick={() => {
                    setShowEditor(false);
                    resetWizard();
                  }}
                >
                  Cerrar
                </NelvyonDsButton>
              </div>
            </NelvyonDsCard>
          ) : null}

          {selectedSummary ? (
            <NelvyonDsCard className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-base font-semibold text-foreground">Detalle: {selectedSummary.name}</div>
                <NelvyonDsBadge>{selectedSummary.status}</NelvyonDsBadge>
              </div>
              <div className="text-sm text-muted-foreground">{selectedSummary.description || "Sin descripcion"}</div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Historial de runs</div>
                {runs.length === 0 ? (
                  <SaasEmptyState title={SAAS_EMPTY_TITLE} description="Ejecuta el workflow para ver el historial aquí." className="p-4" />
                ) : (
                  <div className="space-y-2">
                    {runs.map((run) => (
                      <div key={run.id} className="rounded-md border p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <NelvyonDsStatusDot status={run.status === "failed" ? "crit" : "ok"} />
                          <span className="font-medium">{run.status}</span>
                          <span className="text-muted-foreground">{new Date(run.startedAt).toLocaleString()}</span>
                        </div>
                        <div className="text-muted-foreground">Steps: {run.stepsExecuted.length}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </NelvyonDsCard>
          ) : null}
        </main>
      </div>
    </div>
  );
}
