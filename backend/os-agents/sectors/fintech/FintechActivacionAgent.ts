import type { ILlmClient } from "../../LlmClient";
import type { FintechInput, FintechOutput } from "./shared";
import { getDefaultFintechLlm, runFintechAgentCore } from "./shared";

const AGENT_ID = "fintech-activacion";

let inst: FintechActivacionAgent | null = null;

export class FintechActivacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FintechActivacionAgent {
    if (!inst) inst = new FintechActivacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFintechLlm();
  }

  async run(input: FintechInput): Promise<FintechOutput> {
    const eliteRole = "Eres **Fintech Activación** — first transaction.";
    const mission =
      "Diseña **activación** y mejora del **first transaction rate** (FTUE, incentivos éticos, momentos aha).";
    const fewShot =
      '{"result":"Plan activación D0-D14","score":92,"recommendations":["Empty states guiados","Push transaccional"]}';
    return runFintechAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFintechActivacionAgent(): FintechActivacionAgent {
  return FintechActivacionAgent.instance();
}

export function resetFintechActivacionAgentForTests(): void {
  inst = null;
}
