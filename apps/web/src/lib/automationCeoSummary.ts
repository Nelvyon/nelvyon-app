import type { UnifiedAutomationsReporting } from "@/features/automatizacion/types";

export type WorkflowErrorRow = {
  workflow_key: string;
  workflow_name: string;
  workflow_type: "visual" | "rule";
  failed_count: number;
  total_runs: number;
  last_error?: string;
};

export type CeoRecommendation = {
  id: string;
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  href: string;
  cta: string;
};

export type AutomationCeoSummary = {
  enrollments: {
    total: number;
    active: number;
    failed: number;
  };
  workflow_errors: WorkflowErrorRow[];
  recommendations: CeoRecommendation[];
};

const FAILED_STATUSES = new Set(["failed", "error", "cancelled"]);
const ACTIVE_STATUSES = new Set(["pending", "running", "waiting", "queued"]);

function isFailedStatus(status?: string | null): boolean {
  return FAILED_STATUSES.has(String(status ?? "").toLowerCase());
}

function isActiveStatus(status?: string | null): boolean {
  return ACTIVE_STATUSES.has(String(status ?? "").toLowerCase());
}

export function buildAutomationCeoSummary(data: UnifiedAutomationsReporting): AutomationCeoSummary {
  const unified = data.unified;
  const stats = data.stats;
  const executions = data.executions.items ?? [];
  const workflows = data.workflows.items ?? [];
  const rules = data.rules.items ?? [];

  let failedFromExecutions = 0;
  let activeFromExecutions = 0;
  const errorByKey = new Map<string, WorkflowErrorRow>();

  for (const exec of executions) {
    const status = exec.status;
    if (isFailedStatus(status)) failedFromExecutions += 1;
    if (isActiveStatus(status)) activeFromExecutions += 1;

    if (!isFailedStatus(status)) continue;

    const key = `rule:${exec.rule_id}`;
    const name = exec.rule_name?.trim() || `Regla #${exec.rule_id}`;
    const row = errorByKey.get(key) ?? {
      workflow_key: key,
      workflow_name: name,
      workflow_type: "rule" as const,
      failed_count: 0,
      total_runs: 0,
      last_error: undefined,
    };
    row.failed_count += 1;
    row.total_runs += 1;
    if (exec.error_message) row.last_error = exec.error_message;
    errorByKey.set(key, row);
  }

  for (const wf of workflows) {
    const runs = Number(wf.runs_count ?? 0);
    const key = `visual:${wf.id}`;
    if (runs > 0 || wf.is_active) {
      errorByKey.set(key, {
        workflow_key: key,
        workflow_name: wf.name,
        workflow_type: "visual",
        failed_count: errorByKey.get(key)?.failed_count ?? 0,
        total_runs: runs,
        last_error: errorByKey.get(key)?.last_error,
      });
    }
  }

  for (const rule of rules) {
    const key = `rule:${rule.id}`;
    if (!errorByKey.has(key) && (rule.runs_count ?? 0) > 0) {
      errorByKey.set(key, {
        workflow_key: key,
        workflow_name: rule.name,
        workflow_type: "rule",
        failed_count: 0,
        total_runs: Number(rule.runs_count ?? 0),
      });
    }
  }

  const jobsFailed = Number(stats.failed ?? unified.jobs_failed ?? 0);
  const jobsPending = Number(stats.pending ?? 0);
  const totalEnrollments =
    Number(unified.total_runs ?? 0) + jobsFailed + jobsPending;
  const activeEnrollments = activeFromExecutions + jobsPending;
  const failedEnrollments = failedFromExecutions + jobsFailed;

  const workflow_errors = [...errorByKey.values()]
    .filter((r) => r.failed_count > 0 || r.total_runs > 0)
    .sort((a, b) => b.failed_count - a.failed_count || b.total_runs - a.total_runs);

  const recommendations = buildRecommendations({
    activeFlows: unified.active_flows ?? 0,
    totalFlows: unified.total_flows ?? 0,
    failedEnrollments,
    totalEnrollments,
    successRate: unified.success_rate ?? stats.success_rate ?? 0,
    workflowErrorCount: workflow_errors.filter((w) => w.failed_count > 0).length,
  });

  return {
    enrollments: {
      total: totalEnrollments,
      active: activeEnrollments,
      failed: failedEnrollments,
    },
    workflow_errors,
    recommendations,
  };
}

function buildRecommendations(input: {
  activeFlows: number;
  totalFlows: number;
  failedEnrollments: number;
  totalEnrollments: number;
  successRate: number;
  workflowErrorCount: number;
}): CeoRecommendation[] {
  const recs: CeoRecommendation[] = [];

  if (input.activeFlows === 0) {
    recs.push({
      id: "activate-first-flow",
      priority: "high",
      title: "Activa tu primer flujo",
      description:
        "No hay automatizaciones activas. Lanza una receta (onboarding CRM, carrito abandonado o alerta ROAS) en menos de 2 minutos.",
      href: "/automatizacion/recetas",
      cta: "Ver recetas",
    });
  }

  if (input.failedEnrollments > 0) {
    recs.push({
      id: "fix-failures",
      priority: "high",
      title: `Revisa ${input.failedEnrollments} enrollment(s) fallidos`,
      description:
        "Hay ejecuciones con error. Corrige conectores, credenciales o condiciones del trigger antes de escalar tráfico.",
      href: "/automatizacion/flujos",
      cta: "Abrir flujos",
    });
  }

  if (input.workflowErrorCount > 0) {
    recs.push({
      id: "workflow-errors",
      priority: "high",
      title: `${input.workflowErrorCount} workflow(s) con errores`,
      description:
        "Prioriza los flujos con más fallos en la tabla inferior. Un workflow roto frena nurture y follow-up automático.",
      href: "/automatizacion/reglas",
      cta: "Ver reglas CRM",
    });
  }

  if (input.totalEnrollments === 0 && input.totalFlows > 0) {
    recs.push({
      id: "connect-triggers",
      priority: "medium",
      title: "Conecta triggers a tus flujos",
      description:
        "Tienes flujos creados pero sin enrollments. Enlaza formularios, CRM o ecommerce para que entren contactos automáticamente.",
      href: "/automatizacion/flujos",
      cta: "Configurar triggers",
    });
  }

  if (input.successRate > 0 && input.successRate < 85 && input.totalEnrollments > 5) {
    recs.push({
      id: "improve-success-rate",
      priority: "medium",
      title: `Tasa de éxito ${input.successRate.toFixed(0)}% — margen de mejora`,
      description:
        "Revisa jobs fallidos y simplifica pasos del workflow. Objetivo CEO: >90% antes de subir presupuesto Ads.",
      href: "/analytics/automatizacion",
      cta: "Ver analytics",
    });
  }

  if (input.activeFlows > 0 && input.failedEnrollments === 0 && input.successRate >= 85) {
    recs.push({
      id: "scale-automation",
      priority: "low",
      title: "Automatización sana — escala el siguiente canal",
      description:
        "Añade nurture email post-lead o recuperación de carrito si aún no están activos. Conecta con tu Growth Pack.",
      href: "/os/packs/local-growth",
      cta: "Local Growth Pack",
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: "explore-recipes",
      priority: "low",
      title: "Explora recetas élite",
      description: "Empieza con una plantilla probada para tu sector y mide enrollments la primera semana.",
      href: "/automatizacion/recetas",
      cta: "Explorar recetas",
    });
  }

  return recs.slice(0, 4);
}
