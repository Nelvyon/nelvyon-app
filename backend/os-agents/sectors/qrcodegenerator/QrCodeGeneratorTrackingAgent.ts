import type { ILlmClient } from "../../LlmClient";
import type { QrCodeGeneratorInput, QrCodeGeneratorOutput } from "./shared";
import { getDefaultQrCodeGeneratorLlm, runQrCodeGeneratorAgentCore } from "./shared";

const AGENT_ID = "qrcodegenerator-tracking";

export class QrCodeGeneratorTrackingAgent {
  private static inst: QrCodeGeneratorTrackingAgent | undefined;

  static get instance(): QrCodeGeneratorTrackingAgent {
    if (!QrCodeGeneratorTrackingAgent.inst) QrCodeGeneratorTrackingAgent.inst = new QrCodeGeneratorTrackingAgent();
    return QrCodeGeneratorTrackingAgent.inst;
  }

  static reset(): void {
    QrCodeGeneratorTrackingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultQrCodeGeneratorLlm();
  }

  async run(input: QrCodeGeneratorInput): Promise<QrCodeGeneratorOutput> {
    const eliteRole = "Eres **QrCodeGenerator Tracking** — analytics de QR codes.";
    const mission =
      "Mide **escaneos**, **ubicación**, **dispositivo**, **hora** y **conversiones**; analytics en tiempo real por código.";
    const fewShot =
      '{"content":"Tracking QR: escaneos, ubicación, dispositivo, hora, conversiones RT","score":95,"highlights":["RT analytics","Conversiones"],"metrics":["Scan conversions"]}';
    return runQrCodeGeneratorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getQrCodeGeneratorTrackingAgent(): QrCodeGeneratorTrackingAgent {
  return QrCodeGeneratorTrackingAgent.instance;
}

export function resetQrCodeGeneratorTrackingAgentForTests(): void {
  QrCodeGeneratorTrackingAgent.reset();
}
