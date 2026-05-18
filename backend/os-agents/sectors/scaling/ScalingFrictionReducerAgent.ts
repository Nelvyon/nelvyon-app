import type { ILlmClient } from "../../LlmClient";
import type { ScalingInput, ScalingOutput } from "./shared";
import { getDefaultScalingLlm, runScalingAgentCore } from "./shared";

const AGENT_ID = "scaling-friction-reducer";

export class ScalingFrictionReducerAgent {
  private static inst: ScalingFrictionReducerAgent | undefined;

  static get instance(): ScalingFrictionReducerAgent {
    if (!ScalingFrictionReducerAgent.inst) ScalingFrictionReducerAgent.inst = new ScalingFrictionReducerAgent();
    return ScalingFrictionReducerAgent.inst;
  }

  static reset(): void {
    ScalingFrictionReducerAgent.inst = undefined;
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
          "ROLE: Checkout & billing UX strategist top 1%; menos clics, más claridad.",
        mission:
          "Identifica fricciones típicas en upgrade y propone eliminación: copy, UI y aprobaciones.",
        fewShotExample:
          "Input: miedo a lock-in. Output JSON: recommendation trial escalonado; triggers objeción legal.",
      },
      input,
    );
  }
}

export function getScalingFrictionReducerAgent(): ScalingFrictionReducerAgent {
  return ScalingFrictionReducerAgent.instance;
}

export function resetScalingFrictionReducerAgentForTests(): void {
  ScalingFrictionReducerAgent.reset();
}
