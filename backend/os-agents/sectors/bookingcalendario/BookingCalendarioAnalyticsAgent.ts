import type { ILlmClient } from "../../LlmClient";
import type { BookingCalendarioInput, BookingCalendarioOutput } from "./shared";
import { getDefaultBookingCalendarioLlm, runBookingCalendarioAgentCore } from "./shared";

const AGENT_ID = "bookingcalendario-analytics";

export class BookingCalendarioAnalyticsAgent {
  private static inst: BookingCalendarioAnalyticsAgent | undefined;

  static get instance(): BookingCalendarioAnalyticsAgent {
    if (!BookingCalendarioAnalyticsAgent.inst) BookingCalendarioAnalyticsAgent.inst = new BookingCalendarioAnalyticsAgent();
    return BookingCalendarioAnalyticsAgent.inst;
  }

  static reset(): void {
    BookingCalendarioAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBookingCalendarioLlm();
  }

  async run(input: BookingCalendarioInput): Promise<BookingCalendarioOutput> {
    const eliteRole = "Eres **BookingCalendario Analytics** — analytics de reservas y ocupación.";
    const mission =
      "Mide **ocupación**, **ingresos**, **no-show rate** y **clientes recurrentes** con KPIs accionables.";
    const fewShot =
      '{"content":"Analytics: ocupación, ingresos, no-show rate, clientes recurrentes","score":88,"highlights":["Ocupación","Revenue"],"metrics":["No-show rate"]}';
    return runBookingCalendarioAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getBookingCalendarioAnalyticsAgent(): BookingCalendarioAnalyticsAgent {
  return BookingCalendarioAnalyticsAgent.instance;
}

export function resetBookingCalendarioAnalyticsAgentForTests(): void {
  BookingCalendarioAnalyticsAgent.reset();
}
