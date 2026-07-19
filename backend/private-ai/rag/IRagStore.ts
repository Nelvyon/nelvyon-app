import type { RagChunk, RagSearchResult } from "../types";

/** Read-only RAG contract — ingest is a future phase. */
export type RagSearchOpts = {
  limit?: number;
  /** Knowledge ontology domain hint (LocalRag filter/boost). */
  domain?: string;
};

export interface IRagStore {
  searchPlatform(query: string, limitOrOpts?: number | RagSearchOpts): Promise<RagSearchResult>;
  countPlatform(): Promise<number>;
}
