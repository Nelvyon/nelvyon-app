import type { ILlmClient } from "../../LlmClient";
import type { CopywritingInput, CopywritingOutput } from "./shared";
import { getDefaultCopywritingLlm, runCopywritingAgentCore } from "./shared";

const AGENT_ID = "copywriting-landing";

let inst: CopywritingLandingAgent | null = null;

export class CopywritingLandingAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CopywritingLandingAgent {
    if (!inst) inst = new CopywritingLandingAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCopywritingLlm();
  }

  async run(input: CopywritingInput): Promise<CopywritingOutput> {
    const eliteRole = "Eres **Copywriting Landing** — LP que escanea y convierte.";
    const mission =
      "Redacta **landing completa** (hero, subcopy, bullets prueba, FAQ, objeciones, sticky CTA, footer legal placeholder).";
    const fewShot =
      '{"result":"Wire copy LP long-form","score":89,"recommendations":["Above fold 5s test","Social proof con números","FAQ 5 preguntas"]}';
    return runCopywritingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCopywritingLandingAgent(): CopywritingLandingAgent {
  return CopywritingLandingAgent.instance();
}

export function resetCopywritingLandingAgentForTests(): void {
  inst = null;
}
