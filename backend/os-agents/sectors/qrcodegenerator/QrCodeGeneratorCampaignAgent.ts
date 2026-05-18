import type { ILlmClient } from "../../LlmClient";
import type { QrCodeGeneratorInput, QrCodeGeneratorOutput } from "./shared";
import { getDefaultQrCodeGeneratorLlm, runQrCodeGeneratorAgentCore } from "./shared";

const AGENT_ID = "qrcodegenerator-campaign";

export class QrCodeGeneratorCampaignAgent {
  private static inst: QrCodeGeneratorCampaignAgent | undefined;

  static get instance(): QrCodeGeneratorCampaignAgent {
    if (!QrCodeGeneratorCampaignAgent.inst) QrCodeGeneratorCampaignAgent.inst = new QrCodeGeneratorCampaignAgent();
    return QrCodeGeneratorCampaignAgent.inst;
  }

  static reset(): void {
    QrCodeGeneratorCampaignAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultQrCodeGeneratorLlm();
  }

  async run(input: QrCodeGeneratorInput): Promise<QrCodeGeneratorOutput> {
    const eliteRole = "Eres **QrCodeGenerator Campaign** — QR por campaña de marketing.";
    const mission =
      "Asigna **UTMs automáticos**, **landing personalizada por QR** y **A/B testing** por campaña.";
    const fewShot =
      '{"content":"Campaña QR: UTMs auto, landing por QR, A/B testing","score":91,"highlights":["UTMs","A/B"],"metrics":["Campaign QR lift"]}';
    return runQrCodeGeneratorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getQrCodeGeneratorCampaignAgent(): QrCodeGeneratorCampaignAgent {
  return QrCodeGeneratorCampaignAgent.instance;
}

export function resetQrCodeGeneratorCampaignAgentForTests(): void {
  QrCodeGeneratorCampaignAgent.reset();
}
