import type { RouterTaskInput, RiskLevel, TaskType } from "./types";

function norm(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const CRITICAL_PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /\bborr(a|ra)r\s+(todos|datos|base|tenant|cliente)/i, reason: "destructive_delete" },
  { re: /\belimina(r)?\s+(todos|datos|registros|tenant)/i, reason: "destructive_delete" },
  { re: /\bdrop\s+(table|database|schema)/i, reason: "destructive_sql" },
  { re: /\bcambia(r)?\s+(credencial|password|jwt|secret|api key)/i, reason: "credential_change" },
  { re: /\benvia(r)?\s+campana\s+(real|masiva|produccion)/i, reason: "live_campaign_send" },
  { re: /\bcobra(r)?|cargo\s+real|stripe\s+charge|pago\s+real/i, reason: "financial_action" },
  { re: /\bejecuta(r)?\s+codigo\s+(destruct|rm\s+-rf|format)/i, reason: "destructive_code" },
  { re: /\baccede(r)?\s+a\s+otro\s+tenant/i, reason: "cross_tenant_access" },
  { re: /\bexporta(r)?\s+tenant\s+[a-z0-9-]+/i, reason: "cross_tenant_export" },
  { re: /\bpublica(r)?\s+(en\s+)?produccion/i, reason: "production_publish" },
  { re: /\bactua(r)?\s+en\s+nombre\s+del\s+propietario/i, reason: "owner_impersonation" },
  { re: /\bdeploy\s+a\s+produccion/i, reason: "production_deploy" },
];

const HIGH_PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /\bmodifica(r)?\s+(billing|plan|stripe|precio)/i, reason: "billing_modify" },
  { re: /\benvia(r)?\s+email\s+(masivo|real)/i, reason: "bulk_email" },
  { re: /\bpublica(r)?\s+contenido/i, reason: "content_publish" },
  { re: /\bejecuta(r)?\s+workflow\s+(real|prod)/i, reason: "workflow_execute" },
];

const MEDIUM_PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /\bconfigura(r)?\s+(integracion|oauth|twilio)/i, reason: "integration_config" },
  { re: /\bactualiza(r)?\s+base\s+de\s+datos/i, reason: "db_update" },
];

export type RiskAssessment = {
  level: RiskLevel;
  requiresApproval: boolean;
  blocked: boolean;
  reasons: string[];
};

export function assessRisk(input: RouterTaskInput, taskType: TaskType): RiskAssessment {
  if (taskType === "destructive" || taskType === "human_approval_required") {
    return {
      level: "critical",
      requiresApproval: !input.hints?.ownerApproved,
      blocked: !input.hints?.ownerApproved,
      reasons: [taskType],
    };
  }

  const q = input.query;
  const n = norm(q);
  const reasons: string[] = [];

  for (const { re, reason } of CRITICAL_PATTERNS) {
    if (re.test(q) || re.test(n)) reasons.push(reason);
  }
  if (reasons.length > 0) {
    const approved = Boolean(input.hints?.ownerApproved);
    return { level: "critical", requiresApproval: true, blocked: !approved, reasons };
  }

  for (const { re, reason } of HIGH_PATTERNS) {
    if (re.test(q)) reasons.push(reason);
  }
  if (reasons.length > 0) {
    return {
      level: "high",
      requiresApproval: true,
      blocked: !input.hints?.ownerApproved,
      reasons,
    };
  }

  for (const { re, reason } of MEDIUM_PATTERNS) {
    if (re.test(q)) reasons.push(reason);
  }
  if (reasons.length > 0) {
    return { level: "medium", requiresApproval: false, blocked: false, reasons };
  }

  if (taskType === "security_sensitive") {
    return { level: "medium", requiresApproval: false, blocked: false, reasons: ["security_sensitive"] };
  }

  return { level: "low", requiresApproval: false, blocked: false, reasons: [] };
}
