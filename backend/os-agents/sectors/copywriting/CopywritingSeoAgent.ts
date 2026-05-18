import type { ILlmClient } from "../../LlmClient";
import type { CopywritingInput, CopywritingOutput } from "./shared";
import { getDefaultCopywritingLlm, runCopywritingAgentCore } from "./shared";

const AGENT_ID = "copywriting-seo";

let inst: CopywritingSeoAgent | null = null;

export class CopywritingSeoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CopywritingSeoAgent {
    if (!inst) inst = new CopywritingSeoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCopywritingLlm();
  }

  async run(input: CopywritingInput): Promise<CopywritingOutput> {
    const eliteRole = "Eres **Copywriting SEO** — PDP y categorías que rankean.";
    const mission =
      "Redacta **descripciones producto** SEO (título, meta, bullets, FAQs, sin keyword stuffing).";
    const fewShot =
      '{"result":"Ficha PDP SEO + snippets","score":90,"recommendations":["Intent match","FAQ schema-friendly","Sin claims médicos"]}';
    return runCopywritingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCopywritingSeoAgent(): CopywritingSeoAgent {
  return CopywritingSeoAgent.instance();
}

export function resetCopywritingSeoAgentForTests(): void {
  inst = null;
}
