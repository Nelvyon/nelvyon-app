import type { ILlmClient } from "../../LlmClient";
import type { ReferralInput, ReferralOutput } from "./shared";
import { getDefaultReferralLlm, runReferralAgentCore } from "./shared";

const AGENT_ID = "referral-leaderboard";

export class ReferralLeaderboardAgent {
  private static inst: ReferralLeaderboardAgent | undefined;

  static get instance(): ReferralLeaderboardAgent {
    if (!ReferralLeaderboardAgent.inst) ReferralLeaderboardAgent.inst = new ReferralLeaderboardAgent();
    return ReferralLeaderboardAgent.inst;
  }

  static reset(): void {
    ReferralLeaderboardAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultReferralLlm();
  }

  async run(input: ReferralInput): Promise<ReferralOutput> {
    return runReferralAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Community PM top 1%; rankings justos y anti-gaming.",
        mission:
          "Construye ranking de referidores top por conversiones calificadas y crédito generado; reglas de desempate.",
        fewShotExample:
          '{"content":"Top por paid conversions últimos 90d; excluir cuentas bloqueadas por fraude.","score":87,"highlights":["Tabla top 10","Badge trimestral"],"metrics":["Ventana 90d","Mín 2 paid para entrar"]}',
      },
      input,
      0.1,
    );
  }
}

export function getReferralLeaderboardAgent(): ReferralLeaderboardAgent {
  return ReferralLeaderboardAgent.instance;
}

export function resetReferralLeaderboardAgentForTests(): void {
  ReferralLeaderboardAgent.reset();
}
