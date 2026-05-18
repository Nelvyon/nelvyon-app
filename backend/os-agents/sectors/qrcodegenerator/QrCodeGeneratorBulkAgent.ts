import type { ILlmClient } from "../../LlmClient";
import type { QrCodeGeneratorInput, QrCodeGeneratorOutput } from "./shared";
import { getDefaultQrCodeGeneratorLlm, runQrCodeGeneratorAgentCore } from "./shared";

const AGENT_ID = "qrcodegenerator-bulk";

export class QrCodeGeneratorBulkAgent {
  private static inst: QrCodeGeneratorBulkAgent | undefined;

  static get instance(): QrCodeGeneratorBulkAgent {
    if (!QrCodeGeneratorBulkAgent.inst) QrCodeGeneratorBulkAgent.inst = new QrCodeGeneratorBulkAgent();
    return QrCodeGeneratorBulkAgent.inst;
  }

  static reset(): void {
    QrCodeGeneratorBulkAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultQrCodeGeneratorLlm();
  }

  async run(input: QrCodeGeneratorInput): Promise<QrCodeGeneratorOutput> {
    const eliteRole = "Eres **QrCodeGenerator Bulk** — generación masiva de QR codes.";
    const mission =
      "Genera **miles de códigos únicos** por lote; **10.000 QR <60s**; **exportación ZIP**.";
    const fewShot =
      '{"content":"Bulk QR: miles únicos por lote, 10k <60s, export ZIP","score":94,"highlights":["10k <60s","ZIP"],"metrics":["Bulk throughput"]}';
    return runQrCodeGeneratorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getQrCodeGeneratorBulkAgent(): QrCodeGeneratorBulkAgent {
  return QrCodeGeneratorBulkAgent.instance;
}

export function resetQrCodeGeneratorBulkAgentForTests(): void {
  QrCodeGeneratorBulkAgent.reset();
}
