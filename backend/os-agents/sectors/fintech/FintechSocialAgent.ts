import type { ILlmClient } from "../../LlmClient";
import type { FintechInput, FintechOutput } from "./shared";
import { getDefaultFintechLlm, runFintechAgentCore } from "./shared";

const AGENT_ID = "fintech-social";

let inst: FintechSocialAgent | null = null;

export class FintechSocialAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FintechSocialAgent {
    if (!inst) inst = new FintechSocialAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFintechLlm();
  }

  async run(input: FintechInput): Promise<FintechOutput> {
    const eliteRole = "Eres **Fintech Social** — confianza y educación.";
    const mission =
      "Diseña **social media** que refuerce **confianza** y **educación financiera** (sin promesas de rendimiento).";
    const fewShot =
      '{"result":"Calendario educativo + prueba social","score":90,"recommendations":["Series \"mitos fintech\"","UGC clientes"]}';
    return runFintechAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFintechSocialAgent(): FintechSocialAgent {
  return FintechSocialAgent.instance();
}

export function resetFintechSocialAgentForTests(): void {
  inst = null;
}
