import type { ILlmClient } from "../../LlmClient";
import type { ComparatorInput, ComparatorOutput } from "./shared";
import { getDefaultComparatorLlm, runComparatorAgentCore } from "./shared";

const AGENT_ID = "comparator-pdf-summary";

export class ComparatorPDFSummaryAgent {
  private static inst: ComparatorPDFSummaryAgent | undefined;

  static get instance(): ComparatorPDFSummaryAgent {
    if (!ComparatorPDFSummaryAgent.inst) ComparatorPDFSummaryAgent.inst = new ComparatorPDFSummaryAgent();
    return ComparatorPDFSummaryAgent.inst;
  }

  static reset(): void {
    ComparatorPDFSummaryAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultComparatorLlm();
  }

  async run(input: ComparatorInput): Promise<ComparatorOutput> {
    return runComparatorAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Chief of Staff redacción top 1%; PDF ejecutivo de una página + anexos opcionales.",
        mission:
          "Genera resumen ejecutivo PDF-ready del antes/después: portada, executive summary, tabla KPIs, conclusiones y próximos pasos.",
        fewShotExample:
          '{"content":"PORTADA: Cliente + período. RESUMEN: 6 líneas TRANSFORM. TABLA: KPI | Antes | Después | Delta. CONCLUSIÓN: 3 bullets. ANEXO: metodología y límites. Own: fuentes = brief. Result: imprimible. More: versión inglés si se pide.","score":90,"improvements":["1-pager ejecutivo","Tabla KPI lista para PDF"],"visualData":["Portada + tabla 5 KPIs","Disclaimer metodológico"]}',
      },
      input,
      0.5,
    );
  }
}

export function getComparatorPDFSummaryAgent(): ComparatorPDFSummaryAgent {
  return ComparatorPDFSummaryAgent.instance;
}

export function resetComparatorPDFSummaryAgentForTests(): void {
  ComparatorPDFSummaryAgent.reset();
}
