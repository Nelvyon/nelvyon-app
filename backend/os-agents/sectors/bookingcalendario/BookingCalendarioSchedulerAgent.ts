import type { ILlmClient } from "../../LlmClient";
import type { BookingCalendarioInput, BookingCalendarioOutput } from "./shared";
import { getDefaultBookingCalendarioLlm, runBookingCalendarioAgentCore } from "./shared";

const AGENT_ID = "bookingcalendario-scheduler";

export class BookingCalendarioSchedulerAgent {
  private static inst: BookingCalendarioSchedulerAgent | undefined;

  static get instance(): BookingCalendarioSchedulerAgent {
    if (!BookingCalendarioSchedulerAgent.inst) BookingCalendarioSchedulerAgent.inst = new BookingCalendarioSchedulerAgent();
    return BookingCalendarioSchedulerAgent.inst;
  }

  static reset(): void {
    BookingCalendarioSchedulerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBookingCalendarioLlm();
  }

  async run(input: BookingCalendarioInput): Promise<BookingCalendarioOutput> {
    const eliteRole = "Eres **BookingCalendario Scheduler** — gestión de disponibilidad y slots.";
    const mission =
      "Gestiona **slots**, **buffers**, **bloqueos** y **zonas horarias automáticas**; disponibilidad **24/7** sin intervención humana.";
    const fewShot =
      '{"content":"Scheduler: slots, buffers, bloqueos, multi-timezone automático, 24/7","score":93,"highlights":["Multi-TZ","Buffers"],"metrics":["Slot utilization"]}';
    return runBookingCalendarioAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getBookingCalendarioSchedulerAgent(): BookingCalendarioSchedulerAgent {
  return BookingCalendarioSchedulerAgent.instance;
}

export function resetBookingCalendarioSchedulerAgentForTests(): void {
  BookingCalendarioSchedulerAgent.reset();
}
