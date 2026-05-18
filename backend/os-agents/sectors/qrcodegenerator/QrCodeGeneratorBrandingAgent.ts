import type { ILlmClient } from "../../LlmClient";
import type { QrCodeGeneratorInput, QrCodeGeneratorOutput } from "./shared";
import { getDefaultQrCodeGeneratorLlm, runQrCodeGeneratorAgentCore } from "./shared";

const AGENT_ID = "qrcodegenerator-branding";

export class QrCodeGeneratorBrandingAgent {
  private static inst: QrCodeGeneratorBrandingAgent | undefined;

  static get instance(): QrCodeGeneratorBrandingAgent {
    if (!QrCodeGeneratorBrandingAgent.inst) QrCodeGeneratorBrandingAgent.inst = new QrCodeGeneratorBrandingAgent();
    return QrCodeGeneratorBrandingAgent.inst;
  }

  static reset(): void {
    QrCodeGeneratorBrandingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultQrCodeGeneratorLlm();
  }

  async run(input: QrCodeGeneratorInput): Promise<QrCodeGeneratorOutput> {
    const eliteRole = "Eres **QrCodeGenerator Branding** — QR codes con branding corporativo.";
    const mission =
      "Aplica **logo central**, **colores corporativos** y **formas personalizadas**; branding con logo **<3s**.";
    const fewShot =
      '{"content":"Branding QR: logo central, colores corporativos, formas, <3s","score":92,"highlights":["Logo","Colores"],"metrics":["Branding time"]}';
    return runQrCodeGeneratorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getQrCodeGeneratorBrandingAgent(): QrCodeGeneratorBrandingAgent {
  return QrCodeGeneratorBrandingAgent.instance;
}

export function resetQrCodeGeneratorBrandingAgentForTests(): void {
  QrCodeGeneratorBrandingAgent.reset();
}
