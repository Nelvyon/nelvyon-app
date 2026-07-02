/** Autonomous simulation router — Phase C (LLM) in production, Phase B offline in dev/tests. */

import type { SimulationResult } from "./types";
import { simulateAutonomousJob, type SimulateOptions } from "./simulator";

export function isAutonomousProductionEnv(): boolean {
  return process.env.AUTONOMOUS_PRODUCTION === "true";
}

/** Production packs use Phase C (LLM + template learning); local/tests keep Phase B simulator. */
export async function runAutonomousSimulation(options: SimulateOptions): Promise<SimulationResult> {
  if (isAutonomousProductionEnv()) {
    const { simulatePhaseC } = await import("./simulatorPhaseC");
    return simulatePhaseC({
      sku: options.sku,
      tier: options.tier,
      brief: options.brief,
      sector: typeof options.brief.sector === "string" ? options.brief.sector : undefined,
      os_refs: options.os_refs,
    });
  }
  return simulateAutonomousJob(options);
}

export type { SimulateOptions };
