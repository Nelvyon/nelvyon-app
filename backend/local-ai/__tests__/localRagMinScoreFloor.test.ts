import { describe, expect, it } from "vitest";
import {
  DEFAULT_RAG_MIN_SCORE,
  resolveEffectiveRagMinScore,
  SMALL_CORPUS_CHUNK_CEILING,
  SMALL_CORPUS_MIN_SCORE_FLOOR,
} from "../LocalRagRetriever";

describe("resolveEffectiveRagMinScore — corpus-size-aware floor (raise only)", () => {
  it("keeps large-corpus default at 0.32 (never lowers)", () => {
    expect(resolveEffectiveRagMinScore(DEFAULT_RAG_MIN_SCORE, SMALL_CORPUS_CHUNK_CEILING)).toBe(0.32);
    expect(resolveEffectiveRagMinScore(DEFAULT_RAG_MIN_SCORE, 200)).toBe(0.32);
  });

  it("raises floor for small positive corpora", () => {
    expect(resolveEffectiveRagMinScore(DEFAULT_RAG_MIN_SCORE, 4)).toBe(SMALL_CORPUS_MIN_SCORE_FLOOR);
    expect(resolveEffectiveRagMinScore(DEFAULT_RAG_MIN_SCORE, 1)).toBe(0.45);
    expect(resolveEffectiveRagMinScore(DEFAULT_RAG_MIN_SCORE, 47)).toBe(0.45);
  });

  it("does not raise when activeChunkCount is 0 (empty tenant keeps base)", () => {
    expect(resolveEffectiveRagMinScore(DEFAULT_RAG_MIN_SCORE, 0)).toBe(0.32);
  });

  it("respects caller base when already stricter than small-corpus floor", () => {
    expect(resolveEffectiveRagMinScore(0.55, 4)).toBe(0.55);
    expect(resolveEffectiveRagMinScore(0.55, 200)).toBe(0.55);
  });

  it("never returns below DEFAULT_RAG_MIN_SCORE for finite bases", () => {
    expect(resolveEffectiveRagMinScore(0.1, 4)).toBe(SMALL_CORPUS_MIN_SCORE_FLOOR);
    expect(resolveEffectiveRagMinScore(0.1, 200)).toBe(0.1);
  });

  it("SMALL_CORPUS_MIN_SCORE_FLOOR is strictly above DEFAULT (raise, not lower)", () => {
    expect(SMALL_CORPUS_MIN_SCORE_FLOOR).toBeGreaterThan(DEFAULT_RAG_MIN_SCORE);
  });
});
