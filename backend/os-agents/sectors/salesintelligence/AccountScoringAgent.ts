import type { ILlmClient } from "../../LlmClient";
import type { SalesIntelligenceInput, SalesIntelligenceOutput } from "./shared";
import { getDefaultSalesIntelligenceLlm, runSalesIntelligenceAgentCore } from "./shared";

const AGENT_ID = "salesintelligence-accountscoring";

export class AccountScoringAgent {
  private static inst: AccountScoringAgent | undefined;

  static get instance(): AccountScoringAgent {
    if (!AccountScoringAgent.inst) AccountScoringAgent.inst = new AccountScoringAgent();
    return AccountScoringAgent.inst;
  }

  static reset(): void {
    AccountScoringAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSalesIntelligenceLlm();
  }

  async run(input: SalesIntelligenceInput): Promise<SalesIntelligenceOutput> {
    const eliteRole = "Eres **Account Scoring** — scoring de cuentas objetivo.";
    const mission =
      "Puntúa cuentas por **fit + intent + engagement** combinados; **accuracy >88%** sin intervención humana.";
    const fewShot =
      '{"content":"Account scoring: fit+intent+engagement, >88% accuracy, 0 humano","score":91,"highlights":[">88% accuracy","Fit+intent"],"metrics":["Scoring accuracy"]}';
    return runSalesIntelligenceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getAccountScoringAgent(): AccountScoringAgent {
  return AccountScoringAgent.instance;
}

export function resetAccountScoringAgentForTests(): void {
  AccountScoringAgent.reset();
}
