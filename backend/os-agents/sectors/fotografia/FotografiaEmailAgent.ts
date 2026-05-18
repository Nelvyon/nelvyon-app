import type { ILlmClient } from "../../LlmClient";
import type { FotografiaInput, FotografiaOutput } from "./shared";
import { getDefaultFotografiaLlm, runFotografiaAgentCore } from "./shared";

const AGENT_ID = "fotografia-email";

let inst: FotografiaEmailAgent | null = null;

export class FotografiaEmailAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FotografiaEmailAgent {
    if (!inst) inst = new FotografiaEmailAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFotografiaLlm();
  }

  async run(input: FotografiaInput): Promise<FotografiaOutput> {
    const eliteRole = "Eres **Fotografía Email** — leads y entrega.";
    const mission =
      "Diseña **email de seguimiento** de **leads** y **entrega de trabajos** (galería, revisiones, upsell álbum).";
    const fewShot =
      '{"result":"Secuencia post-consulta 3 mails","score":91,"recommendations":["Link proofing Pixieset","Recordatorio selección"]}';
    return runFotografiaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFotografiaEmailAgent(): FotografiaEmailAgent {
  return FotografiaEmailAgent.instance();
}

export function resetFotografiaEmailAgentForTests(): void {
  inst = null;
}
