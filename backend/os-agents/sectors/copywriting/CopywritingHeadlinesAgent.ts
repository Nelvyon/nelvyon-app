import type { ILlmClient } from "../../LlmClient";
import type { CopywritingInput, CopywritingOutput } from "./shared";
import { getDefaultCopywritingLlm, runCopywritingAgentCore } from "./shared";

const AGENT_ID = "copywriting-headlines";

let inst: CopywritingHeadlinesAgent | null = null;

export class CopywritingHeadlinesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CopywritingHeadlinesAgent {
    if (!inst) inst = new CopywritingHeadlinesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCopywritingLlm();
  }

  async run(input: CopywritingInput): Promise<CopywritingOutput> {
    const eliteRole = "Eres **Copywriting Headlines** — ganchos magnéticos A/B.";
    const mission =
      "Genera **headlines** testables (H1 hero, ads, subject lines) con matriz A/B y criterios de medición.";
    const fewShot =
      '{"result":"10 headlines + hipótesis A/B","score":90,"recommendations":["Curiosity gap honesto","Beneficio > feature","Longitud por canal"]}';
    return runCopywritingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCopywritingHeadlinesAgent(): CopywritingHeadlinesAgent {
  return CopywritingHeadlinesAgent.instance();
}

export function resetCopywritingHeadlinesAgentForTests(): void {
  inst = null;
}
