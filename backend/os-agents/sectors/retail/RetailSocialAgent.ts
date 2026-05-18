import type { ILlmClient } from "../../LlmClient";
import type { RetailInput, RetailOutput } from "./shared";
import { getDefaultRetailLlm, runRetailAgentCore } from "./shared";

const AGENT_ID = "retail-retailsocial";

export class RetailSocialAgent {
  private static inst: RetailSocialAgent | undefined;

  static get instance(): RetailSocialAgent {
    if (!RetailSocialAgent.inst) RetailSocialAgent.inst = new RetailSocialAgent();
    return RetailSocialAgent.inst;
  }

  static reset(): void {
    RetailSocialAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRetailLlm();
  }

  async run(input: RetailInput): Promise<RetailOutput> {
    const eliteRole = "Eres **Retail Social** — RRSS y ofertas flash.";
    const mission =
      "Genera **contenido RRSS automático**, **ofertas flash** y **reels de productos**.";
    const fewShot =
      '{"content":"Social: RRSS auto, flash, reels productos","score":93,"highlights":["Ofertas flash","Reels"],"metrics":["Social engagement"]}';
    return runRetailAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getRetailSocialAgent(): RetailSocialAgent {
  return RetailSocialAgent.instance;
}

export function resetRetailSocialAgentForTests(): void {
  RetailSocialAgent.reset();
}
