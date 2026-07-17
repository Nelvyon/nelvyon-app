/**
 * Shared Memory ports — runtime when NELVYON_SHARED_MEMORY_ENABLED=1.
 */

import type {
  ISharedMemoryPolicy,
  ISharedMemoryStore,
  SharedMemoryEntry,
  SharedMemoryPolicyContext,
  SharedMemoryPolicyDecision,
  SharedMemoryQuery,
  SharedMemorySearchResult,
  SharedMemoryWriteInput,
} from "./types";
import { SHARED_MEMORY_CONTRACT_VERSION } from "./types";
import { isSharedMemoryEnabled } from "./config";
import { getInMemorySharedMemoryStore } from "./InMemorySharedMemoryStore";
import { PostgresSharedMemoryStore } from "./PostgresSharedMemoryStore";

export class SharedMemoryNotEnabledError extends Error {
  constructor() {
    super(
      "SharedMemory runtime not enabled. Set NELVYON_SHARED_MEMORY_ENABLED=1 after applying migration 514.",
    );
    this.name = "SharedMemoryNotEnabledError";
  }
}

export class SharedMemoryDeniedError extends Error {
  constructor(message = "SharedMemory policy denied") {
    super(message);
    this.name = "SharedMemoryDeniedError";
  }
}

export class SharedMemoryApprovalRequiredError extends Error {
  constructor(message = "SharedMemory write requires approval") {
    super(message);
    this.name = "SharedMemoryApprovalRequiredError";
  }
}

/** Stub store — satisfies interface; never persists. */
export class UnimplementedSharedMemoryStore implements ISharedMemoryStore {
  readonly contractVersion = SHARED_MEMORY_CONTRACT_VERSION;

  async write(_input: SharedMemoryWriteInput): Promise<SharedMemoryEntry> {
    throw new SharedMemoryNotEnabledError();
  }
  async read(_tenantId: string, _entryId: string): Promise<SharedMemoryEntry | null> {
    throw new SharedMemoryNotEnabledError();
  }
  async search(_query: SharedMemoryQuery): Promise<SharedMemorySearchResult> {
    throw new SharedMemoryNotEnabledError();
  }
  async delete(_tenantId: string, _entryId: string, _actorId: string): Promise<boolean> {
    throw new SharedMemoryNotEnabledError();
  }
  async listByAgent(_tenantId: string, _agentId: string, _limit: number): Promise<SharedMemoryEntry[]> {
    throw new SharedMemoryNotEnabledError();
  }
}

export class DefaultSharedMemoryPolicy implements ISharedMemoryPolicy {
  authorizeWrite(ctx: SharedMemoryPolicyContext, input: SharedMemoryWriteInput): SharedMemoryPolicyDecision {
    if (input.tenantId !== ctx.tenantId) return "denied";
    if (!ctx.scopes.includes("memory.write") && !ctx.roles.includes("owner") && !ctx.roles.includes("admin")) {
      return "denied";
    }
    if (input.visibility === "tenant_shared" && !ctx.roles.includes("owner") && !ctx.roles.includes("admin")) {
      return "approval_required";
    }
    return "allowed";
  }

  authorizeRead(ctx: SharedMemoryPolicyContext, entry: SharedMemoryEntry): SharedMemoryPolicyDecision {
    if (entry.tenantId !== ctx.tenantId) return "denied";
    if (entry.visibility === "private" && entry.agentId && entry.agentId !== ctx.agentId) {
      // Private-to-agent: same human user is not enough — owner/admin may audit.
      if (ctx.roles.includes("owner") || ctx.roles.includes("admin")) return "allowed";
      return "denied";
    }
    return "allowed";
  }
}

let _override: ISharedMemoryStore | null = null;
let _pg: PostgresSharedMemoryStore | undefined;

export function setSharedMemoryStoreForTests(store: ISharedMemoryStore | null): void {
  _override = store;
}

export function resetSharedMemoryStoreSingletonForTests(): void {
  _override = null;
  _pg = undefined;
}

/**
 * SSOT factory:
 * - flag OFF → Unimplemented (fail-closed)
 * - NELVYON_SHARED_MEMORY_BACKEND=memory → in-process (tests/dev)
 * - else → Postgres (production path)
 */
export function getSharedMemoryStore(): ISharedMemoryStore {
  if (_override) return _override;
  if (!isSharedMemoryEnabled()) {
    return new UnimplementedSharedMemoryStore();
  }
  const backend = (process.env.NELVYON_SHARED_MEMORY_BACKEND ?? "postgres").toLowerCase();
  if (backend === "memory" || backend === "inmemory") {
    return getInMemorySharedMemoryStore();
  }
  _pg ??= new PostgresSharedMemoryStore();
  return _pg;
}

export function getSharedMemoryPolicy(): ISharedMemoryPolicy {
  return new DefaultSharedMemoryPolicy();
}
