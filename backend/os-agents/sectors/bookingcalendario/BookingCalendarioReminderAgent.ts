import type { ILlmClient } from "../../LlmClient";
import type { BookingCalendarioInput, BookingCalendarioOutput } from "./shared";
import { getDefaultBookingCalendarioLlm, runBookingCalendarioAgentCore } from "./shared";

const AGENT_ID = "bookingcalendario-reminder";

export class BookingCalendarioReminderAgent {
  private static inst: BookingCalendarioReminderAgent | undefined;

  static get instance(): BookingCalendarioReminderAgent {
    if (!BookingCalendarioReminderAgent.inst) BookingCalendarioReminderAgent.inst = new BookingCalendarioReminderAgent();
    return BookingCalendarioReminderAgent.inst;
  }

  static reset(): void {
    BookingCalendarioReminderAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBookingCalendarioLlm();
  }

  async run(input: BookingCalendarioInput): Promise<BookingCalendarioOutput> {
    const eliteRole = "Eres **BookingCalendario Reminder** — recordatorios inteligentes anti no-show.";
    const mission =
      "Envía recordatorios por **email/SMS/WhatsApp** con **timing óptimo**; reducción de no-shows **>60%**.";
    const fewShot =
      '{"content":"Reminder: email/SMS/WhatsApp, timing óptimo, >60% menos no-shows","score":91,"highlights":[">60% no-show cut","Multi-canal"],"metrics":["No-show rate"]}';
    return runBookingCalendarioAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getBookingCalendarioReminderAgent(): BookingCalendarioReminderAgent {
  return BookingCalendarioReminderAgent.instance;
}

export function resetBookingCalendarioReminderAgentForTests(): void {
  BookingCalendarioReminderAgent.reset();
}
