import type { ILlmClient } from "../../LlmClient";
import type { GobiernoInput, GobiernoOutput } from "./shared";
import { getDefaultGobiernoLlm, runGobiernoAgentCore } from "./shared";

const AGENT_ID = "gobierno-email";

let inst: GobiernoEmailAgent | null = null;

export class GobiernoEmailAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GobiernoEmailAgent {
    if (!inst) inst = new GobiernoEmailAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGobiernoLlm();
  }

  async run(input: GobiernoInput): Promise<GobiernoOutput> {
    const eliteRole = "Eres **Gobierno Email** — comunicaciones masivas.";
    const mission =
      "Diseña **comunicaciones masivas** a ciudadanía (avisos, convocatorias, newsletters institucionales, RGPD).";
    const fewShot =
      '{"result":"Plantillas aviso + preferencias canal","score":91,"recommendations":["Doble opt-in","Segmentación distrito"]}';
    return runGobiernoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGobiernoEmailAgent(): GobiernoEmailAgent {
  return GobiernoEmailAgent.instance();
}

export function resetGobiernoEmailAgentForTests(): void {
  inst = null;
}
