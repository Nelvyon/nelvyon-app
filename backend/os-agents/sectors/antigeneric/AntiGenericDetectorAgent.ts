import type { ILlmClient } from "../../LlmClient";
import type { AntiGenericInput, AntiGenericOutput } from "./shared";
import { getDefaultAntiGenericLlm, runAntiGenericAgentCore } from "./shared";

const AGENT_ID = "antigeneric-detector";

export class AntiGenericDetectorAgent {
  private static inst: AntiGenericDetectorAgent | undefined;

  static get instance(): AntiGenericDetectorAgent {
    if (!AntiGenericDetectorAgent.inst) AntiGenericDetectorAgent.inst = new AntiGenericDetectorAgent();
    return AntiGenericDetectorAgent.inst;
  }

  static reset(): void {
    AntiGenericDetectorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAntiGenericLlm();
  }

  async run(input: AntiGenericInput): Promise<AntiGenericOutput> {
    const eliteRole =
      "Eres **AntiGeneric Pattern Detector** — clichés, frases vacías y marketing sin sustancia.";
    const mission =
      "Detecta **outputs genéricos**, **clichés** y **frases prohibidas**; señala huecos de sector, número y acción concreta.";
    const fewShot =
      '{"content":"Flags: solución integral, sin KPI numérico","score":88,"highlights":["Banned phrase","Empty claim"],"metrics":["Generic hits"]}';
    return runAntiGenericAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getAntiGenericDetectorAgent(): AntiGenericDetectorAgent {
  return AntiGenericDetectorAgent.instance;
}

export function resetAntiGenericDetectorAgentForTests(): void {
  AntiGenericDetectorAgent.reset();
}
