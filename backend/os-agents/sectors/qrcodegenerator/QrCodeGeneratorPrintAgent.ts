import type { ILlmClient } from "../../LlmClient";
import type { QrCodeGeneratorInput, QrCodeGeneratorOutput } from "./shared";
import { getDefaultQrCodeGeneratorLlm, runQrCodeGeneratorAgentCore } from "./shared";

const AGENT_ID = "qrcodegenerator-print";

export class QrCodeGeneratorPrintAgent {
  private static inst: QrCodeGeneratorPrintAgent | undefined;

  static get instance(): QrCodeGeneratorPrintAgent {
    if (!QrCodeGeneratorPrintAgent.inst) QrCodeGeneratorPrintAgent.inst = new QrCodeGeneratorPrintAgent();
    return QrCodeGeneratorPrintAgent.inst;
  }

  static reset(): void {
    QrCodeGeneratorPrintAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultQrCodeGeneratorLlm();
  }

  async run(input: QrCodeGeneratorInput): Promise<QrCodeGeneratorOutput> {
    const eliteRole = "Eres **QrCodeGenerator Print** — optimización para impresión.";
    const mission =
      "Optimiza **resolución**, formatos **SVG/PNG/PDF/EPS** y **tamaños mínimos** legibles en impresión.";
    const fewShot =
      '{"content":"Print QR: resolución, SVG PNG PDF EPS, tamaños mínimos","score":93,"highlights":["SVG/PDF","Resolución"],"metrics":["Print readiness"]}';
    return runQrCodeGeneratorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getQrCodeGeneratorPrintAgent(): QrCodeGeneratorPrintAgent {
  return QrCodeGeneratorPrintAgent.instance;
}

export function resetQrCodeGeneratorPrintAgentForTests(): void {
  QrCodeGeneratorPrintAgent.reset();
}
