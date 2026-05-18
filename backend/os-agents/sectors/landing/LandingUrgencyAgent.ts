import type { ILlmClient } from "../../LlmClient";
import type { LandingInput, LandingOutput } from "./shared";
import { getDefaultLandingLlm, runLandingAgentCore } from "./shared";

const AGENT_ID = "landing-urgency";

export class LandingUrgencyAgent {
  private static inst: LandingUrgencyAgent | undefined;

  static get instance(): LandingUrgencyAgent {
    if (!LandingUrgencyAgent.inst) LandingUrgencyAgent.inst = new LandingUrgencyAgent();
    return LandingUrgencyAgent.inst;
  }

  static reset(): void {
    LandingUrgencyAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultLandingLlm();
  }

  async run(input: LandingInput): Promise<LandingOutput> {
    return runLandingAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Conversion UX copy top 1%; urgencia ética sin mentiras sobre stock o plazos.",
        mission:
          "Crea elementos de urgencia y escasez verificables (cupos, fecha fin, bonus); disclaimer si es hipotético.",
        fewShotExample:
          "Input: lanzamiento cohorte. Output JSON: banner + sticky note copy; sections Urgencia; ctaVariants Reserva plaza.",
      },
      input,
    );
  }
}

export function getLandingUrgencyAgent(): LandingUrgencyAgent {
  return LandingUrgencyAgent.instance;
}

export function resetLandingUrgencyAgentForTests(): void {
  LandingUrgencyAgent.reset();
}
