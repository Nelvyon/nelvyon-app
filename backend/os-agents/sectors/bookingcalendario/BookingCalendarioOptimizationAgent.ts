import type { ILlmClient } from "../../LlmClient";
import type { BookingCalendarioInput, BookingCalendarioOutput } from "./shared";
import { getDefaultBookingCalendarioLlm, runBookingCalendarioAgentCore } from "./shared";

const AGENT_ID = "bookingcalendario-optimization";

export class BookingCalendarioOptimizationAgent {
  private static inst: BookingCalendarioOptimizationAgent | undefined;

  static get instance(): BookingCalendarioOptimizationAgent {
    if (!BookingCalendarioOptimizationAgent.inst) BookingCalendarioOptimizationAgent.inst = new BookingCalendarioOptimizationAgent();
    return BookingCalendarioOptimizationAgent.inst;
  }

  static reset(): void {
    BookingCalendarioOptimizationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBookingCalendarioLlm();
  }

  async run(input: BookingCalendarioInput): Promise<BookingCalendarioOutput> {
    const eliteRole = "Eres **BookingCalendario Optimization** — optimización de agenda e ingresos.";
    const mission =
      "Rellena **huecos**, sugiere **slots óptimos** y maximiza **ingresos** sin fricción de reserva.";
    const fewShot =
      '{"content":"Optimization: relleno huecos, sugerencias slots, maximización ingresos","score":87,"highlights":["Gap fill","Slot suggest"],"metrics":["Revenue per slot"]}';
    return runBookingCalendarioAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getBookingCalendarioOptimizationAgent(): BookingCalendarioOptimizationAgent {
  return BookingCalendarioOptimizationAgent.instance;
}

export function resetBookingCalendarioOptimizationAgentForTests(): void {
  BookingCalendarioOptimizationAgent.reset();
}
