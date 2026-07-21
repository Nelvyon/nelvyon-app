/**
 * Nelvyon Private AI — public types.
 * Decoupled from any specific model vendor or runtime.
 */

export type AiMode =
  | "unconfigured"
  | "stub"
  | "mock" // @deprecated alias of stub
  | "local"
  | "openai"
  | "anthropic"
  | "auto";

export type LlmMessageRole = "system" | "user" | "assistant";

export type LlmMessage = {
  role: LlmMessageRole;
  content: string;
};

export type LlmCompletionRequest = {
  messages: LlmMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** Required for certified LocalModelRouter provider (tenant-scoped inference). */
  routerContext?: RouterCompletionContext;
};

/** Context passed to LocalModelRouter when using provider `local_router`. */
export type RouterCompletionContext = {
  tenantId: string;
  clientId?: string | null;
  agentId?: string;
  domain?: string;
  hints?: {
    taskType?: string;
    requireJson?: boolean;
    requirePlan?: boolean;
    requireCitations?: boolean;
    structuredOutput?: boolean;
    ownerApproved?: boolean;
  };
};

export type LlmCompletionResult = {
  text: string;
  provider: string;
  model: string;
  /** True when StubProvider was used — never hide in API responses. */
  mock: boolean;
  /** False when no real model is connected (unconfigured state). */
  configured: boolean;
  /** True when a real LLM provider answered (local or remote). */
  ready: boolean;
};

export type ProviderStatus = {
  id: string;
  label: string;
  kind: "local" | "remote" | "internal";
  configured: boolean;
  available: boolean;
  reason?: string;
};

export interface ILlmProvider {
  readonly id: string;
  readonly kind: "local" | "remote" | "internal";
  describe(): { label: string };
  isConfigured(): boolean;
  isAvailable(): Promise<boolean>;
  complete(request: LlmCompletionRequest): Promise<LlmCompletionResult>;
}

export type PrivateAiSettings = {
  tenantId: string;
  aiMode: AiMode;
  privateAiOnly: boolean;
  ollamaBaseUrl: string | null;
  ollamaModel: string | null;
  openaiModel: string | null;
  anthropicModel: string | null;
  defaultAgentId: string | null;
};

export type PrivateAiPlatformStatus = {
  enabled: boolean;
  privateAiOnly: boolean;
  privateMode?: {
    privateMode: boolean;
    internetTaskAuthorized: boolean;
    internetUntil: string | null;
  };
  mode: AiMode;
  ready: boolean;
  configured: boolean;
  providers: ProviderStatus[];
  openClawBridge: "disabled" | "available" | "connected";
  ragIngest: "not_started" | "ready";
  /** Phase 2 Shared Memory runtime flag */
  sharedMemoryEnabled?: boolean;
  sharedMemoryContractVersion?: string;
  message: string;
};

export type AgentToolId =
  | "memory.read"
  | "memory.write"
  | "crm.read"
  | "crm.write"
  | "inbox.suggest"
  | "inbox.send"
  | "campaigns.draft"
  | "campaigns.send"
  | "workflows.read"
  | "workflows.execute"
  | "packs.kickoff"
  | "reports.read"
  | "billing.read"
  | "billing.write"
  | "integrations.read"
  | "integrations.write"
  | "audit.read"
  | "rag.search";

export type SensitiveActionType =
  | "delete_data"
  | "send_mass_campaign"
  | "touch_production"
  | "modify_billing"
  | "send_client_message"
  | "change_critical_integration"
  | "destructive_code"
  | "modify_permissions"
  | "cross_tenant_access";

export type NelvyonPrivateAgentDef = {
  id: string;
  name: string;
  role: string;
  objective: string;
  allowedTools: AgentToolId[];
  limits: {
    maxTokens: number;
    maxRunsPerHour: number;
    canAutoExecute: boolean;
  };
  forbiddenActions: SensitiveActionType[];
  approvalRequiredActions: SensitiveActionType[];
  systemPrompt: string;
};

export type AgentPermissionCheck = {
  allowed: boolean;
  reason?: string;
};

export type AgentRunInput = {
  tenantId: string;
  userId?: string;
  agentId: string;
  input: string;
  action?: string;
  toolId?: AgentToolId;
};

export type AgentRunResult = {
  agentId: string;
  output: string;
  provider: string;
  model: string;
  mock: boolean;
  configured: boolean;
  ready: boolean;
  auditId?: string;
  approvalRequired?: boolean;
  approvalId?: string;
};

export type RagChunk = {
  id: string;
  source: string;
  title: string;
  content: string;
  tags: string[];
};

export type RagSearchResult = {
  chunks: RagChunk[];
  query: string;
  source: "platform" | "tenant";
};

export type GlobalPrivateAiConfig = {
  enabled: boolean;
  aiMode: AiMode;
  privateAiOnly: boolean;
  localRuntimeConfigured: boolean;
  ollamaBaseUrl: string;
  ollamaModel: string;
  openaiModel: string;
  anthropicModel: string;
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
  openClawBridgeUrl: string | null;
};
