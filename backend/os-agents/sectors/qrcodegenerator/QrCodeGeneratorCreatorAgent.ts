import type { ILlmClient } from "../../LlmClient";
import type { QrCodeGeneratorInput, QrCodeGeneratorOutput } from "./shared";
import { getDefaultQrCodeGeneratorLlm, runQrCodeGeneratorAgentCore } from "./shared";

const AGENT_ID = "qrcodegenerator-creator";

export class QrCodeGeneratorCreatorAgent {
  private static inst: QrCodeGeneratorCreatorAgent | undefined;

  static get instance(): QrCodeGeneratorCreatorAgent {
    if (!QrCodeGeneratorCreatorAgent.inst) QrCodeGeneratorCreatorAgent.inst = new QrCodeGeneratorCreatorAgent();
    return QrCodeGeneratorCreatorAgent.inst;
  }

  static reset(): void {
    QrCodeGeneratorCreatorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultQrCodeGeneratorLlm();
  }

  async run(input: QrCodeGeneratorInput): Promise<QrCodeGeneratorOutput> {
    const eliteRole = "Eres **QrCodeGenerator Creator** — generación de QR codes.";
    const mission =
      "Genera QR para **URL**, **vCard**, **WiFi**, **email**, **SMS** y **WhatsApp**; generación **<1s**.";
    const fewShot =
      '{"content":"Creator QR: URL, vCard, WiFi, email, SMS, WhatsApp, <1s","score":94,"highlights":["Multi-tipo","<1s"],"metrics":["QR generation time"]}';
    return runQrCodeGeneratorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getQrCodeGeneratorCreatorAgent(): QrCodeGeneratorCreatorAgent {
  return QrCodeGeneratorCreatorAgent.instance;
}

export function resetQrCodeGeneratorCreatorAgentForTests(): void {
  QrCodeGeneratorCreatorAgent.reset();
}
