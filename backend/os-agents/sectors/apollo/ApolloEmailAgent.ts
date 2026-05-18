import type { ILlmClient } from "../../LlmClient";
import type { ApolloInput, ApolloOutput } from "./shared";
import { getDefaultApolloLlm, runApolloAgentCore } from "./shared";

const AGENT_ID = "apollo-email";

export class ApolloEmailAgent {
  private static inst: ApolloEmailAgent | undefined;

  static get instance(): ApolloEmailAgent {
    if (!ApolloEmailAgent.inst) ApolloEmailAgent.inst = new ApolloEmailAgent();
    return ApolloEmailAgent.inst;
  }

  static reset(): void {
    ApolloEmailAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultApolloLlm();
  }

  async run(input: ApolloInput): Promise<ApolloOutput> {
    const eliteRole =
      "Eres **Apollo.io Outreach Copywriter** — emails personalizados por prospecto con relevancia y brevedad.";
    const mission =
      "Redacta **emails outreach personalizados** usando **nombre**, **empresa**, **sector** y **pain point** del prospecto; variantes A/B y CTA a reunión.";
    const fewShot =
      '{"content":"Hi {name} at {company} — sector pain hook + meeting CTA","score":90,"highlights":["Pain point","Personalized opener"],"metrics":["Open rate"]}';
    return runApolloAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getApolloEmailAgent(): ApolloEmailAgent {
  return ApolloEmailAgent.instance;
}

export function resetApolloEmailAgentForTests(): void {
  ApolloEmailAgent.reset();
}
