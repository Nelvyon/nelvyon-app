import { getLocalAiConfig } from "../config";
import type { ModelSlot } from "./types";

export type ModelProfile = {
  slot: ModelSlot;
  model: string;
  label: string;
  numGpu?: number;
  defaultNumCtx: number;
  maxNumCtx: number;
  defaultNumPredict: number;
  temperature: number;
  estimatedVramMiB: number;
  estimatedRamMiB: number;
  keepAliveMs: number;
};

export function getModelRegistry(): Record<ModelSlot, ModelProfile> {
  const cfg = getLocalAiConfig();
  const fast = cfg.ollamaModel;
  const strategy = cfg.strategyModel ?? cfg.ollamaModel;
  return {
    fast: {
      slot: "fast",
      model: fast,
      label: "fast-3b",
      defaultNumCtx: 8192,
      maxNumCtx: 8192,
      defaultNumPredict: 2048,
      temperature: 0.15,
      estimatedVramMiB: 1100,
      estimatedRamMiB: 4096,
      keepAliveMs: Number(process.env.OLLAMA_KEEP_ALIVE_MS ?? 300_000),
    },
    strategy: {
      slot: "strategy",
      model: strategy,
      label: "strategy-8b",
      numGpu: cfg.strategyNumGpu ?? 22,
      defaultNumCtx: 8192,
      maxNumCtx: 12288,
      defaultNumPredict: 6144,
      temperature: 0.15,
      estimatedVramMiB: 4200,
      estimatedRamMiB: 8192,
      keepAliveMs: Number(process.env.OLLAMA_STRATEGY_KEEP_ALIVE_MS ?? 180_000),
    },
  };
}

export function profileForSlot(slot: ModelSlot): ModelProfile {
  return getModelRegistry()[slot];
}
