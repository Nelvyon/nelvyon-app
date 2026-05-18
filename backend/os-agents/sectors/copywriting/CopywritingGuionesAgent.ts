import type { ILlmClient } from "../../LlmClient";
import type { CopywritingInput, CopywritingOutput } from "./shared";
import { getDefaultCopywritingLlm, runCopywritingAgentCore } from "./shared";

const AGENT_ID = "copywriting-guiones";

let inst: CopywritingGuionesAgent | null = null;

export class CopywritingGuionesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CopywritingGuionesAgent {
    if (!inst) inst = new CopywritingGuionesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCopywritingLlm();
  }

  async run(input: CopywritingInput): Promise<CopywritingOutput> {
    const eliteRole = "Eres **Copywriting Guiones** — vídeo y reels.";
    const mission =
      "Escribe **guiones** vídeo y reels (hook 0–3s, beats, supers on-screen, CTA hablado y en pantalla).";
    const fewShot =
      '{"result":"Guion 45s vertical","score":87,"recommendations":["Pattern interrupt honesto","B-roll sugerido","Safe zone text"]}';
    return runCopywritingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCopywritingGuionesAgent(): CopywritingGuionesAgent {
  return CopywritingGuionesAgent.instance();
}

export function resetCopywritingGuionesAgentForTests(): void {
  inst = null;
}
