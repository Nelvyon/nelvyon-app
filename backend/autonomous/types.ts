/** NELVYON Autonomous — types (Phase B simulation, offline only) */

export type AutonomousSku = "NELVYON-LANDING" | "NELVYON-CHATBOT" | "NELVYON-SEO";
export type AutonomousTier = "starter" | "professional" | "premium";
export type ProjectStatus =
  | "INTAKE_VALIDATING"
  | "PLANNING"
  | "PRODUCING"
  | "QA_SCORING"
  | "QA_BLOCKED"
  | "RETRYING"
  | "PACKAGING"
  | "OS_PUBLISH_READY"
  | "DELIVERED"
  | "ESCALATE_OPERATOR";

export interface OsRefs {
  client_id: string;
  project_slug: string;
  workspace_id: string;
}

export interface AgentLogEntry {
  agent: string;
  started_at: string;
  ended_at: string;
  input_artifact_versions: Record<string, number>;
  output_artifact: string;
  output_version: number;
  model: string;
  tokens: number;
  llm_mode?: "mock" | "real";
  status: "success" | "failed";
}

export interface QaCheckResult {
  id: string;
  passed: boolean;
  points: number;
  max_points: number;
  blocking: boolean;
  message?: string;
}

export interface QaResult {
  score: number;
  passed: boolean;
  threshold: number;
  sku: AutonomousSku;
  dimensions: Record<string, number>;
  blocking_failures: Array<{ code: string; message: string; agent: string }>;
  warnings: string[];
  failed_agents: string[];
  retry_recommendation: {
    target_agent: string;
    reason: string;
    attempt: number;
  } | null;
  evaluated_at: string;
  artifact_versions: Record<string, number>;
  checks: QaCheckResult[];
  offline_dimensions?: {
    structure: number;
    completeness: number;
    consistency: number;
    copy_quality: number;
    seo_basic: number;
    brief_compliance: number;
  };
}

export interface RetryDirective {
  project_id: string;
  attempt: number;
  max_attempts: number;
  target_agent: string;
  failed_checks: string[];
  instructions: string;
  preserve_artifacts: string[];
  regenerate_artifacts: string[];
}

export interface OsDeliverableDraft {
  type: "url" | "file" | "json";
  label: string;
  value: string;
  visibility: "client" | "internal";
}

export interface OsPublishPayload {
  dry_run: true;
  project_id: string;
  os_refs: OsRefs;
  deliverables: OsDeliverableDraft[];
  qa_score: number;
  autonomous_job_id: string;
  handoff_email_draft: { subject: string; body_markdown: string };
  os_actions: Array<{
    entity: string;
    action: string;
    status?: string;
    task_key?: string;
  }>;
  note: string;
}

export interface AutonomousProject {
  project_id: string;
  sku: AutonomousSku;
  tier: AutonomousTier;
  status: ProjectStatus;
  retry_count: number;
  max_retries: number;
  os_refs: OsRefs;
  brief: Record<string, unknown>;
  artifacts: Record<string, unknown>;
  qa: QaResult | null;
  agent_log: AgentLogEntry[];
  simulation_mode: "phase-b-offline" | "phase-c-llm-qa";
  llm_mode?: "mock" | "real";
  retry_history?: RetryHistoryEntry[];
}

export interface RetryHistoryEntry {
  attempt: number;
  score: number;
  passed: boolean;
  failed_agents: string[];
  target_agent: string | null;
  reason: string | null;
  at: string;
}

export interface SimulationResult {
  project: AutonomousProject;
  os_publish: OsPublishPayload | null;
  escalated: boolean;
}

export interface PhaseCOutputBundle {
  artifacts: Record<string, unknown>;
  qaResult: QaResult;
  retryHistory: RetryHistoryEntry[];
  osPublishPayload: OsPublishPayload | null;
  llm_mode: "mock" | "real";
  phase: "C";
}

export interface PhaseCResult extends SimulationResult {
  output_bundle: PhaseCOutputBundle;
  llm_mode: "mock" | "real";
}
