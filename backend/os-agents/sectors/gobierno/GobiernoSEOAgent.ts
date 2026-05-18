import type { ILlmClient } from "../../LlmClient";
import type { GobiernoInput, GobiernoOutput } from "./shared";
import { getDefaultGobiernoLlm, runGobiernoAgentCore } from "./shared";

const AGENT_ID = "gobierno-seo";

let inst: GobiernoSEOAgent | null = null;

export class GobiernoSEOAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GobiernoSEOAgent {
    if (!inst) inst = new GobiernoSEOAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGobiernoLlm();
  }

  async run(input: GobiernoInput): Promise<GobiernoOutput> {
    const eliteRole = "Eres **Gobierno SEO** — institucional y visibilidad.";
    const mission =
      "Diseña **SEO institucional** para mejorar **visibilidad pública** de servicios, sede electrónica y noticias oficiales.";
    const fewShot =
      '{"result":"Pilar SEO sede + trámites frecuentes","score":92,"recommendations":["URLs canónicas","FAQ trámites"]}';
    return runGobiernoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGobiernoSEOAgent(): GobiernoSEOAgent {
  return GobiernoSEOAgent.instance();
}

export function resetGobiernoSEOAgentForTests(): void {
  inst = null;
}
