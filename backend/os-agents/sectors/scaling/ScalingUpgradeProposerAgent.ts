import type { ILlmClient } from "../../LlmClient";
import type { ScalingInput, ScalingOutput } from "./shared";
import { getDefaultScalingLlm, runScalingAgentCore } from "./shared";

const AGENT_ID = "scaling-upgrade-proposer";

export class ScalingUpgradeProposerAgent {
  private static inst: ScalingUpgradeProposerAgent | undefined;

  static get instance(): ScalingUpgradeProposerAgent {
    if (!ScalingUpgradeProposerAgent.inst) ScalingUpgradeProposerAgent.inst = new ScalingUpgradeProposerAgent();
    return ScalingUpgradeProposerAgent.inst;
  }

  static reset(): void {
    ScalingUpgradeProposerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultScalingLlm();
  }

  async run(input: ScalingInput): Promise<ScalingOutput> {
    return runScalingAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Expansion AE strategist top 1%; ofertas alineadas a valor medible.",
        mission:
          "Genera propuesta de upgrade personalizada con supuestos de ROI explícitos.",
        fewShotExample:
          "Input: equipo crece seats. Output JSON: recommendation plan Pro+5 seats; triggers headcount.",
      },
      input,
    );
  }
}

export function getScalingUpgradeProposerAgent(): ScalingUpgradeProposerAgent {
  return ScalingUpgradeProposerAgent.instance;
}

export function resetScalingUpgradeProposerAgentForTests(): void {
  ScalingUpgradeProposerAgent.reset();
}
