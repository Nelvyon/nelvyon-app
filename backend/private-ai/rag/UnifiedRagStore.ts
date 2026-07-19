/**
 * Unified RAG facade (KI-005) — SSOT for Private AI / MCP.
 * Prefers certified LocalRagRetriever when available; falls back to NelvyonRagStore (ILIKE).
 * Does NOT change LocalModelRouter (keeps router certification path intact).
 *
 * Rollback: NELVYON_RAG_PREFER_LOCAL=0 → ILIKE-only adjunct.
 */

import type { IRagStore } from "./IRagStore";
import { NelvyonRagStore } from "./NelvyonRagStore";
import type { RagChunk, RagSearchResult } from "../types";
import type { SaasPostgresPort } from "../../saas/SaasOnboardingService";
import { DbClient } from "../../db/DbClient";

const PLATFORM_TENANT =
  process.env.LOCAL_AI_PLATFORM_TENANT_ID?.trim() || "00000000-0000-0000-0000-000000000001";

export function preferLocalRag(): boolean {
  const v = process.env.NELVYON_RAG_PREFER_LOCAL ?? "1";
  return v !== "0" && v.toLowerCase() !== "false";
}

export class UnifiedRagStore implements IRagStore {
  private readonly adjunct: NelvyonRagStore;

  constructor(db: SaasPostgresPort = DbClient.getInstance()) {
    this.adjunct = new NelvyonRagStore(db);
  }

  async countPlatform(): Promise<number> {
    if (preferLocalRag()) {
      try {
        const { getLocalVectorStore } = await import("../../local-ai/LocalVectorStore");
        const n = await getLocalVectorStore().countChunks(PLATFORM_TENANT);
        if (typeof n === "number" && n > 0) return n;
      } catch {
        /* fall through */
      }
    }
    return this.adjunct.countPlatform();
  }

  async searchPlatform(query: string, limitOrOpts: number | { limit?: number; domain?: string } = 5): Promise<RagSearchResult> {
    const q = query.trim();
    if (!q) return { chunks: [], query: q, source: "platform" };
    const limit = typeof limitOrOpts === "number" ? limitOrOpts : (limitOrOpts.limit ?? 5);
    const domain = typeof limitOrOpts === "number" ? undefined : limitOrOpts.domain;

    if (preferLocalRag()) {
      try {
        const { getLocalRagRetriever } = await import("../../local-ai/LocalRagRetriever");
        const retrieval = await getLocalRagRetriever().retrieve(PLATFORM_TENANT, q, {
          limit,
          domain: domain as import("../../local-ai/specialization/ontology").KnowledgeDomainId | undefined,
        });
        if (retrieval.citations.length > 0) {
          const chunks: RagChunk[] = retrieval.citations.map((c, i) => ({
            id: `${c.documentId}:${c.chunkIndex}`,
            source: c.sourceId,
            title: `[${i + 1}] ${c.domain ?? "local"}`,
            content: c.content,
            tags: c.domain ? [c.domain] : [],
          }));
          return { chunks, query: q, source: "platform" };
        }
      } catch {
        /* fall through to adjunct */
      }
    }

    return this.adjunct.searchPlatform(q, limit);
  }
}

let _unified: UnifiedRagStore | undefined;
export function getUnifiedRagStore(db?: SaasPostgresPort): UnifiedRagStore {
  if (db) return new UnifiedRagStore(db);
  _unified ??= new UnifiedRagStore();
  return _unified;
}

export function resetUnifiedRagStoreForTests(): void {
  _unified = undefined;
}
