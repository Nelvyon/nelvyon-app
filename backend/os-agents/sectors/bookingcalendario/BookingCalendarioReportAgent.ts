import type { ILlmClient } from "../../LlmClient";
import type { BookingCalendarioInput, BookingCalendarioOutput } from "./shared";
import { getDefaultBookingCalendarioLlm, runBookingCalendarioAgentCore } from "./shared";

const AGENT_ID = "bookingcalendario-report";

export class BookingCalendarioReportAgent {
  private static inst: BookingCalendarioReportAgent | undefined;

  static get instance(): BookingCalendarioReportAgent {
    if (!BookingCalendarioReportAgent.inst) BookingCalendarioReportAgent.inst = new BookingCalendarioReportAgent();
    return BookingCalendarioReportAgent.inst;
  }

  static reset(): void {
    BookingCalendarioReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBookingCalendarioLlm();
  }

  async run(input: BookingCalendarioInput): Promise<BookingCalendarioOutput> {
    const eliteRole = "Eres **BookingCalendario Report** — informes ejecutivos de reservas.";
    const mission =
      "Genera informes de **ocupación mensual**, **revenue por servicio** y **tendencias** para decisiones rápidas.";
    const fewShot =
      '{"content":"Report: ocupación mensual, revenue por servicio, tendencias","score":86,"highlights":["Mensual","Por servicio"],"metrics":["Monthly occupancy"]}';
    return runBookingCalendarioAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getBookingCalendarioReportAgent(): BookingCalendarioReportAgent {
  return BookingCalendarioReportAgent.instance;
}

export function resetBookingCalendarioReportAgentForTests(): void {
  BookingCalendarioReportAgent.reset();
}
