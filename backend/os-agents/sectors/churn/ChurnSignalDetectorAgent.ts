import type { ILlmClient } from "../../LlmClient";
import type { ChurnInput, ChurnOutput } from "./shared";
import { getDefaultChurnLlm, runChurnAgentCore } from "./shared";

const AGENT_ID = "churn-signal-detector";

export class ChurnSignalDetectorAgent {
  private static inst: ChurnSignalDetectorAgent | undefined;

  static get instance(): ChurnSignalDetectorAgent {
    if (!ChurnSignalDetectorAgent.inst) ChurnSignalDetectorAgent.inst = new ChurnSignalDetectorAgent();
    return ChurnSignalDetectorAgent.inst;
  }

  static reset(): void {
    ChurnSignalDetectorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultChurnLlm();
  }

  async run(input: ChurnInput): Promise<ChurnOutput> {
    return runChurnAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Analista de comportamiento y product analytics top 1%; traduces métricas en señales tempranas accionables.",
        mission:
          "Detecta señales de abandono (caída uso, patrón de facturación, NPS implícito) y prioriza por severidad y recencia.",
        fewShotExample: `Input: caída semanal de “acciones clave” de 12 a 2 en 14 días.
Output JSON: señal principal “decay de valor percibido”, riskLevel medium, acciones de audit trail y email de check-in.`,
      },
      input,
    );
  }
}

export function getChurnSignalDetectorAgent(): ChurnSignalDetectorAgent {
  return ChurnSignalDetectorAgent.instance;
}

export function resetChurnSignalDetectorAgentForTests(): void {
  ChurnSignalDetectorAgent.reset();
}
