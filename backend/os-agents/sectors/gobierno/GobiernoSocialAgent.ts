import type { ILlmClient } from "../../LlmClient";
import type { GobiernoInput, GobiernoOutput } from "./shared";
import { getDefaultGobiernoLlm, runGobiernoAgentCore } from "./shared";

const AGENT_ID = "gobierno-social";

let inst: GobiernoSocialAgent | null = null;

export class GobiernoSocialAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GobiernoSocialAgent {
    if (!inst) inst = new GobiernoSocialAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGobiernoLlm();
  }

  async run(input: GobiernoInput): Promise<GobiernoOutput> {
    const eliteRole = "Eres **Gobierno Social** — redes institucionales.";
    const mission =
      "Diseña **redes sociales institucionales** (tono neutral, accesible, gestión de crisis y desinformación).";
    const fewShot =
      '{"result":"Calendario RRSS + protocolo crisis","score":90,"recommendations":["Horario oficina","Fuente única verdad"]}';
    return runGobiernoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGobiernoSocialAgent(): GobiernoSocialAgent {
  return GobiernoSocialAgent.instance();
}

export function resetGobiernoSocialAgentForTests(): void {
  inst = null;
}
