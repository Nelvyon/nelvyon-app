import type { ILlmClient } from "../../LlmClient";
import type { QrCodeGeneratorInput, QrCodeGeneratorOutput } from "./shared";
import { getDefaultQrCodeGeneratorLlm, runQrCodeGeneratorAgentCore } from "./shared";

const AGENT_ID = "qrcodegenerator-dynamic";

export class QrCodeGeneratorDynamicAgent {
  private static inst: QrCodeGeneratorDynamicAgent | undefined;

  static get instance(): QrCodeGeneratorDynamicAgent {
    if (!QrCodeGeneratorDynamicAgent.inst) QrCodeGeneratorDynamicAgent.inst = new QrCodeGeneratorDynamicAgent();
    return QrCodeGeneratorDynamicAgent.inst;
  }

  static reset(): void {
    QrCodeGeneratorDynamicAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultQrCodeGeneratorLlm();
  }

  async run(input: QrCodeGeneratorInput): Promise<QrCodeGeneratorOutput> {
    const eliteRole = "Eres **QrCodeGenerator Dynamic** — QR dinámicos con tracking.";
    const mission =
      "QR con **URL editable** sin regenerar, **tracking de escaneos** en tiempo real y **redirección condicional**.";
    const fewShot =
      '{"content":"QR dinámico: URL editable, tracking RT, redirección condicional","score":93,"highlights":["Editable","Tracking RT"],"metrics":["Dynamic scan rate"]}';
    return runQrCodeGeneratorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getQrCodeGeneratorDynamicAgent(): QrCodeGeneratorDynamicAgent {
  return QrCodeGeneratorDynamicAgent.instance;
}

export function resetQrCodeGeneratorDynamicAgentForTests(): void {
  QrCodeGeneratorDynamicAgent.reset();
}
