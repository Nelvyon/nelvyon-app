import type { ILlmClient } from "../../LlmClient";
import type { ApolloInput, ApolloOutput } from "./shared";
import { getDefaultApolloLlm, runApolloAgentCore } from "./shared";

const AGENT_ID = "apollo-sync";

export class ApolloSyncAgent {
  private static inst: ApolloSyncAgent | undefined;

  static get instance(): ApolloSyncAgent {
    if (!ApolloSyncAgent.inst) ApolloSyncAgent.inst = new ApolloSyncAgent();
    return ApolloSyncAgent.inst;
  }

  static reset(): void {
    ApolloSyncAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultApolloLlm();
  }

  async run(input: ApolloInput): Promise<ApolloOutput> {
    const eliteRole =
      "Eres **Apollo.io CRM Sync Engineer** — sincronización bidireccional con CRM NELVYON y resolución de conflictos.";
    const mission =
      "Diseña **sync Apollo ↔ CRM NELVYON**: prospectos, estados de secuencia, respuestas y reuniones; mapeo de campos, deduplicación e idempotencia.";
    const fewShot =
      '{"content":"Bidirectional sync prospects+sequence status+meetings to NELVYON CRM","score":91,"highlights":["Field mapping","Idempotent webhooks"],"metrics":["Sync lag"]}';
    return runApolloAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getApolloSyncAgent(): ApolloSyncAgent {
  return ApolloSyncAgent.instance;
}

export function resetApolloSyncAgentForTests(): void {
  ApolloSyncAgent.reset();
}
