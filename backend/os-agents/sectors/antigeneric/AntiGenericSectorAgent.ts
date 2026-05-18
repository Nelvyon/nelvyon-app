import type { ILlmClient } from "../../LlmClient";
import type { AntiGenericInput, AntiGenericOutput } from "./shared";
import { getDefaultAntiGenericLlm, runAntiGenericAgentCore } from "./shared";

const AGENT_ID = "antigeneric-sector";

export class AntiGenericSectorAgent {
  private static inst: AntiGenericSectorAgent | undefined;

  static get instance(): AntiGenericSectorAgent {
    if (!AntiGenericSectorAgent.inst) AntiGenericSectorAgent.inst = new AntiGenericSectorAgent();
    return AntiGenericSectorAgent.inst;
  }

  static reset(): void {
    AntiGenericSectorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAntiGenericLlm();
  }

  async run(input: AntiGenericInput): Promise<AntiGenericOutput> {
    const eliteRole =
      "Eres **AntiGeneric Sector Lexicon Validator** — terminología nativa del vertical.";
    const mission =
      "Valida que el output usa **terminología específica del sector** (no jerga genérica de marketing); glosario y anti-patrones por vertical.";
    const fewShot =
      '{"content":"Sector terms: occupancy rate not generic growth","score":90,"highlights":["Vertical lexicon","No fluff"],"metrics":["Term coverage"]}';
    return runAntiGenericAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getAntiGenericSectorAgent(): AntiGenericSectorAgent {
  return AntiGenericSectorAgent.instance;
}

export function resetAntiGenericSectorAgentForTests(): void {
  AntiGenericSectorAgent.reset();
}
