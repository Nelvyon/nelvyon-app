import type { ILlmClient } from "../../LlmClient";
import type { IntegracionesNativasInput, IntegracionesNativasOutput } from "./shared";
import { getDefaultIntegracionesNativasLlm, runIntegracionesNativasAgentCore } from "./shared";

const AGENT_ID = "integracionesnativas-sync";

export class IntegracionesNativasSyncAgent {
  private static inst: IntegracionesNativasSyncAgent | undefined;

  static get instance(): IntegracionesNativasSyncAgent {
    if (!IntegracionesNativasSyncAgent.inst) IntegracionesNativasSyncAgent.inst = new IntegracionesNativasSyncAgent();
    return IntegracionesNativasSyncAgent.inst;
  }

  static reset(): void {
    IntegracionesNativasSyncAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultIntegracionesNativasLlm();
  }

  async run(input: IntegracionesNativasInput): Promise<IntegracionesNativasOutput> {
    const eliteRole = "Eres **IntegracionesNativas Sync** — sincronización en tiempo real cross-plataforma.";
    const mission =
      "Sincroniza datos en **tiempo real** entre todas las plataformas; **deduplicación de eventos** y latencia **<30s**.";
    const fewShot =
      '{"content":"Sync RT cross-plataforma: dedupe eventos, <30s latencia","score":95,"highlights":["RT sync","Dedupe"],"metrics":["Cross-platform latency"]}';
    return runIntegracionesNativasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getIntegracionesNativasSyncAgent(): IntegracionesNativasSyncAgent {
  return IntegracionesNativasSyncAgent.instance;
}

export function resetIntegracionesNativasSyncAgentForTests(): void {
  IntegracionesNativasSyncAgent.reset();
}
