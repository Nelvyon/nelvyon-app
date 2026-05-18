import type { ILlmClient } from "../../LlmClient";
import type { SuperiorEmailInput, SuperiorEmailOutput } from "./shared";
import { getDefaultSuperiorEmailLlm, runSuperiorEmailAgentCore } from "./shared";

const AGENT_ID = "superioremail-timing";

export class SuperiorEmailTimingAgent {
  private static inst: SuperiorEmailTimingAgent | undefined;

  static get instance(): SuperiorEmailTimingAgent {
    if (!SuperiorEmailTimingAgent.inst) SuperiorEmailTimingAgent.inst = new SuperiorEmailTimingAgent();
    return SuperiorEmailTimingAgent.inst;
  }

  static reset(): void {
    SuperiorEmailTimingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorEmailLlm();
  }

  async run(input: SuperiorEmailInput): Promise<SuperiorEmailOutput> {
    const eliteRole =
      "Eres **SuperiorEmail Send-Time Optimizer** — ventana óptima por contacto.";
    const mission =
      "Envía en el **momento exacto** de mayor probabilidad de apertura **por contacto** (no solo segmento); diferenciador vs Klaviyo.";
    const fewShot =
      '{"content":"Per-contact send window Tue 10:14 local, OR lift vs segment","score":90,"highlights":["Individual timing","OR >45% target"],"metrics":["Predicted open"]}';
    return runSuperiorEmailAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorEmailTimingAgent(): SuperiorEmailTimingAgent {
  return SuperiorEmailTimingAgent.instance;
}

export function resetSuperiorEmailTimingAgentForTests(): void {
  SuperiorEmailTimingAgent.reset();
}
