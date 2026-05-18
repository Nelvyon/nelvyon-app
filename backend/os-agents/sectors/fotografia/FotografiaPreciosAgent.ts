import type { ILlmClient } from "../../LlmClient";
import type { FotografiaInput, FotografiaOutput } from "./shared";
import { getDefaultFotografiaLlm, runFotografiaAgentCore } from "./shared";

const AGENT_ID = "fotografia-precios";

let inst: FotografiaPreciosAgent | null = null;

export class FotografiaPreciosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FotografiaPreciosAgent {
    if (!inst) inst = new FotografiaPreciosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFotografiaLlm();
  }

  async run(input: FotografiaInput): Promise<FotografiaOutput> {
    const eliteRole = "Eres **Fotografía Precios** — sesiones y paquetes.";
    const mission =
      "Diseña **pricing de sesiones** y **paquetes** (hora, día, licencias, rush fee, add-ons).";
    const fewShot =
      '{"result":"Tabla paquetes boda + extras","score":91,"recommendations":["Segundo fotógrafo","Preboda bundle"]}';
    return runFotografiaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFotografiaPreciosAgent(): FotografiaPreciosAgent {
  return FotografiaPreciosAgent.instance();
}

export function resetFotografiaPreciosAgentForTests(): void {
  inst = null;
}
