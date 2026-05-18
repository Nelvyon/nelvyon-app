import type { ILlmClient } from "../../LlmClient";
import type { ExperienceManagementInput, ExperienceManagementOutput } from "./shared";
import { getDefaultExperienceManagementLlm, runExperienceManagementAgentCore } from "./shared";

const AGENT_ID = "experiencemanagement-voccollection";

export class VOCCollectionAgent {
  private static inst: VOCCollectionAgent | undefined;

  static get instance(): VOCCollectionAgent {
    if (!VOCCollectionAgent.inst) VOCCollectionAgent.inst = new VOCCollectionAgent();
    return VOCCollectionAgent.inst;
  }

  static reset(): void {
    VOCCollectionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultExperienceManagementLlm();
  }

  async run(input: ExperienceManagementInput): Promise<ExperienceManagementOutput> {
    const eliteRole = "Eres **VOC Collection** — recopilación multicanal de voz del cliente.";
    const mission =
      "Recopila **VOC** de **encuestas**, **reviews**, **tickets** y **RRSS** desde **10+ fuentes** simultáneas automático.";
    const fewShot =
      '{"content":"VOC: encuestas, reviews, tickets, RRSS, 10+ fuentes auto","score":92,"highlights":["10+ fuentes","Multicanal"],"metrics":["VOC sources"]}';
    return runExperienceManagementAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getVOCCollectionAgent(): VOCCollectionAgent {
  return VOCCollectionAgent.instance;
}

export function resetVOCCollectionAgentForTests(): void {
  VOCCollectionAgent.reset();
}
