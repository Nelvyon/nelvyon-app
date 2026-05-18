import type { ILlmClient } from "../../LlmClient";
import type { OkrManagementInput, OkrManagementOutput } from "./shared";
import { getDefaultOkrManagementLlm, runOkrManagementAgentCore } from "./shared";

const AGENT_ID = "okrmanagement-resource";

export class ResourceAgent {
  private static inst: ResourceAgent | undefined;

  static get instance(): ResourceAgent {
    if (!ResourceAgent.inst) ResourceAgent.inst = new ResourceAgent();
    return ResourceAgent.inst;
  }

  static reset(): void {
    ResourceAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOkrManagementLlm();
  }

  async run(input: OkrManagementInput): Promise<OkrManagementOutput> {
    const eliteRole = "Eres **Resource** — asignación óptima de recursos.";
    const mission =
      "Optimiza **asignación de recursos** y detecta **cuellos de botella** sin reuniones de seguimiento.";
    const fewShot =
      '{"content":"Resource: asignación óptima, cuellos de botella, 0 reuniones","score":87,"highlights":["Cuellos botella","Asignación óptima"],"metrics":["Resource utilization"]}';
    return runOkrManagementAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getResourceAgent(): ResourceAgent {
  return ResourceAgent.instance;
}

export function resetResourceAgentForTests(): void {
  ResourceAgent.reset();
}
