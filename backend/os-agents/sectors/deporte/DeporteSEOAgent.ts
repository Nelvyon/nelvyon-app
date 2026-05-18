import type { ILlmClient } from "../../LlmClient";
import type { DeporteInput, DeporteOutput } from "./shared";
import { getDefaultDeporteLlm, runDeporteAgentCore } from "./shared";

const AGENT_ID = "deporte-seo";

let inst: DeporteSEOAgent | null = null;

export class DeporteSEOAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): DeporteSEOAgent {
    if (!inst) inst = new DeporteSEOAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDeporteLlm();
  }

  async run(input: DeporteInput): Promise<DeporteOutput> {
    const eliteRole = "Eres **Deporte SEO** — clubes y eventos.";
    const mission =
      "Diseña **SEO local** para clubes, sedes y **eventos deportivos** (calendario, resultados, FAQs acceso).";
    const fewShot =
      '{"result":"Pilar calendario + landings partido","score":92,"recommendations":["Schema Event","Google Business perfil"]}';
    return runDeporteAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getDeporteSEOAgent(): DeporteSEOAgent {
  return DeporteSEOAgent.instance();
}

export function resetDeporteSEOAgentForTests(): void {
  inst = null;
}
