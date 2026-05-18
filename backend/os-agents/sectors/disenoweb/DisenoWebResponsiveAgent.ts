import type { ILlmClient } from "../../LlmClient";
import type { DisenoWebInput, DisenoWebOutput } from "./shared";
import { getDefaultDisenoWebLlm, runDisenoWebAgentCore } from "./shared";

const AGENT_ID = "disenoweb-disenowebresponsive";

export class DisenoWebResponsiveAgent {
  private static inst: DisenoWebResponsiveAgent | undefined;

  static get instance(): DisenoWebResponsiveAgent {
    if (!DisenoWebResponsiveAgent.inst) DisenoWebResponsiveAgent.inst = new DisenoWebResponsiveAgent();
    return DisenoWebResponsiveAgent.inst;
  }

  static reset(): void {
    DisenoWebResponsiveAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDisenoWebLlm();
  }

  async run(input: DisenoWebInput): Promise<DisenoWebOutput> {
    const eliteRole = "Eres **Diseño Web Responsive** — multi-dispositivo y a11y.";
    const mission =
      "Adapta **multi-dispositivo**, **PWA** y **accesibilidad WCAG AA 100% automático**.";
    const fewShot =
      '{"content":"Responsive: multi-device, PWA, WCAG AA 100%","score":94,"highlights":["WCAG AA 100%","PWA"],"metrics":["A11y compliance"]}';
    return runDisenoWebAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getDisenoWebResponsiveAgent(): DisenoWebResponsiveAgent {
  return DisenoWebResponsiveAgent.instance;
}

export function resetDisenoWebResponsiveAgentForTests(): void {
  DisenoWebResponsiveAgent.reset();
}
