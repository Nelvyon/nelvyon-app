import type { ILlmClient } from "../../LlmClient";
import type { AgencyCertInput, AgencyCertOutput } from "./shared";
import { getDefaultAgencyCertLlm, runAgencyCertAgentCore } from "./shared";

const AGENT_ID = "agencycert-badge";

export class AgencyCertBadgeAgent {
  private static inst: AgencyCertBadgeAgent | undefined;

  static get instance(): AgencyCertBadgeAgent {
    if (!AgencyCertBadgeAgent.inst) AgencyCertBadgeAgent.inst = new AgencyCertBadgeAgent();
    return AgencyCertBadgeAgent.inst;
  }

  static reset(): void {
    AgencyCertBadgeAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAgencyCertLlm();
  }

  async run(input: AgencyCertInput): Promise<AgencyCertOutput> {
    return runAgencyCertAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Brand asset pipeline; badge_url en agency_certifications.",
        mission:
          "Genera badge oficial **NELVYON Certified Agency** por nivel (SVG/PNG orientativo) y URL firma CDN.",
        fewShotExample:
          '{"content":"Badge Gold SVG + dark variant.","score":90,"highlights":["Marca coherente","expires_at"],"metrics":["badge_url"]}',
      },
      input,
      0.2,
    );
  }
}

export function getAgencyCertBadgeAgent(): AgencyCertBadgeAgent {
  return AgencyCertBadgeAgent.instance;
}

export function resetAgencyCertBadgeAgentForTests(): void {
  AgencyCertBadgeAgent.reset();
}
