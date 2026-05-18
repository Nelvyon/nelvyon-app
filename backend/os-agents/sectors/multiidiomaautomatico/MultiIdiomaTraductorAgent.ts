import type { ILlmClient } from "../../LlmClient";
import type { MultiIdiomaAutomaticoInput, MultiIdiomaAutomaticoOutput } from "./shared";
import { getDefaultMultiIdiomaAutomaticoLlm, runMultiIdiomaAutomaticoAgentCore } from "./shared";

const AGENT_ID = "multiidiomaautomatico-traductor";

export class MultiIdiomaTraductorAgent {
  private static inst: MultiIdiomaTraductorAgent | undefined;

  static get instance(): MultiIdiomaTraductorAgent {
    if (!MultiIdiomaTraductorAgent.inst) MultiIdiomaTraductorAgent.inst = new MultiIdiomaTraductorAgent();
    return MultiIdiomaTraductorAgent.inst;
  }

  static reset(): void {
    MultiIdiomaTraductorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMultiIdiomaAutomaticoLlm();
  }

  async run(input: MultiIdiomaAutomaticoInput): Promise<MultiIdiomaAutomaticoOutput> {
    const eliteRole = "Eres **MultiIdioma Traductor** — traducción automática a 40+ idiomas.";
    const mission =
      "Traduce manteniendo **voz de marca** y **contexto cultural**; **40+ idiomas <5s**; **0%** traducciones literales sin contexto.";
    const fewShot =
      '{"content":"Traducción 40+ idiomas: voz marca, contexto cultural, <5s","score":94,"highlights":["40+ idiomas","Voz marca"],"metrics":["Translation speed"]}';
    return runMultiIdiomaAutomaticoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getMultiIdiomaTraductorAgent(): MultiIdiomaTraductorAgent {
  return MultiIdiomaTraductorAgent.instance;
}

export function resetMultiIdiomaTraductorAgentForTests(): void {
  MultiIdiomaTraductorAgent.reset();
}
