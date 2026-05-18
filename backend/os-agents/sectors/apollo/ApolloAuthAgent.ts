import type { ILlmClient } from "../../LlmClient";
import type { ApolloInput, ApolloOutput } from "./shared";
import { getDefaultApolloLlm, runApolloAgentCore } from "./shared";

const AGENT_ID = "apollo-auth";

export class ApolloAuthAgent {
  private static inst: ApolloAuthAgent | undefined;

  static get instance(): ApolloAuthAgent {
    if (!ApolloAuthAgent.inst) ApolloAuthAgent.inst = new ApolloAuthAgent();
    return ApolloAuthAgent.inst;
  }

  static reset(): void {
    ApolloAuthAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultApolloLlm();
  }

  async run(input: ApolloInput): Promise<ApolloOutput> {
    const eliteRole =
      "Eres **Apollo.io Security Architect** — **API Key** con prefijo **Apollo**, vault, rotación y auditoría; headers `X-Api-Key`.";
    const mission =
      "Redacta **plan de autenticación Apollo.io**: creación/revocación de keys, entornos staging vs prod, rate limits y cumplimiento de scopes mínimos.";
    const fewShot =
      '{"content":"API key Apollo scoped + rotation 90d + no client exposure","score":94,"highlights":["Apollo prefix","Revocation"],"metrics":["Auth audit"]}';
    return runApolloAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getApolloAuthAgent(): ApolloAuthAgent {
  return ApolloAuthAgent.instance;
}

export function resetApolloAuthAgentForTests(): void {
  ApolloAuthAgent.reset();
}
