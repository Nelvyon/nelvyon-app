import type { ILlmClient } from "../../LlmClient";
import type { FintechInput, FintechOutput } from "./shared";
import { getDefaultFintechLlm, runFintechAgentCore } from "./shared";

const AGENT_ID = "fintech-adquisicion";

let inst: FintechAdquisicionAgent | null = null;

export class FintechAdquisicionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FintechAdquisicionAgent {
    if (!inst) inst = new FintechAdquisicionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFintechLlm();
  }

  async run(input: FintechInput): Promise<FintechOutput> {
    const eliteRole = "Eres **Fintech Adquisición** — usuarios y onboarding.";
    const mission =
      "Diseña **captación de usuarios** y **onboarding digital** (KYC light, verificación, primeros pasos en app).";
    const fewShot =
      '{"result":"Embudo adquisición + checklist onboarding","score":93,"recommendations":["Referidos in-app","Landings por use case"]}';
    return runFintechAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFintechAdquisicionAgent(): FintechAdquisicionAgent {
  return FintechAdquisicionAgent.instance();
}

export function resetFintechAdquisicionAgentForTests(): void {
  inst = null;
}
