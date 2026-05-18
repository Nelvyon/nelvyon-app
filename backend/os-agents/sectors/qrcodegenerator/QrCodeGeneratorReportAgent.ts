import type { ILlmClient } from "../../LlmClient";
import type { QrCodeGeneratorInput, QrCodeGeneratorOutput } from "./shared";
import { getDefaultQrCodeGeneratorLlm, runQrCodeGeneratorAgentCore } from "./shared";

const AGENT_ID = "qrcodegenerator-report";

export class QrCodeGeneratorReportAgent {
  private static inst: QrCodeGeneratorReportAgent | undefined;

  static get instance(): QrCodeGeneratorReportAgent {
    if (!QrCodeGeneratorReportAgent.inst) QrCodeGeneratorReportAgent.inst = new QrCodeGeneratorReportAgent();
    return QrCodeGeneratorReportAgent.inst;
  }

  static reset(): void {
    QrCodeGeneratorReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultQrCodeGeneratorLlm();
  }

  async run(input: QrCodeGeneratorInput): Promise<QrCodeGeneratorOutput> {
    const eliteRole = "Eres **QrCodeGenerator Report** — informes de rendimiento QR.";
    const mission =
      "Informa **top códigos**, **campañas** y **ROI offline-online** con analytics en tiempo real.";
    const fewShot =
      '{"content":"Informe QR: top códigos, campañas, ROI offline-online","score":92,"highlights":["Top códigos","ROI"],"metrics":["QR ROI"]}';
    return runQrCodeGeneratorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getQrCodeGeneratorReportAgent(): QrCodeGeneratorReportAgent {
  return QrCodeGeneratorReportAgent.instance;
}

export function resetQrCodeGeneratorReportAgentForTests(): void {
  QrCodeGeneratorReportAgent.reset();
}
