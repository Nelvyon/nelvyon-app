import type { ILlmClient } from "../../LlmClient";
import type { ComparatorInput, ComparatorOutput } from "./shared";
import { getDefaultComparatorLlm, runComparatorAgentCore } from "./shared";

const AGENT_ID = "comparator-testimonial-miner";

export class ComparatorTestimonialMinerAgent {
  private static inst: ComparatorTestimonialMinerAgent | undefined;

  static get instance(): ComparatorTestimonialMinerAgent {
    if (!ComparatorTestimonialMinerAgent.inst) ComparatorTestimonialMinerAgent.inst = new ComparatorTestimonialMinerAgent();
    return ComparatorTestimonialMinerAgent.inst;
  }

  static reset(): void {
    ComparatorTestimonialMinerAgent.inst = undefined;
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
          "ROLE: Voice-of-customer sintético top 1%; citas plausibles ancladas a métricas, no testimonios falsos.",
        mission:
          "Extrae citas de impacto a partir de los datos de mejora: formato testimonio corto, headline y disclaimer de que son para revisión legal.",
        fewShotExample:
          '{"content":"Cita A (ejecutivo): Pasamos de dashboards estáticos a decisiones semanales con números claros—el salto en conversión lo vimos en 6 semanas. Cita B (operaciones): Menos tickets repetidos según el delta de tiempo de respuesta del brief. Disclaimer: revisar con cliente real antes de publicar. Own: citas son plantillas basadas en datos. Result: biblioteca lista. More: grabar entrevista corta.","score":87,"improvements":["2 citas ancladas a métricas","Disclaimer compliance"],"visualData":["Quote card: conversión +1.3pts","Quote card: SLA −40%"]}',
      },
      input,
      0.5,
    );
  }
}

export function getComparatorTestimonialMinerAgent(): ComparatorTestimonialMinerAgent {
  return ComparatorTestimonialMinerAgent.instance;
}

export function resetComparatorTestimonialMinerAgentForTests(): void {
  ComparatorTestimonialMinerAgent.reset();
}
