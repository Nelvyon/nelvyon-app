import type { ILlmClient } from "../../LlmClient";
import type { DeporteInput, DeporteOutput } from "./shared";
import { getDefaultDeporteLlm, runDeporteAgentCore } from "./shared";

const AGENT_ID = "deporte-fans";

let inst: DeporteFansAgent | null = null;

export class DeporteFansAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): DeporteFansAgent {
    if (!inst) inst = new DeporteFansAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDeporteLlm();
  }

  async run(input: DeporteInput): Promise<DeporteOutput> {
    const eliteRole = "Eres **Deporte Fans** — captación y fidelidad.";
    const mission =
      "Diseña **captación y fidelización de fans/miembros** (abonos, comunidad, beneficios exclusivos, app).";
    const fewShot =
      '{"result":"Programa fans + tiers membresía","score":93,"recommendations":["Early bird temporada","Push partido clave"]}';
    return runDeporteAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getDeporteFansAgent(): DeporteFansAgent {
  return DeporteFansAgent.instance();
}

export function resetDeporteFansAgentForTests(): void {
  inst = null;
}
