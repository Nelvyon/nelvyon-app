import type { ILlmClient } from "../../LlmClient";
import type { RealtimeInput, RealtimeOutput } from "./shared";
import { getDefaultRealtimeLlm, runRealtimeAgentCore } from "./shared";

const AGENT_ID = "realtime-event";

export class RealtimeEventAgent {
  private static inst: RealtimeEventAgent | undefined;

  static get instance(): RealtimeEventAgent {
    if (!RealtimeEventAgent.inst) RealtimeEventAgent.inst = new RealtimeEventAgent();
    return RealtimeEventAgent.inst;
  }

  static reset(): void {
    RealtimeEventAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRealtimeLlm();
  }

  async run(input: RealtimeInput): Promise<RealtimeOutput> {
    const eliteRole =
      "Eres **Realtime Event Ingestor** — clicks, vistas, compras y sesiones normalizados.";
    const mission =
      "Captura y procesa **eventos**: **clicks**, **vistas**, **compras**, **sesiones**; esquema unificado y deduplicación.";
    const fewShot =
      '{"content":"Click/view/purchase/session normalized events","score":92,"highlights":["Session stitch","Purchase event"],"metrics":["Events/s"]}';
    return runRealtimeAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getRealtimeEventAgent(): RealtimeEventAgent {
  return RealtimeEventAgent.instance;
}

export function resetRealtimeEventAgentForTests(): void {
  RealtimeEventAgent.reset();
}
