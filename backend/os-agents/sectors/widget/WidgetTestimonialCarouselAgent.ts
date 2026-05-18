import type { ILlmClient } from "../../LlmClient";
import type { WidgetInput, WidgetOutput } from "./shared";
import { getDefaultWidgetLlm, runWidgetAgentCore } from "./shared";

const AGENT_ID = "widget-testimonial-carousel";

export class WidgetTestimonialCarouselAgent {
  private static inst: WidgetTestimonialCarouselAgent | undefined;

  static get instance(): WidgetTestimonialCarouselAgent {
    if (!WidgetTestimonialCarouselAgent.inst) WidgetTestimonialCarouselAgent.inst = new WidgetTestimonialCarouselAgent();
    return WidgetTestimonialCarouselAgent.inst;
  }

  static reset(): void {
    WidgetTestimonialCarouselAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWidgetLlm();
  }

  async run(input: WidgetInput): Promise<WidgetOutput> {
    return runWidgetAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Carousel UX copy + markup lead top 1%; testimonios solo del brief.",
        mission:
          "Construye carrusel embebible de testimonios con slides y controles accesibles.",
        fewShotExample:
          "Input: 3 quotes en metrics. Output JSON: embedCode HTML+CSS; previewData nombres/roles.",
      },
      input,
      0.5,
    );
  }
}

export function getWidgetTestimonialCarouselAgent(): WidgetTestimonialCarouselAgent {
  return WidgetTestimonialCarouselAgent.instance;
}

export function resetWidgetTestimonialCarouselAgentForTests(): void {
  WidgetTestimonialCarouselAgent.reset();
}
