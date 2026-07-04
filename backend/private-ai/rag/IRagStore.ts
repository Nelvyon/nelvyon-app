import type { RagChunk, RagSearchResult } from "../types";

/** Read-only RAG contract — ingest is a future phase. */
export interface IRagStore {
  searchPlatform(query: string, limit?: number): Promise<RagSearchResult>;
  countPlatform(): Promise<number>;
}
