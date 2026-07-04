import { DbClient } from "../../db/DbClient";
import type { SaasPostgresPort } from "../../saas/SaasOnboardingService";
import type { IRagStore } from "./IRagStore";
import type { RagChunk, RagSearchResult } from "../types";

/**
 * Platform RAG store — reads nelvyon_rag_chunks only.
 * Ingest pipeline not implemented (by design until docs corpus is ready).
 */
export class NelvyonRagStore implements IRagStore {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async countPlatform(): Promise<number> {
    const rows = await this.db.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM nelvyon_rag_chunks`);
    return Number(rows[0]?.c ?? 0);
  }

  async searchPlatform(query: string, limit = 5): Promise<RagSearchResult> {
    const q = query.trim();
    if (!q) return { chunks: [], query: q, source: "platform" };

    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT id, source, title, content, tags
       FROM nelvyon_rag_chunks
       WHERE content ILIKE $1 OR title ILIKE $1 OR $2 = ANY(tags)
       ORDER BY created_at DESC
       LIMIT $3`,
      [`%${q}%`, q.toLowerCase(), limit],
    );

    const chunks: RagChunk[] = rows.map((r) => ({
      id: String(r.id),
      source: String(r.source),
      title: String(r.title ?? ""),
      content: String(r.content),
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    }));

    return { chunks, query: q, source: "platform" };
  }
}

let _store: NelvyonRagStore | undefined;
export function getNelvyonRagStore(): NelvyonRagStore {
  _store ??= new NelvyonRagStore();
  return _store;
}
