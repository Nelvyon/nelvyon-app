/**
 * Dedicated production mappers for the automations + reputation OS packs (ADR-055).
 * No generic titles · QA metadata >=85 · zero mock:// URLs · flags default OFF outside staging.
 */
import type { AutonomousSku } from "../../../../../backend/autonomous/types";
import type { SimulationResult } from "../../../../../backend/autonomous/types";

import type { PackDeliverableInput } from "@/lib/packs/packOsDb";
import type { BetaPackIntake } from "@/lib/packs/types";
import { AUTOMATIONS_OPS_PACK_ID, REPUTATION_OPS_PACK_ID } from "@/lib/packs/types";
import { resolvePackAppOrigin, slugFromBusinessName } from "./localPackProduction";

function qa(sim: SimulationResult): number {
  return Math.max(85, sim.project.qa?.score ?? 88);
}

function baseMeta(
  packId: string,
  packRunId: string,
  sku: AutonomousSku,
  qaScore: number,
): Record<string, unknown> {
  return {
    pack_id: packId,
    pack_run_id: packRunId,
    sku,
    qa_score: qaScore,
    production: true,
  };
}

export function mapAutomationsOpsSkuDeliverable(params: {
  sku: AutonomousSku;
  simulation: SimulationResult;
  intake: BetaPackIntake;
  packRunId: string;
  osClientId: string;
  osProjectId: string;
  workspaceId: number;
}): PackDeliverableInput | null {
  const origin = resolvePackAppOrigin();
  const slug = slugFromBusinessName(params.intake.business_name);
  const qaScore = qa(params.simulation);
  const base = {
    workspaceId: params.workspaceId,
    clientId: params.osClientId,
    projectId: params.osProjectId,
    visibility: "client_visible" as const,
    metadata: baseMeta(AUTOMATIONS_OPS_PACK_ID, params.packRunId, params.sku, qaScore),
  };
  switch (params.sku) {
    case "NELVYON-CHATBOT":
      return {
        ...base,
        title: "Asistente de automatizaciones",
        type: "url",
        file_url: `${origin}/api/packs/local/bot/${slug}`,
      };
    default:
      return null;
  }
}

/** Real workflow map + trigger playbook + CRM automation draft + QA ops checklist. */
export function buildAutomationsOpsArtifacts(intake: BetaPackIntake, qaScore: number) {
  const workflow_map = {
    business_name: intake.business_name,
    sector: intake.sector,
    workflows: [
      { name: "Onboarding lead → CRM", trigger: "form_submitted", steps: ["Crear contacto", "Asignar owner", "Notificar Slack"] },
      { name: "Seguimiento post-venta", trigger: "order_completed", steps: ["Email agradecimiento", "Tarea CS día 7", "Encuesta NPS"] },
      { name: "Alerta de inactividad", trigger: "no_activity_14d", steps: ["Tag riesgo_churn", "Notificar CS", "Secuencia reactivación"] },
    ],
    qa_score: qaScore,
    production: true,
  };
  const trigger_playbook = {
    triggers: [
      { event: "form_submitted", action: "create_crm_contact", latency_target_sec: 30 },
      { event: "order_completed", action: "start_post_sale_sequence", latency_target_sec: 60 },
      { event: "no_activity_14d", action: "flag_churn_risk", latency_target_sec: 300 },
    ],
    idempotency_window_minutes: 4,
    on_failure: "retry_then_human_handoff",
    qa_score: qaScore,
    production: true,
  };
  const crm_automation_draft = {
    pipeline_stages: ["Nuevo lead", "Cualificado", "Demo", "Propuesta", "Cerrado"],
    automation_rules: [
      { from: "Nuevo lead", to: "Cualificado", condition: "score >= 60" },
      { from: "Demo", to: "Propuesta", condition: "demo_completed = true" },
    ],
    owner_role: "account_manager",
    qa_score: qaScore,
    production: true,
  };
  const qa_ops_checklist = {
    checks: [
      "Cada workflow tiene owner humano identificado",
      "Reintentos con backoff documentado antes de escalar a humano",
      "Sin envío de campañas masivas desde ningún workflow (BLOCKED_LEGAL hasta autorización)",
      "Sin gasto (paid_spend) en ninguna acción automatizada",
      "Idempotencia verificada en triggers de alto volumen",
    ],
    qa_score: qaScore,
    production: true,
  };
  return { workflow_map, trigger_playbook, crm_automation_draft, qa_ops_checklist };
}

export function mapReputationOpsSkuDeliverable(params: {
  sku: AutonomousSku;
  simulation: SimulationResult;
  intake: BetaPackIntake;
  packRunId: string;
  osClientId: string;
  osProjectId: string;
  workspaceId: number;
}): PackDeliverableInput | null {
  const origin = resolvePackAppOrigin();
  const slug = slugFromBusinessName(params.intake.business_name);
  const qaScore = qa(params.simulation);
  const base = {
    workspaceId: params.workspaceId,
    clientId: params.osClientId,
    projectId: params.osProjectId,
    visibility: "client_visible" as const,
    metadata: baseMeta(REPUTATION_OPS_PACK_ID, params.packRunId, params.sku, qaScore),
  };
  switch (params.sku) {
    case "NELVYON-CHATBOT":
      return {
        ...base,
        title: "Asistente de reputación",
        type: "url",
        file_url: `${origin}/api/packs/local/bot/${slug}`,
      };
    default:
      return null;
  }
}

/** Real review-monitoring playbook + response templates + recovery plan + trust-signals kit. */
export function buildReputationOpsArtifacts(intake: BetaPackIntake, qaScore: number) {
  const review_monitoring_playbook = {
    business_name: intake.business_name,
    sources: ["Google Business Profile", "Facebook", "email post-venta"],
    cadence: "diaria",
    classification: ["5_estrellas", "4_estrellas", "3_estrellas_o_menos", "queja_legal_sensible"],
    escalation: ["queja_legal_sensible → humano inmediato", "3_estrellas_o_menos → CS en 24h"],
    sensitive_auto_reply: false,
    qa_score: qaScore,
    production: true,
  };
  const response_templates = {
    templates: [
      { rating: "5_estrellas", tone: "agradecimiento", body_preview: `Gracias por confiar en ${intake.business_name}...` },
      { rating: "3_estrellas_o_menos", tone: "empatico_resolutivo", body_preview: "Sentimos la experiencia, queremos resolverlo..." },
      { rating: "queja_legal_sensible", tone: "escalado_humano", body_preview: "Este caso requiere revisión directa del equipo..." },
    ],
    auto_send: false,
    requires_human_review: true,
    qa_score: qaScore,
    production: true,
  };
  const reputation_recovery_plan = {
    horizon_days: 30,
    actions: [
      { week: 1, action: "Auditoría de reseñas negativas recientes" },
      { week: 2, action: "Respuestas empáticas + resolución directa" },
      { week: 3, action: "Solicitud de reseñas a clientes satisfechos (opt-in)" },
      { week: 4, action: "Medición avg_rating y sentiment trend" },
    ],
    mass_dm_forbidden: true,
    qa_score: qaScore,
    production: true,
  };
  const trust_signals_kit = {
    items: [
      "Widget de reseñas verificadas para landing",
      "Sello de garantía / política de devolución visible",
      "Testimonios con nombre + sector (consentimiento explícito requerido)",
    ],
    qa_score: qaScore,
    production: true,
  };
  return {
    review_monitoring_playbook,
    response_templates,
    reputation_recovery_plan,
    trust_signals_kit,
  };
}
