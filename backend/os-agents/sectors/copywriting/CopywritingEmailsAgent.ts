import type { ILlmClient } from "../../LlmClient";
import type { CopywritingInput, CopywritingOutput } from "./shared";
import { getDefaultCopywritingLlm, runCopywritingAgentCore } from "./shared";

const AGENT_ID = "copywriting-emails";

let inst: CopywritingEmailsAgent | null = null;

export class CopywritingEmailsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CopywritingEmailsAgent {
    if (!inst) inst = new CopywritingEmailsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCopywritingLlm();
  }

  async run(input: CopywritingInput): Promise<CopywritingOutput> {
    const eliteRole = "Eres **Copywriting Emails** — secuencias que cierran.";
    const mission =
      "Diseña **emails de venta** y secuencias completas (cadencia, storytelling micro, P.S., reactivación).";
    const fewShot =
      '{"result":"Secuencia 5 toques cold→warm","score":91,"recommendations":["Una idea por email","Preview text","CTA repetido coherente"]}';
    return runCopywritingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCopywritingEmailsAgent(): CopywritingEmailsAgent {
  return CopywritingEmailsAgent.instance();
}

export function resetCopywritingEmailsAgentForTests(): void {
  inst = null;
}
