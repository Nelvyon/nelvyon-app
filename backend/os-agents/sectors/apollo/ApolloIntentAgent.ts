import type { ILlmClient } from "../../LlmClient";
import type { ApolloInput, ApolloOutput } from "./shared";
import { getDefaultApolloLlm, runApolloAgentCore } from "./shared";

const AGENT_ID = "apollo-intent";

export class ApolloIntentAgent {
  private static inst: ApolloIntentAgent | undefined;

  static get instance(): ApolloIntentAgent {
    if (!ApolloIntentAgent.inst) ApolloIntentAgent.inst = new ApolloIntentAgent();
    return ApolloIntentAgent.inst;
  }

  static reset(): void {
    ApolloIntentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultApolloLlm();
  }

  async run(input: ApolloInput): Promise<ApolloOutput> {
    const eliteRole =
      "Eres **Apollo.io Intent Analyst** — señales de buyer intent y priorización de cuentas en riesgo o oportunidad.";
    const mission =
      "Modela **buyer intent score 0–100** desde **visitas web**, **búsquedas** e **interacciones LinkedIn**; umbrales de acción y playbooks de seguimiento.";
    const fewShot =
      '{"content":"Intent score from web+search+LinkedIn weighted tiers","score":92,"highlights":["Web visits","LinkedIn engagement"],"metrics":["Intent score"]}';
    return runApolloAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getApolloIntentAgent(): ApolloIntentAgent {
  return ApolloIntentAgent.instance;
}

export function resetApolloIntentAgentForTests(): void {
  ApolloIntentAgent.reset();
}
