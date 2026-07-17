/**
 * SaasSharedMemoryService — policy + store + audit façade for SaaS / MCP.
 * Does not replace SaasTenantMemoryService (inbox chunk KB); this is multi-agent SSOT.
 */

import {
  DefaultSharedMemoryPolicy,
  SharedMemoryApprovalRequiredError,
  SharedMemoryDeniedError,
  SharedMemoryNotEnabledError,
  getSharedMemoryStore,
} from "../shared-memory/store";
import { getSharedMemoryConfig, isSharedMemoryEnabled } from "../shared-memory/config";
import type {
  ISharedMemoryPolicy,
  ISharedMemoryStore,
  SharedMemoryEntry,
  SharedMemoryPolicyContext,
  SharedMemoryQuery,
  SharedMemorySearchResult,
  SharedMemoryWriteInput,
} from "../shared-memory/types";
import { PostgresSharedMemoryStore } from "../shared-memory/PostgresSharedMemoryStore";
import {
  assertSafeMemoryContent,
  isUsefulMemoryContent,
  SharedMemoryContentRejectedError,
} from "../shared-memory/contentSecurity";

export { SharedMemoryContentRejectedError };

export class SaasSharedMemoryService {
  constructor(
    private readonly store: ISharedMemoryStore = getSharedMemoryStore(),
    private readonly policy: ISharedMemoryPolicy = new DefaultSharedMemoryPolicy(),
  ) {}

  status() {
    const cfg = getSharedMemoryConfig();
    return {
      enabled: cfg.enabled,
      contractVersion: cfg.contractVersion,
      backend: process.env.NELVYON_SHARED_MEMORY_BACKEND ?? (cfg.enabled ? "postgres" : "off"),
      maxEntryChars: cfg.maxEntryChars,
      rollback: cfg.rollback,
    };
  }

  async write(ctx: SharedMemoryPolicyContext, input: SharedMemoryWriteInput): Promise<SharedMemoryEntry> {
    if (!isSharedMemoryEnabled()) throw new SharedMemoryNotEnabledError();
    if (input.tenantId !== ctx.tenantId) throw new SharedMemoryDeniedError("cross_tenant");
    const decision = this.policy.authorizeWrite(ctx, input);
    if (decision === "denied") throw new SharedMemoryDeniedError();
    if (decision === "approval_required") throw new SharedMemoryApprovalRequiredError();
    if (!isUsefulMemoryContent(input.content)) {
      throw new SharedMemoryContentRejectedError("not_useful", "Memory content too short or non-actionable");
    }
    const safeContent = assertSafeMemoryContent(input.content, input.title ?? "");
    const entry = await this.store.write({
      ...input,
      content: safeContent,
      tenantId: ctx.tenantId,
      agentId: input.agentId ?? ctx.agentId,
      userId: input.userId ?? ctx.userId,
      createdBy: input.createdBy || ctx.userId,
    });
    await this.maybeAudit(ctx.tenantId, "write", ctx.userId, {
      entryId: entry.id,
      agentId: ctx.agentId,
      preview: entry.content.slice(0, 120),
    });
    return entry;
  }

  async read(ctx: SharedMemoryPolicyContext, entryId: string): Promise<SharedMemoryEntry | null> {
    if (!isSharedMemoryEnabled()) throw new SharedMemoryNotEnabledError();
    const entry = await this.store.read(ctx.tenantId, entryId);
    if (!entry) return null;
    if (this.policy.authorizeRead(ctx, entry) === "denied") throw new SharedMemoryDeniedError();
    return entry;
  }

  async search(ctx: SharedMemoryPolicyContext, query: Omit<SharedMemoryQuery, "tenantId" | "forbidCrossTenant">): Promise<SharedMemorySearchResult> {
    if (!isSharedMemoryEnabled()) throw new SharedMemoryNotEnabledError();
    const result = await this.store.search({
      ...query,
      tenantId: ctx.tenantId,
      forbidCrossTenant: true,
    });
    const entries = result.entries.filter((e) => this.policy.authorizeRead(ctx, e) === "allowed");
    return { ...result, entries, truncated: result.truncated || entries.length < result.entries.length };
  }

  async delete(ctx: SharedMemoryPolicyContext, entryId: string): Promise<boolean> {
    if (!isSharedMemoryEnabled()) throw new SharedMemoryNotEnabledError();
    const entry = await this.store.read(ctx.tenantId, entryId);
    if (!entry) return false;
    if (this.policy.authorizeRead(ctx, entry) === "denied") throw new SharedMemoryDeniedError();
    const ok = await this.store.delete(ctx.tenantId, entryId, ctx.userId);
    if (ok) {
      await this.maybeAudit(ctx.tenantId, "delete", ctx.userId, { entryId, agentId: ctx.agentId });
    }
    return ok;
  }

  async listByAgent(ctx: SharedMemoryPolicyContext, agentId: string, limit = 20): Promise<SharedMemoryEntry[]> {
    const res = await this.search(ctx, { agentId, limit });
    return res.entries;
  }

  private async maybeAudit(
    tenantId: string,
    action: string,
    actorId: string,
    opts: { entryId?: string; agentId?: string; preview?: string },
  ): Promise<void> {
    if (this.store instanceof PostgresSharedMemoryStore) {
      try {
        await this.store.audit(tenantId, action, actorId, opts);
      } catch {
        /* audit best-effort — never fail primary op */
      }
    }
  }
}

let _svc: SaasSharedMemoryService | undefined;
export function getSaasSharedMemoryService(): SaasSharedMemoryService {
  _svc ??= new SaasSharedMemoryService();
  return _svc;
}
export function resetSaasSharedMemoryServiceForTests(): void {
  _svc = undefined;
}
