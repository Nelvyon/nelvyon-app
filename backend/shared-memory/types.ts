/**
 * Shared Memory — typed contracts (Phase 2 runtime).
 * Flag default OFF: NELVYON_SHARED_MEMORY_ENABLED=0
 */

export const SHARED_MEMORY_CONTRACT_VERSION = "1.1.0";

/** Scope hierarchy: session/user ≈ short-term; tenant/agent/workspace/shared_team ≈ long-term when layer=ltm. */
export type MemoryScope = "tenant" | "agent" | "workspace" | "shared_team" | "session" | "user";

export type MemoryLayer = "stm" | "ltm";

export type MemoryVisibility = "private" | "agent_shared" | "tenant_shared";

export type MemoryEntryKind =
  | "fact"
  | "preference"
  | "decision"
  | "artifact_ref"
  | "conversation_summary"
  | "kpi_snapshot";

export type SharedMemoryEntry = {
  id: string;
  tenantId: string;
  scope: MemoryScope;
  visibility: MemoryVisibility;
  kind: MemoryEntryKind;
  layer: MemoryLayer;
  agentId: string | null;
  userId: string | null;
  workspaceId: string | null;
  sessionId: string | null;
  key: string;
  title: string;
  content: string;
  embeddingRef: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  expiresAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type SharedMemoryWriteInput = {
  tenantId: string;
  scope: MemoryScope;
  visibility: MemoryVisibility;
  kind: MemoryEntryKind;
  layer?: MemoryLayer;
  agentId?: string | null;
  userId?: string | null;
  workspaceId?: string | null;
  sessionId?: string | null;
  key: string;
  title?: string;
  content: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  expiresAt?: string | null;
  createdBy: string;
};

export type SharedMemoryQuery = {
  tenantId: string;
  scope?: MemoryScope;
  agentId?: string;
  userId?: string;
  layer?: MemoryLayer;
  query?: string;
  tags?: string[];
  limit?: number;
  /** Never allow cross-tenant. */
  forbidCrossTenant: true;
};

export type SharedMemorySearchResult = {
  entries: SharedMemoryEntry[];
  traceId: string;
  truncated: boolean;
};

export type SharedMemoryEvent =
  | { type: "memory.written"; tenantId: string; entryId: string; agentId: string | null }
  | { type: "memory.deleted"; tenantId: string; entryId: string }
  | { type: "memory.expired"; tenantId: string; entryId: string }
  | { type: "memory.shared"; tenantId: string; entryId: string; visibility: MemoryVisibility };

export interface ISharedMemoryStore {
  readonly contractVersion: string;
  write(input: SharedMemoryWriteInput): Promise<SharedMemoryEntry>;
  read(tenantId: string, entryId: string): Promise<SharedMemoryEntry | null>;
  search(query: SharedMemoryQuery): Promise<SharedMemorySearchResult>;
  delete(tenantId: string, entryId: string, actorId: string): Promise<boolean>;
  listByAgent(tenantId: string, agentId: string, limit: number): Promise<SharedMemoryEntry[]>;
  listByUser?(tenantId: string, userId: string, limit: number): Promise<SharedMemoryEntry[]>;
  purgeExpired?(tenantId?: string): Promise<number>;
}

export type SharedMemoryPolicyDecision = "allowed" | "denied" | "approval_required";

export type SharedMemoryPolicyContext = {
  tenantId: string;
  userId: string;
  agentId: string;
  roles: string[];
  scopes: string[];
};

export interface ISharedMemoryPolicy {
  authorizeWrite(ctx: SharedMemoryPolicyContext, input: SharedMemoryWriteInput): SharedMemoryPolicyDecision;
  authorizeRead(ctx: SharedMemoryPolicyContext, entry: SharedMemoryEntry): SharedMemoryPolicyDecision;
}

/** Default layer from scope when caller omits layer. */
export function defaultMemoryLayer(scope: MemoryScope): MemoryLayer {
  return scope === "session" || scope === "user" ? "stm" : "ltm";
}
