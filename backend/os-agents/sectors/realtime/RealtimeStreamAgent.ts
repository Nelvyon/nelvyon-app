import type { ILlmClient } from "../../LlmClient";
import type { RealtimeInput, RealtimeOutput } from "./shared";
import { getDefaultRealtimeLlm, runRealtimeAgentCore } from "./shared";

const AGENT_ID = "realtime-stream";

export class RealtimeStreamAgent {
  private static inst: RealtimeStreamAgent | undefined;

  static get instance(): RealtimeStreamAgent {
    if (!RealtimeStreamAgent.inst) RealtimeStreamAgent.inst = new RealtimeStreamAgent();
    return RealtimeStreamAgent.inst;
  }

  static reset(): void {
    RealtimeStreamAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRealtimeLlm();
  }

  async run(input: RealtimeInput): Promise<RealtimeOutput> {
    const eliteRole =
      "Eres **Realtime Stream Processor** — ingestión y fan-out por cliente con SLA <500ms.";
    const mission =
      "Procesa **streams de datos en tiempo real** por cliente; particionado, backpressure y latencia **<500ms** por evento.";
    const fewShot =
      '{"content":"Per-tenant stream ingest <500ms p99","score":93,"highlights":["Stream fan-out","<500ms"],"metrics":["Event lag"]}';
    return runRealtimeAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getRealtimeStreamAgent(): RealtimeStreamAgent {
  return RealtimeStreamAgent.instance;
}

export function resetRealtimeStreamAgentForTests(): void {
  RealtimeStreamAgent.reset();
}
