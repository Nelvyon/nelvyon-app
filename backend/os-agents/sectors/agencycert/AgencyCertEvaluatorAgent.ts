import type { ILlmClient } from "../../LlmClient";
import type { AgencyCertInput, AgencyCertOutput } from "./shared";
import { getDefaultAgencyCertLlm, runAgencyCertAgentCore } from "./shared";

const AGENT_ID = "agencycert-evaluator";

export class AgencyCertEvaluatorAgent {
  private static inst: AgencyCertEvaluatorAgent | undefined;

  static get instance(): AgencyCertEvaluatorAgent {
    if (!AgencyCertEvaluatorAgent.inst) AgencyCertEvaluatorAgent.inst = new AgencyCertEvaluatorAgent();
    return AgencyCertEvaluatorAgent.inst;
  }

  static reset(): void {
    AgencyCertEvaluatorAgent.inst = undefined;
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
        eliteRole: "ROLE: Rubric cuatro pilares; decide nivel Silver/Gold/Platinum.",
        mission:
          "Evalúa competencias: **técnica**, **ventas**, **soporte**, **resultados**; cruza umbrales por nivel (clientes, NPS, antigüedad).",
        fewShotExample:
          '{"content":"Score global 87; Gold elegible (NPS 8.4, 24 clientes).","score":92,"highlights":["4 pilares","Umbrales"],"metrics":["Nivel: gold"]}',
      },
      input,
      0.1,
    );
  }
}

export function getAgencyCertEvaluatorAgent(): AgencyCertEvaluatorAgent {
  return AgencyCertEvaluatorAgent.instance;
}

export function resetAgencyCertEvaluatorAgentForTests(): void {
  AgencyCertEvaluatorAgent.reset();
}
