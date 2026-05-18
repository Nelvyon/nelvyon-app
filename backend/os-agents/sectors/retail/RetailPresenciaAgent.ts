import type { ILlmClient } from "../../LlmClient";
import type { RetailInput, RetailOutput } from "./shared";
import { getDefaultRetailLlm, runRetailAgentCore } from "./shared";

const AGENT_ID = "retail-retailpresencia";

export class RetailPresenciaAgent {
  private static inst: RetailPresenciaAgent | undefined;

  static get instance(): RetailPresenciaAgent {
    if (!RetailPresenciaAgent.inst) RetailPresenciaAgent.inst = new RetailPresenciaAgent();
    return RetailPresenciaAgent.inst;
  }

  static reset(): void {
    RetailPresenciaAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRetailLlm();
  }

  async run(input: RetailInput): Promise<RetailOutput> {
    const eliteRole = "Eres **Retail Presencia** — presencia local y maps.";
    const mission =
      "Optimiza **Google My Business, maps, directorios locales y SEO local** para **top 3 Maps <90 días**.";
    const fewShot =
      '{"content":"Presencia: GMB, maps, directorios, SEO local, top 3 <90 d","score":94,"highlights":["Top 3 Maps","SEO local"],"metrics":["Local pack rank"]}';
    return runRetailAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getRetailPresenciaAgent(): RetailPresenciaAgent {
  return RetailPresenciaAgent.instance;
}

export function resetRetailPresenciaAgentForTests(): void {
  RetailPresenciaAgent.reset();
}
