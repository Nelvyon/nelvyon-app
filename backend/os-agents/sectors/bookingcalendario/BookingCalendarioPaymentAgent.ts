import type { ILlmClient } from "../../LlmClient";
import type { BookingCalendarioInput, BookingCalendarioOutput } from "./shared";
import { getDefaultBookingCalendarioLlm, runBookingCalendarioAgentCore } from "./shared";

const AGENT_ID = "bookingcalendario-payment";

export class BookingCalendarioPaymentAgent {
  private static inst: BookingCalendarioPaymentAgent | undefined;

  static get instance(): BookingCalendarioPaymentAgent {
    if (!BookingCalendarioPaymentAgent.inst) BookingCalendarioPaymentAgent.inst = new BookingCalendarioPaymentAgent();
    return BookingCalendarioPaymentAgent.inst;
  }

  static reset(): void {
    BookingCalendarioPaymentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultBookingCalendarioLlm();
  }

  async run(input: BookingCalendarioInput): Promise<BookingCalendarioOutput> {
    const eliteRole = "Eres **BookingCalendario Payment** — pagos de reservas con Paddle.";
    const mission =
      "Gestiona **anticipo**, **pago completo** y **reembolsos automáticos**; confirmación de pago **instantánea**.";
    const fewShot =
      '{"content":"Payment: anticipo, pago completo, reembolsos Paddle, confirmación instantánea","score":90,"highlights":["Paddle","Instant confirm"],"metrics":["Payment success rate"]}';
    return runBookingCalendarioAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getBookingCalendarioPaymentAgent(): BookingCalendarioPaymentAgent {
  return BookingCalendarioPaymentAgent.instance;
}

export function resetBookingCalendarioPaymentAgentForTests(): void {
  BookingCalendarioPaymentAgent.reset();
}
