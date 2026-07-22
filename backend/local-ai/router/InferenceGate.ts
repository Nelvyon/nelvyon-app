import type { ModelProfile } from "./ModelRegistry";
import { getOllamaClient } from "../OllamaClient";

type CircuitState = "closed" | "open" | "half_open";

/** Serializes Ollama inference — one heavy (8B) task at a time; limited 3B concurrency. */
export class InferenceGate {
  private loadedModel: string | null = null;
  private heavyRunning = 0;
  private fastRunning = 0;
  private circuit: CircuitState = "closed";
  private failures = 0;
  private lastFailureAt = 0;
  private readonly maxFastConcurrent = Number(process.env.ROUTER_MAX_FAST_CONCURRENT ?? 1);
  private readonly failureThreshold = 3;
  private readonly circuitResetMs = 60_000;
  private readonly acquireWaitMs = Number(process.env.ROUTER_GATE_WAIT_MS ?? 120_000);

  getLoadedModel(): string | null {
    return this.loadedModel;
  }

  isCircuitOpen(): boolean {
    if (this.circuit === "open" && Date.now() - this.lastFailureAt > this.circuitResetMs) {
      this.circuit = "half_open";
      this.failures = 0;
    }
    return this.circuit === "open";
  }

  async acquire(profile: ModelProfile, signal?: AbortSignal): Promise<{
    release: () => void;
    gateWaitMs: number;
    modelLoadMs: number;
    coldStart: boolean;
    modelLoadedBefore: string | null;
  }> {
    if (this.isCircuitOpen()) throw new Error("ollama_circuit_open");
    if (signal?.aborted) throw new Error("task_cancelled");

    const modelLoadedBefore = this.loadedModel;
    const isHeavy = profile.slot === "strategy";
    const waitStart = Date.now();
    if (isHeavy) {
      while (this.heavyRunning > 0 || this.fastRunning > 0) {
        if (signal?.aborted) throw new Error("task_cancelled");
        if (Date.now() - waitStart > this.acquireWaitMs) throw new Error("gate_wait_timeout");
        await sleep(50);
      }
      this.heavyRunning++;
    } else {
      while (this.heavyRunning > 0 || this.fastRunning >= this.maxFastConcurrent) {
        if (signal?.aborted) throw new Error("task_cancelled");
        if (Date.now() - waitStart > this.acquireWaitMs) throw new Error("gate_wait_timeout");
        await sleep(50);
      }
      this.fastRunning++;
    }
    const gateWaitMs = Date.now() - waitStart;

    let modelLoadMs = 0;
    let coldStart = false;
    try {
      const load = await this.ensureModelLoaded(profile);
      modelLoadMs = load.modelLoadMs;
      coldStart = load.coldStart;
    } catch (e) {
      if (isHeavy) this.heavyRunning = Math.max(0, this.heavyRunning - 1);
      else this.fastRunning = Math.max(0, this.fastRunning - 1);
      throw e;
    }

    return {
      gateWaitMs,
      modelLoadMs,
      coldStart,
      modelLoadedBefore,
      release: () => {
        if (isHeavy) this.heavyRunning = Math.max(0, this.heavyRunning - 1);
        else this.fastRunning = Math.max(0, this.fastRunning - 1);
      },
    };
  }

  private async ensureModelLoaded(profile: ModelProfile): Promise<{ modelLoadMs: number; coldStart: boolean }> {
    const base = profile.model.split(":")[0]!;
    if (this.loadedModel?.startsWith(base)) return { modelLoadMs: 0, coldStart: false };

    const loadStart = Date.now();
    const client = getOllamaClient();
    const probe = await client.probeLoad({
      model: profile.model,
      numGpu: profile.numGpu,
      numCtx: Math.min(profile.defaultNumCtx, 4096),
    });
    if (!probe.ok) {
      this.recordFailure();
      throw new Error(probe.error ?? "model_warmup_failed");
    }
    this.loadedModel = profile.model;
    this.recordSuccess();
    return { modelLoadMs: Date.now() - loadStart, coldStart: true };
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureAt = Date.now();
    if (this.failures >= this.failureThreshold) this.circuit = "open";
  }

  recordSuccess(): void {
    this.failures = 0;
    this.circuit = "closed";
  }

  async unloadInactive(keepModel?: string): Promise<void> {
    if (keepModel && this.loadedModel?.startsWith(keepModel.split(":")[0]!)) return;
    this.loadedModel = null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

let _gate: InferenceGate | undefined;
export function getInferenceGate(): InferenceGate {
  _gate ??= new InferenceGate();
  return _gate;
}

export function resetInferenceGateForTests(): void {
  _gate = undefined;
}
