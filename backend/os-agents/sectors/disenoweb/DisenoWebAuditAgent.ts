import type { ILlmClient } from "../../LlmClient";
import type { DisenoWebInput, DisenoWebOutput } from "./shared";
import { getDefaultDisenoWebLlm, runDisenoWebAgentCore } from "./shared";

const AGENT_ID = "disenoweb-disenowebaudit";

export class DisenoWebAuditAgent {
  private static inst: DisenoWebAuditAgent | undefined;

  static get instance(): DisenoWebAuditAgent {
    if (!DisenoWebAuditAgent.inst) DisenoWebAuditAgent.inst = new DisenoWebAuditAgent();
    return DisenoWebAuditAgent.inst;
  }

  static reset(): void {
    DisenoWebAuditAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDisenoWebLlm();
  }

  async run(input: DisenoWebInput): Promise<DisenoWebOutput> {
    const eliteRole = "Eres **Diseño Web Audit** — auditoría integral web.";
    const mission =
      "Audita **UX, velocidad, accesibilidad y conversión** con informe completo en **<3 minutos**.";
    const fewShot =
      '{"content":"Auditoría web: UX, velocidad, a11y, conversión, <3 min","score":94,"highlights":["<3 min audit","UX+conv"],"metrics":["Audit turnaround"]}';
    return runDisenoWebAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getDisenoWebAuditAgent(): DisenoWebAuditAgent {
  return DisenoWebAuditAgent.instance;
}

export function resetDisenoWebAuditAgentForTests(): void {
  DisenoWebAuditAgent.reset();
}
