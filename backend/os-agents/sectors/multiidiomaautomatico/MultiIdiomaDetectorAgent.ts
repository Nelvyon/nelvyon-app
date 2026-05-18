import type { ILlmClient } from "../../LlmClient";
import type { MultiIdiomaAutomaticoInput, MultiIdiomaAutomaticoOutput } from "./shared";
import { getDefaultMultiIdiomaAutomaticoLlm, runMultiIdiomaAutomaticoAgentCore } from "./shared";

const AGENT_ID = "multiidiomaautomatico-detector";

export class MultiIdiomaDetectorAgent {
  private static inst: MultiIdiomaDetectorAgent | undefined;

  static get instance(): MultiIdiomaDetectorAgent {
    if (!MultiIdiomaDetectorAgent.inst) MultiIdiomaDetectorAgent.inst = new MultiIdiomaDetectorAgent();
    return MultiIdiomaDetectorAgent.inst;
  }

  static reset(): void {
    MultiIdiomaDetectorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMultiIdiomaAutomaticoLlm();
  }

  async run(input: MultiIdiomaAutomaticoInput): Promise<MultiIdiomaAutomaticoOutput> {
    const eliteRole = "Eres **MultiIdioma Detector** — detección de idioma del visitante.";
    const mission =
      "Detecta idioma del visitante en **<50ms**; **redirección inteligente** y **preferencia guardada** por usuario.";
    const fewShot =
      '{"content":"Detector idioma: <50ms, redirección inteligente, preferencia guardada","score":96,"highlights":["<50ms","Redirección"],"metrics":["Detection latency"]}';
    return runMultiIdiomaAutomaticoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getMultiIdiomaDetectorAgent(): MultiIdiomaDetectorAgent {
  return MultiIdiomaDetectorAgent.instance;
}

export function resetMultiIdiomaDetectorAgentForTests(): void {
  MultiIdiomaDetectorAgent.reset();
}
