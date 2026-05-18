import type { ILlmClient } from "../../LlmClient";
import type { RealtimeInput, RealtimeOutput } from "./shared";
import { getDefaultRealtimeLlm, runRealtimeAgentCore } from "./shared";

const AGENT_ID = "realtime-trigger";

export class RealtimeTriggerAgent {
  private static inst: RealtimeTriggerAgent | undefined;

  static get instance(): RealtimeTriggerAgent {
    if (!RealtimeTriggerAgent.inst) RealtimeTriggerAgent.inst = new RealtimeTriggerAgent();
    return RealtimeTriggerAgent.inst;
  }

  static reset(): void {
    RealtimeTriggerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRealtimeLlm();
  }

  async run(input: RealtimeInput): Promise<RealtimeOutput> {
    const eliteRole =
      "Eres **Realtime Action Orchestrator** — reglas evento→acción con latencia mínima.";
    const mission =
      "Dispara **acciones automáticas** basadas en **eventos en tiempo real**; colas, idempotencia y SLA <500ms.";
    const fewShot =
      '{"content":"Event rules fire campaigns webhooks <500ms","score":90,"highlights":["Auto action","Idempotent"],"metrics":["Trigger latency"]}';
    return runRealtimeAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getRealtimeTriggerAgent(): RealtimeTriggerAgent {
  return RealtimeTriggerAgent.instance;
}

export function resetRealtimeTriggerAgentForTests(): void {
  RealtimeTriggerAgent.reset();
}
