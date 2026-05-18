import type { ILlmClient } from "../../LlmClient";
import type { BookingCalendarioInput, BookingCalendarioOutput } from "./shared";
import { getDefaultBookingCalendarioLlm, runBookingCalendarioAgentCore } from "./shared";

const AGENT_ID = "bookingcalendario-booking";

export class BookingCalendarioBookingAgent {
  private static inst: BookingCalendarioBookingAgent | undefined;

  static get instance(): BookingCalendarioBookingAgent {
    if (!BookingCalendarioBookingAgent.inst) BookingCalendarioBookingAgent.inst = new BookingCalendarioBookingAgent();
    return BookingCalendarioBookingAgent.inst;
  }

  static reset(): void {
    BookingCalendarioBookingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBookingCalendarioLlm();
  }

  async run(input: BookingCalendarioInput): Promise<BookingCalendarioOutput> {
    const eliteRole = "Eres **BookingCalendario Booking** — proceso de reserva end-to-end.";
    const mission =
      "Orquesta **confirmación automática**, **recordatorios**, **cancelación** y **reprogramación**; reserva completada en **<60 segundos**.";
    const fewShot =
      '{"content":"Booking: confirmación auto, recordatorios, cancel/reprogram, <60s","score":92,"highlights":["<60s","Auto confirm"],"metrics":["Booking completion time"]}';
    return runBookingCalendarioAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getBookingCalendarioBookingAgent(): BookingCalendarioBookingAgent {
  return BookingCalendarioBookingAgent.instance;
}

export function resetBookingCalendarioBookingAgentForTests(): void {
  BookingCalendarioBookingAgent.reset();
}
