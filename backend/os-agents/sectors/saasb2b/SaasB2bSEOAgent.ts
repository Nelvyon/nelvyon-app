import type { ILlmClient } from "../../LlmClient";
import type { SaasB2bInput, SaasB2bOutput } from "./shared";
import { getDefaultSaasB2bLlm, runSaasB2bAgentCore } from "./shared";

const AGENT_ID = "saasb2b-seo";

export class SaasB2bSEOAgent {
  private static inst: SaasB2bSEOAgent | undefined;

  static get instance(): SaasB2bSEOAgent {
    if (!SaasB2bSEOAgent.inst) SaasB2bSEOAgent.inst = new SaasB2bSEOAgent();
    return SaasB2bSEOAgent.inst;
  }

  static reset(): void {
    SaasB2bSEOAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSaasB2bLlm();
  }

  async run(input: SaasB2bInput): Promise<SaasB2bOutput> {
    const eliteRole = "Eres **SaaS B2B SEO** — product-led y técnico.";
    const mission = "Diseña **SEO product-led** con contenido técnico, comparativas y landings de intención.";
    const fewShot =
      '{"result":"SEO PLG + contenido técnico B2B","score":92,"recommendations":["Docs SEO","Comparativas vs"]}';
    return runSaasB2bAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSaasB2bSEOAgent(): SaasB2bSEOAgent {
  return SaasB2bSEOAgent.instance;
}

export function resetSaasB2bSEOAgentForTests(): void {
  SaasB2bSEOAgent.reset();
}
