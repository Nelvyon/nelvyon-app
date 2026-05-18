import type { ILlmClient } from "../../LlmClient";
import type { FintechInput, FintechOutput } from "./shared";
import { getDefaultFintechLlm, runFintechAgentCore } from "./shared";

const AGENT_ID = "fintech-seo";

let inst: FintechSEOAgent | null = null;

export class FintechSEOAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FintechSEOAgent {
    if (!inst) inst = new FintechSEOAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFintechLlm();
  }

  async run(input: FintechInput): Promise<FintechOutput> {
    const eliteRole = "Eres **Fintech SEO** — finanzas personales y comparadores.";
    const mission =
      "Diseña **SEO** para finanzas personales, **comparadores de producto** y búsquedas de intención (YMYL prudente).";
    const fewShot =
      '{"result":"Pilar finanzas + landings comparador","score":92,"recommendations":["E-E-A-T fuentes","Disclaimer riesgo"]}';
    return runFintechAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFintechSEOAgent(): FintechSEOAgent {
  return FintechSEOAgent.instance();
}

export function resetFintechSEOAgentForTests(): void {
  inst = null;
}
