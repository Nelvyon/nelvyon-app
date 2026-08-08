/**
 * Automation flow designs — contracts only (no MCP-dependent runtime).
 */

export type AutomationFlowState = "draft" | "active" | "paused" | "archived";

export type AutomationTrigger =
  | { kind: "cron"; expression: string }
  | { kind: "event"; eventName: string }
  | { kind: "webhook"; path: string }
  | { kind: "manual" };

export type AutomationStep =
  | { type: "agent.run"; agentId: string }
  | { type: "tool.mcp"; toolName: string; requiresMcp: true }
  | { type: "memory.write"; key: string }
  | { type: "notify"; channel: "email_draft" | "ntfy" | "inbox" }
  | { type: "approval.gate"; action: string }
  | { type: "report.emit"; reportId: string };

export type AutomationFlowDesign = {
  id: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  steps: AutomationStep[];
  validations: string[];
  dependsOnMcp: boolean;
  featureFlag: string;
};

export const AUTOMATION_FLOW_DESIGNS: AutomationFlowDesign[] = [
  {
    id: "daily_ceo_brief",
    name: "Brief CEO diario",
    description: "Resumen KPIs + riesgos → memoria tenant + draft email",
    trigger: { kind: "cron", expression: "0 8 * * *" },
    steps: [
      { type: "agent.run", agentId: "analytics" },
      { type: "agent.run", agentId: "ceo_supervisor" },
      { type: "memory.write", key: "daily_brief" },
      { type: "notify", channel: "email_draft" },
    ],
    validations: ["tenant_required", "no_send_without_approval"],
    dependsOnMcp: false,
    featureFlag: "NELVYON_AUTOMATION_CEO_BRIEF",
  },
  {
    id: "seo_weekly_audit",
    name: "Auditoría SEO semanal",
    description: "SEO agent + report emit",
    trigger: { kind: "cron", expression: "0 9 * * 1" },
    steps: [
      { type: "agent.run", agentId: "seo" },
      { type: "report.emit", reportId: "seo_weekly" },
      { type: "memory.write", key: "seo_weekly" },
    ],
    validations: ["read_only_tools"],
    dependsOnMcp: false,
    featureFlag: "NELVYON_AUTOMATION_SEO_WEEKLY",
  },
  {
    id: "crm_stale_deals",
    name: "Deals estancados",
    description: "CRM detecta deals sin actividad → sales follow-up draft",
    trigger: { kind: "cron", expression: "0 10 * * *" },
    steps: [
      { type: "agent.run", agentId: "crm" },
      { type: "agent.run", agentId: "sales" },
      { type: "approval.gate", action: "send_client_message" },
    ],
    validations: ["approval_before_message"],
    dependsOnMcp: false,
    featureFlag: "NELVYON_AUTOMATION_CRM_STALE",
  },
  {
    id: "support_sla_watch",
    name: "SLA soporte",
    description: "Inbox SLA breach → support draft + notify",
    trigger: { kind: "event", eventName: "inbox.sla_breach" },
    steps: [
      { type: "agent.run", agentId: "support" },
      { type: "notify", channel: "inbox" },
    ],
    validations: ["no_auto_send"],
    dependsOnMcp: false,
    featureFlag: "NELVYON_AUTOMATION_SUPPORT_SLA",
  },
  {
    id: "mcp_tool_health_pulse",
    name: "Pulse salud MCP",
    description: "Tras MCP cert — health tool via MCP",
    trigger: { kind: "cron", expression: "*/15 * * * *" },
    steps: [{ type: "tool.mcp", toolName: "health_check", requiresMcp: true }],
    validations: ["mcp_certified_required"],
    dependsOnMcp: true,
    featureFlag: "NELVYON_AUTOMATION_MCP_PULSE",
  },
  {
    id: "security_audit_digest",
    name: "Digest seguridad",
    description: "Security agent resume audit diario",
    trigger: { kind: "cron", expression: "0 18 * * *" },
    steps: [
      { type: "agent.run", agentId: "security" },
      { type: "memory.write", key: "security_digest" },
      { type: "report.emit", reportId: "security_daily" },
    ],
    validations: ["no_secret_in_report"],
    dependsOnMcp: false,
    featureFlag: "NELVYON_AUTOMATION_SECURITY_DIGEST",
  },
];

export function listAutomationFlowsIndependentOfMcp(): AutomationFlowDesign[] {
  return AUTOMATION_FLOW_DESIGNS.filter((f) => !f.dependsOnMcp);
}
