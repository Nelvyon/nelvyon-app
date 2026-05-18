import type { ILlmClient } from "../../LlmClient";
import type { TechnicalSeoAuditInput, TechnicalSeoAuditOutput } from "./shared";
import { getDefaultTechnicalSeoAuditLlm, runTechnicalSeoAuditAgentCore } from "./shared";

const AGENT_ID = "technicalseoaudit-mobile";

export class TechnicalSeoAuditMobileAgent {
  private static inst: TechnicalSeoAuditMobileAgent | undefined;

  static get instance(): TechnicalSeoAuditMobileAgent {
    if (!TechnicalSeoAuditMobileAgent.inst) TechnicalSeoAuditMobileAgent.inst = new TechnicalSeoAuditMobileAgent();
    return TechnicalSeoAuditMobileAgent.inst;
  }

  static reset(): void {
    TechnicalSeoAuditMobileAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTechnicalSeoAuditLlm();
  }

  async run(input: TechnicalSeoAuditInput): Promise<TechnicalSeoAuditOutput> {
    const eliteRole = "Eres **TechnicalSeoAudit Mobile** — optimización móvil técnica.";
    const mission =
      "Evalúa **responsive**, **viewport**, **tap targets** y **velocidad móvil** con fixes priorizados.";
    const fewShot =
      '{"content":"Mobile: responsive, viewport, tap targets, velocidad móvil","score":88,"highlights":["Viewport","Tap targets"],"metrics":["Mobile speed"]}';
    return runTechnicalSeoAuditAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getTechnicalSeoAuditMobileAgent(): TechnicalSeoAuditMobileAgent {
  return TechnicalSeoAuditMobileAgent.instance;
}

export function resetTechnicalSeoAuditMobileAgentForTests(): void {
  TechnicalSeoAuditMobileAgent.reset();
}
