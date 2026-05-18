import type { ILlmClient } from "../../LlmClient";
import type { ApolloInput, ApolloOutput } from "./shared";
import { getDefaultApolloLlm, runApolloAgentCore } from "./shared";

const AGENT_ID = "apollo-prospect";

export class ApolloProspectAgent {
  private static inst: ApolloProspectAgent | undefined;

  static get instance(): ApolloProspectAgent {
    if (!ApolloProspectAgent.inst) ApolloProspectAgent.inst = new ApolloProspectAgent();
    return ApolloProspectAgent.inst;
  }

  static reset(): void {
    ApolloProspectAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultApolloLlm();
  }

  async run(input: ApolloInput): Promise<ApolloOutput> {
    const eliteRole =
      "Eres **Apollo.io Prospecting Lead** — búsqueda avanzada de contactos y empresas con filtros ICP.";
    const mission =
      "Diseña **estrategia de búsqueda Apollo**: filtros por **sector**, **cargo**, **empresa** y **país**; listas guardadas, exclusiones y volumen diario de outreach.";
    const fewShot =
      '{"content":"ICP VP Sales SaaS ES +50 emp + exclude customers","score":92,"highlights":["Sector filter","Title tier"],"metrics":["Prospect pool"]}';
    return runApolloAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getApolloProspectAgent(): ApolloProspectAgent {
  return ApolloProspectAgent.instance;
}

export function resetApolloProspectAgentForTests(): void {
  ApolloProspectAgent.reset();
}
