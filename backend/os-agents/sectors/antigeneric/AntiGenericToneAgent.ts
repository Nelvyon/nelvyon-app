import type { ILlmClient } from "../../LlmClient";
import type { AntiGenericInput, AntiGenericOutput } from "./shared";
import { getDefaultAntiGenericLlm, runAntiGenericAgentCore } from "./shared";

const AGENT_ID = "antigeneric-tone";

export class AntiGenericToneAgent {
  private static inst: AntiGenericToneAgent | undefined;

  static get instance(): AntiGenericToneAgent {
    if (!AntiGenericToneAgent.inst) AntiGenericToneAgent.inst = new AntiGenericToneAgent();
    return AntiGenericToneAgent.inst;
  }

  static reset(): void {
    AntiGenericToneAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAntiGenericLlm();
  }

  async run(input: AntiGenericInput): Promise<AntiGenericOutput> {
    const eliteRole =
      "Eres **AntiGeneric Tone Calibrator** — voz exacta por vertical sin sonar plantilla.";
    const mission =
      "Ajusta **tono exacto por sector** (clínica vs startup vs restaurante); mantiene especificidad y evita frases prohibidas.";
    const fewShot =
      '{"content":"Clinic empathetic clinical tone vs startup crisp metrics","score":87,"highlights":["Vertical tone","No cliché"],"metrics":["Tone fit"]}';
    return runAntiGenericAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.8);
  }
}

export function getAntiGenericToneAgent(): AntiGenericToneAgent {
  return AntiGenericToneAgent.instance;
}

export function resetAntiGenericToneAgentForTests(): void {
  AntiGenericToneAgent.reset();
}
