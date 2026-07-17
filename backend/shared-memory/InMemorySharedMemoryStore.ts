import { randomUUID } from "node:crypto";
import { getSharedMemoryConfig } from "./config";
import type {
  ISharedMemoryStore,
  SharedMemoryEntry,
  SharedMemoryQuery,
  SharedMemorySearchResult,
  SharedMemoryWriteInput,
} from "./types";
import { SHARED_MEMORY_CONTRACT_VERSION, defaultMemoryLayer } from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeWrite(input: SharedMemoryWriteInput): SharedMemoryWriteInput {
  const cfg = getSharedMemoryConfig();
  const content = input.content.slice(0, cfg.maxEntryChars);
  const tags = (input.tags ?? []).slice(0, cfg.maxTags).map((t) => t.slice(0, 64));
  const layer = input.layer ?? defaultMemoryLayer(input.scope);
  let expiresAt = input.expiresAt ?? null;
  if (!expiresAt && layer === "stm") {
    expiresAt = new Date(Date.now() + cfg.stmTtlHours * 3600_000).toISOString();
  }
  if (!expiresAt && layer === "ltm" && cfg.defaultTtlDays > 0) {
    expiresAt = new Date(Date.now() + cfg.defaultTtlDays * 86400_000).toISOString();
  }
  return { ...input, content, tags, layer, expiresAt };
}

function compositeKey(e: {
  tenantId: string;
  scope: string;
  key: string;
  agentId: string | null | undefined;
  sessionId: string | null | undefined;
  userId: string | null | undefined;
}): string {
  return [e.tenantId, e.scope, e.key, e.agentId ?? "", e.sessionId ?? "", e.userId ?? ""].join("\0");
}

function isExpired(entry: SharedMemoryEntry, at = Date.now()): boolean {
  if (!entry.expiresAt) return false;
  return new Date(entry.expiresAt).getTime() <= at;
}

/** Process-local store — unit tests + offline; never used as production SSOT. */
export class InMemorySharedMemoryStore implements ISharedMemoryStore {
  readonly contractVersion = SHARED_MEMORY_CONTRACT_VERSION;
  private readonly byId = new Map<string, SharedMemoryEntry>();
  private readonly byComposite = new Map<string, string>();

  async write(input: SharedMemoryWriteInput): Promise<SharedMemoryEntry> {
    const n = normalizeWrite(input);
    const ck = compositeKey({
      tenantId: n.tenantId,
      scope: n.scope,
      key: n.key,
      agentId: n.agentId,
      sessionId: n.sessionId,
      userId: n.userId,
    });
    const existingId = this.byComposite.get(ck);
    const ts = nowIso();
    if (existingId) {
      const prev = this.byId.get(existingId)!;
      const updated: SharedMemoryEntry = {
        ...prev,
        visibility: n.visibility,
        kind: n.kind,
        layer: n.layer ?? prev.layer,
        title: n.title ?? prev.title,
        content: n.content,
        tags: n.tags ?? [],
        metadata: n.metadata ?? {},
        expiresAt: n.expiresAt ?? null,
        updatedAt: ts,
        version: prev.version + 1,
      };
      this.byId.set(existingId, updated);
      return updated;
    }
    const id = randomUUID();
    const entry: SharedMemoryEntry = {
      id,
      tenantId: n.tenantId,
      scope: n.scope,
      visibility: n.visibility,
      kind: n.kind,
      layer: n.layer ?? defaultMemoryLayer(n.scope),
      agentId: n.agentId ?? null,
      userId: n.userId ?? null,
      workspaceId: n.workspaceId ?? null,
      sessionId: n.sessionId ?? null,
      key: n.key,
      title: n.title ?? "",
      content: n.content,
      embeddingRef: null,
      tags: n.tags ?? [],
      metadata: n.metadata ?? {},
      expiresAt: n.expiresAt ?? null,
      createdBy: n.createdBy,
      createdAt: ts,
      updatedAt: ts,
      version: 1,
    };
    this.byId.set(id, entry);
    this.byComposite.set(ck, id);
    return entry;
  }

  async read(tenantId: string, entryId: string): Promise<SharedMemoryEntry | null> {
    const e = this.byId.get(entryId);
    if (!e || e.tenantId !== tenantId) return null;
    if (isExpired(e)) {
      await this.delete(tenantId, entryId, "system:ttl");
      return null;
    }
    return e;
  }

  async search(query: SharedMemoryQuery): Promise<SharedMemorySearchResult> {
    if (!query.forbidCrossTenant) {
      throw new Error("forbidCrossTenant_required");
    }
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const q = query.query?.trim().toLowerCase();
    let rows = [...this.byId.values()].filter((e) => e.tenantId === query.tenantId && !isExpired(e));
    if (query.scope) rows = rows.filter((e) => e.scope === query.scope);
    if (query.agentId) rows = rows.filter((e) => e.agentId === query.agentId);
    if (query.userId) rows = rows.filter((e) => e.userId === query.userId);
    if (query.layer) rows = rows.filter((e) => e.layer === query.layer);
    if (query.tags?.length) {
      rows = rows.filter((e) => query.tags!.every((t) => e.tags.includes(t)));
    }
    if (q) {
      rows = rows.filter(
        (e) =>
          e.content.toLowerCase().includes(q) ||
          e.title.toLowerCase().includes(q) ||
          e.key.toLowerCase().includes(q),
      );
    }
    rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const truncated = rows.length > limit;
    return {
      entries: rows.slice(0, limit),
      traceId: randomUUID(),
      truncated,
    };
  }

  async delete(tenantId: string, entryId: string, _actorId: string): Promise<boolean> {
    const e = this.byId.get(entryId);
    if (!e || e.tenantId !== tenantId) return false;
    this.byId.delete(entryId);
    this.byComposite.delete(
      compositeKey({
        tenantId: e.tenantId,
        scope: e.scope,
        key: e.key,
        agentId: e.agentId,
        sessionId: e.sessionId,
        userId: e.userId,
      }),
    );
    return true;
  }

  async listByAgent(tenantId: string, agentId: string, limit: number): Promise<SharedMemoryEntry[]> {
    const res = await this.search({
      tenantId,
      agentId,
      limit,
      forbidCrossTenant: true,
    });
    return res.entries;
  }

  async listByUser(tenantId: string, userId: string, limit: number): Promise<SharedMemoryEntry[]> {
    const res = await this.search({
      tenantId,
      userId,
      limit,
      forbidCrossTenant: true,
    });
    return res.entries;
  }

  async purgeExpired(tenantId?: string): Promise<number> {
    let n = 0;
    for (const e of [...this.byId.values()]) {
      if (tenantId && e.tenantId !== tenantId) continue;
      if (isExpired(e)) {
        await this.delete(e.tenantId, e.id, "system:purge");
        n += 1;
      }
    }
    return n;
  }

  /** Test helper */
  clear(): void {
    this.byId.clear();
    this.byComposite.clear();
  }
}

let _mem: InMemorySharedMemoryStore | undefined;
export function getInMemorySharedMemoryStore(): InMemorySharedMemoryStore {
  _mem ??= new InMemorySharedMemoryStore();
  return _mem;
}

export function resetInMemorySharedMemoryStoreForTests(): void {
  _mem?.clear();
  _mem = undefined;
}
