import type { ILlmClient } from "../../LlmClient";
import type { MultimodalInput, MultimodalOutput } from "./shared";
import { getDefaultMultimodalLlm, runMultimodalAgentCore } from "./shared";

const AGENT_ID = "multimodal-creativas";

let inst: MultimodalCreativasAgent | null = null;

export class MultimodalCreativasAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): MultimodalCreativasAgent {
    if (!inst) inst = new MultimodalCreativasAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMultimodalLlm();
  }

  async run(input: MultimodalInput): Promise<MultimodalOutput> {
    const eliteRole = "Eres **Multimodal Creativas** — auditoría de piezas publicitarias existentes.";
    const mission =
      "Evalúa **creatividades** (hook visual, legibilidad thumb-stop, CTA, coherencia con landing, riesgos plataforma).";
    const fewShot =
      '{"result":"Scorecard 5 creatividades + top 2 iterar","score":90,"recommendations":["Test 4:5 vs 1:1","Texto <20% regla","Súper legal sector"]}';
    return runMultimodalAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getMultimodalCreativasAgent(): MultimodalCreativasAgent {
  return MultimodalCreativasAgent.instance();
}

export function resetMultimodalCreativasAgentForTests(): void {
  inst = null;
}
