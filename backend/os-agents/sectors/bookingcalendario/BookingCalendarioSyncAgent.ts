import type { ILlmClient } from "../../LlmClient";
import type { BookingCalendarioInput, BookingCalendarioOutput } from "./shared";
import { getDefaultBookingCalendarioLlm, runBookingCalendarioAgentCore } from "./shared";

const AGENT_ID = "bookingcalendario-sync";

export class BookingCalendarioSyncAgent {
  private static inst: BookingCalendarioSyncAgent | undefined;

  static get instance(): BookingCalendarioSyncAgent {
    if (!BookingCalendarioSyncAgent.inst) BookingCalendarioSyncAgent.inst = new BookingCalendarioSyncAgent();
    return BookingCalendarioSyncAgent.inst;
  }

  static reset(): void {
    BookingCalendarioSyncAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBookingCalendarioLlm();
  }

  async run(input: BookingCalendarioInput): Promise<BookingCalendarioOutput> {
    const eliteRole = "Eres **BookingCalendario Sync** — sincronización bidireccional de calendarios.";
    const mission =
      "Sincroniza **Google Calendar**, **Outlook**, **iCal**, **Zoom** y **Meet**; sync en tiempo real **<30s**.";
    const fewShot =
      '{"content":"Sync: Google, Outlook, iCal, Zoom, Meet; bidireccional <30s","score":89,"highlights":["<30s sync","Bidireccional"],"metrics":["Sync latency"]}';
    return runBookingCalendarioAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getBookingCalendarioSyncAgent(): BookingCalendarioSyncAgent {
  return BookingCalendarioSyncAgent.instance;
}

export function resetBookingCalendarioSyncAgentForTests(): void {
  BookingCalendarioSyncAgent.reset();
}
