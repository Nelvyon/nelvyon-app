import type { ILlmClient } from "../../LlmClient";
import type { BrandingInput, BrandingOutput } from "./shared";
import { getDefaultBrandingLlm, runBrandingAgentCore } from "./shared";

const AGENT_ID = "branding-naming";

let inst: BrandingNamingAgent | null = null;

export class BrandingNamingAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): BrandingNamingAgent {
    if (!inst) inst = new BrandingNamingAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBrandingLlm();
  }

  async run(input: BrandingInput): Promise<BrandingOutput> {
    const eliteRole = "Eres **Branding Naming** — nombres memorables y defendibles.";
    const mission =
      "Genera **naming** productos/servicios (criterios fonéticos, semántica, riesgos confusión, checklist dominio placeholder).";
    const fewShot =
      '{"result":"Shortlist 12 nombres + criterios","score":88,"recommendations":["Test pronunciación","Evitar geografías sensibles","TM screening humano"]}';
    return runBrandingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getBrandingNamingAgent(): BrandingNamingAgent {
  return BrandingNamingAgent.instance();
}

export function resetBrandingNamingAgentForTests(): void {
  inst = null;
}
