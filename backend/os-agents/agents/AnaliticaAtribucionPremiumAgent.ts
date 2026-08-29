import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import type { OsAgentStep, OsJobContext } from "../types";
import { completeLlmStep } from "./lote2AgentStepRunner";
import {
  promptAnaliticaAtribucionAnalysis,
  promptAnaliticaAtribucionExecution,
  promptAnaliticaAtribucionOptimization,
  promptAnaliticaAtribucionQa,
  promptAnaliticaAtribucionReport,
  promptAnaliticaAtribucionStrategy,
} from "./analiticaAtribucionPremiumPrompts";

const S1 = "analysis";
const S2 = "strategy";
const S3 = "execution";
const S4 = "optimization";
const S5 = "qa";
const S6 = "report";

function stepResult(ctx: OsJobContext, name: string): string {
  return ctx.stepResults[name] ?? "";
}

function summarize(text: string, max = 1200): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function buildSteps(llm: ILlmClient): OsAgentStep[] {
  return [
    {
      name: S1,
      description: "Auditoria del estado de la medicion (LLM)",
      run: async (payload) => completeLlmStep(llm, S1, promptAnaliticaAtribucionAnalysis(payload)),
    },
    {
      name: S2,
      description: "Plan de medicion y diccionario de eventos (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(llm, S2, promptAnaliticaAtribucionStrategy(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "Modelo de atribucion y ventana (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(llm, S3, promptAnaliticaAtribucionExecution(stepResult(ctx, S1), stepResult(ctx, S2), payload)),
    },
    {
      name: S4,
      description: "Cuadro de mando y alertas (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S4,
          promptAnaliticaAtribucionOptimization(
            stepResult(ctx, S1),
            stepResult(ctx, S2),
            stepResult(ctx, S3),
            payload,
          ),
        ),
    },
    {
      name: S5,
      description: "QA de contradicciones y doble conteo (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S5,
          // AL PASO DE QA SE LE RESUMEN LOS ANTERIORES, y no es una economia
          // de tokens: es lo que hace que el paso termine. Medido contra un
          // modelo local de 8B, la cadena entera crece hasta que el quinto
          // paso recibe todo lo que produjeron los cuatro primeros y agota el
          // plazo de la peticion. El paso de informe ya resumia por lo mismo;
          // QA no lo hacia y era el que reventaba.
          //
          // Lo que QA necesita es RECONOCER promesas, datos inventados y
          // marcado que no cuadra. Eso se ve en la parte de arriba de cada
          // paso; no hace falta el texto integro para encontrarlo.
          promptAnaliticaAtribucionQa(
            summarize(stepResult(ctx, S1)),
            summarize(stepResult(ctx, S2)),
            summarize(stepResult(ctx, S3)),
            summarize(stepResult(ctx, S4)),
            payload,
          ),
        ),
    },
    {
      name: S6,
      description: "Informe de fiabilidad de los datos (LLM, Markdown)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S6,
          promptAnaliticaAtribucionReport(
            payload,
            stepResult(ctx, S1),
            stepResult(ctx, S2),
            summarize(stepResult(ctx, S3)),
            summarize(stepResult(ctx, S4)),
            stepResult(ctx, S5),
          ),
        ),
    },
  ];
}

export class AnaliticaAtribucionPremiumAgent extends BaseOsAgent {
  readonly serviceId = "analitica_atribucion_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(llm: ILlmClient = LlmClient.getInstance()) {
    super();
    this.steps = buildSteps(llm);
  }
}
