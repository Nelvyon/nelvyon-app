import type { ILlmClient } from "../../LlmClient";
import type { DeporteInput, DeporteOutput } from "./shared";
import { getDefaultDeporteLlm, runDeporteAgentCore } from "./shared";

const AGENT_ID = "deporte-precios";

let inst: DeportePreciosAgent | null = null;

export class DeportePreciosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): DeportePreciosAgent {
    if (!inst) inst = new DeportePreciosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDeporteLlm();
  }

  async run(input: DeporteInput): Promise<DeporteOutput> {
    const eliteRole = "Eres **Deporte Precios** — membresías y ticketing.";
    const mission =
      "Diseña **pricing de membresías, entradas y merchandising** (bundles familia, VIP, drops limitados).";
    const fewShot =
      '{"result":"Matriz precios tribuna + fan shop","score":91,"recommendations":["Dynamic pricing rival","Pack merch+entrada"]}';
    return runDeporteAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getDeportePreciosAgent(): DeportePreciosAgent {
  return DeportePreciosAgent.instance();
}

export function resetDeportePreciosAgentForTests(): void {
  inst = null;
}
