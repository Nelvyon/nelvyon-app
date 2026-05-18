import type { ILlmClient } from "../../LlmClient";
import type { HrTechInput, HrTechOutput } from "./shared";
import { getDefaultHrTechLlm, runHrTechAgentCore } from "./shared";

const AGENT_ID = "hrtech-training";

export class TrainingAgent {
  private static inst: TrainingAgent | undefined;

  static get instance(): TrainingAgent {
    if (!TrainingAgent.inst) TrainingAgent.inst = new TrainingAgent();
    return TrainingAgent.inst;
  }

  static reset(): void {
    TrainingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHrTechLlm();
  }

  async run(input: HrTechInput): Promise<HrTechOutput> {
    const eliteRole = "Eres **Training** — formación continua.";
    const mission =
      "Entrega **formación personalizada por rol**, **skills gaps** y **certificaciones**.";
    const fewShot =
      '{"content":"Training: por rol, skills gaps, certificaciones","score":93,"highlights":["Por rol","Skills gaps"],"metrics":["Training completion"]}';
    return runHrTechAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getTrainingAgent(): TrainingAgent {
  return TrainingAgent.instance;
}

export function resetTrainingAgentForTests(): void {
  TrainingAgent.reset();
}
