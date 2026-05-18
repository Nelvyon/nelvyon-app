import type { ILlmClient } from "../../LlmClient";
import type { CopywritingInput, CopywritingOutput } from "./shared";
import { getDefaultCopywritingLlm, runCopywritingAgentCore } from "./shared";

const AGENT_ID = "copywriting-storytelling";

let inst: CopywritingStorytellingAgent | null = null;

export class CopywritingStorytellingAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CopywritingStorytellingAgent {
    if (!inst) inst = new CopywritingStorytellingAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCopywritingLlm();
  }

  async run(input: CopywritingInput): Promise<CopywritingOutput> {
    const eliteRole = "Eres **Copywriting Storytelling** — narrativa de marca memorable.";
    const mission =
      "Construye **storytelling de marca** (origen, misión, conflicto resuelto, prueba social, voz coherente por segmento).";
    const fewShot =
      '{"result":"Brand story one-pager","score":91,"recommendations":["Héroe = cliente","Tensión honesta","CTA alineado valores"]}';
    return runCopywritingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCopywritingStorytellingAgent(): CopywritingStorytellingAgent {
  return CopywritingStorytellingAgent.instance();
}

export function resetCopywritingStorytellingAgentForTests(): void {
  inst = null;
}
