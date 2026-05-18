import type { ILlmClient } from "../../LlmClient";
import type { ManufacturaInput, ManufacturaOutput } from "./shared";
import { getDefaultManufacturaLlm, runManufacturaAgentCore } from "./shared";

const AGENT_ID = "manufactura-seo";

let inst: ManufacturaSEOAgent | null = null;

export class ManufacturaSEOAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ManufacturaSEOAgent {
    if (!inst) inst = new ManufacturaSEOAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultManufacturaLlm();
  }

  async run(input: ManufacturaInput): Promise<ManufacturaOutput> {
    const eliteRole = "Eres **Manufactura SEO** — técnico industrial y ferias.";
    const mission =
      "Diseña **SEO técnico industrial** (datasheets, normativas genéricas) y **visibilidad alrededor de ferias** y eventos.";
    const fewShot =
      '{"result":"Pilar producto + calendario ferias","score":92,"recommendations":["Schema producto industrial","Landings post-fair"]}';
    return runManufacturaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getManufacturaSEOAgent(): ManufacturaSEOAgent {
  return ManufacturaSEOAgent.instance();
}

export function resetManufacturaSEOAgentForTests(): void {
  inst = null;
}
