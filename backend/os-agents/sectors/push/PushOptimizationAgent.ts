import type { ILlmClient } from "../../LlmClient";
import type { PushInput, PushOutput } from "./shared";
import { getDefaultPushLlm, runPushAgentCore } from "./shared";

const AGENT_ID = "push-optimization";

export class PushOptimizationAgent {
  private static inst: PushOptimizationAgent | undefined;

  static get instance(): PushOptimizationAgent {
    if (!PushOptimizationAgent.inst) PushOptimizationAgent.inst = new PushOptimizationAgent();
    return PushOptimizationAgent.inst;
  }

  static reset(): void {
    PushOptimizationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPushLlm();
  }

  async run(input: PushInput): Promise<PushOutput> {
    return runPushAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Growth analyst top 1%; optimización push basada en hipótesis medibles.",
        mission:
          "Analiza y optimiza timing, copy y frecuencia: recomendaciones accionables, tope de pings/semana y experimentos A/B sugeridos.",
        fewShotExample:
          '{"content":"Diagnóstico NOTIFY sobre brief: Need reducir fatiga; Opportunity ventanas 12–14h y 19–21h locales; Target cohorte actual; Instant máx 3/semana salvo transaccional; Focus tests subject línea 1; Yield +CTR estimado con hipótesis.","score":91,"notifications":["Experimento A: subject corto ≤35 chars vs beneficio explícito","Regla: cooldown 48h entre promo y abandono"],"deepLinks":["docs://push-policy/v2","exp://push/ab-weekly"]}',
      },
      input,
      0.2,
    );
  }
}

export function getPushOptimizationAgent(): PushOptimizationAgent {
  return PushOptimizationAgent.instance;
}

export function resetPushOptimizationAgentForTests(): void {
  PushOptimizationAgent.reset();
}
