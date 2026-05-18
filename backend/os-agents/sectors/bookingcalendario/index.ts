import { BookingCalendarioAnalyticsAgent } from "./BookingCalendarioAnalyticsAgent";
import { BookingCalendarioBookingAgent } from "./BookingCalendarioBookingAgent";
import { BookingCalendarioOptimizationAgent } from "./BookingCalendarioOptimizationAgent";
import { BookingCalendarioPaymentAgent } from "./BookingCalendarioPaymentAgent";
import { BookingCalendarioReminderAgent } from "./BookingCalendarioReminderAgent";
import { BookingCalendarioReportAgent } from "./BookingCalendarioReportAgent";
import { BookingCalendarioSchedulerAgent } from "./BookingCalendarioSchedulerAgent";
import { BookingCalendarioSyncAgent } from "./BookingCalendarioSyncAgent";

export type { BookingCalendarioInput, BookingCalendarioOutput } from "./shared";
export { parseBookingCalendarioLlmJson, buildBookingCalendarioPrompt, llmOpts as bookingcalendarioLlmOpts } from "./shared";

export {
  BookingCalendarioSchedulerAgent,
  getBookingCalendarioSchedulerAgent,
  resetBookingCalendarioSchedulerAgentForTests,
} from "./BookingCalendarioSchedulerAgent";
export {
  BookingCalendarioBookingAgent,
  getBookingCalendarioBookingAgent,
  resetBookingCalendarioBookingAgentForTests,
} from "./BookingCalendarioBookingAgent";
export {
  BookingCalendarioReminderAgent,
  getBookingCalendarioReminderAgent,
  resetBookingCalendarioReminderAgentForTests,
} from "./BookingCalendarioReminderAgent";
export {
  BookingCalendarioPaymentAgent,
  getBookingCalendarioPaymentAgent,
  resetBookingCalendarioPaymentAgentForTests,
} from "./BookingCalendarioPaymentAgent";
export {
  BookingCalendarioSyncAgent,
  getBookingCalendarioSyncAgent,
  resetBookingCalendarioSyncAgentForTests,
} from "./BookingCalendarioSyncAgent";
export {
  BookingCalendarioAnalyticsAgent,
  getBookingCalendarioAnalyticsAgent,
  resetBookingCalendarioAnalyticsAgentForTests,
} from "./BookingCalendarioAnalyticsAgent";
export {
  BookingCalendarioOptimizationAgent,
  getBookingCalendarioOptimizationAgent,
  resetBookingCalendarioOptimizationAgentForTests,
} from "./BookingCalendarioOptimizationAgent";
export {
  BookingCalendarioReportAgent,
  getBookingCalendarioReportAgent,
  resetBookingCalendarioReportAgentForTests,
} from "./BookingCalendarioReportAgent";

export function resetAllBookingCalendarioAgentsForTests(): void {
  BookingCalendarioSchedulerAgent.reset();
  BookingCalendarioBookingAgent.reset();
  BookingCalendarioReminderAgent.reset();
  BookingCalendarioPaymentAgent.reset();
  BookingCalendarioSyncAgent.reset();
  BookingCalendarioAnalyticsAgent.reset();
  BookingCalendarioOptimizationAgent.reset();
  BookingCalendarioReportAgent.reset();
}
