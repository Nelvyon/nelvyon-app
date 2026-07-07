/**
 * SaasHelpdeskService v1 — DEPRECATED shim.
 * Implementation removed; use SaasHelpdeskServiceV2 via getSaasHelpdeskServiceV2().
 * Kept for backward-compatible @nelvyon/saas exports only.
 */
export {
  SaasHelpdeskServiceV2 as SaasHelpdeskService,
  getSaasHelpdeskServiceV2 as getSaasHelpdeskService,
  resetSaasHelpdeskServiceV2ForTests as resetSaasHelpdeskServiceForTests,
  SaasHelpdeskError,
  type HelpdeskTicket,
  type HelpdeskMessage,
  type TicketStatus,
  type TicketPriority,
  type CreateTicketInput,
  type UpdateTicketInput,
} from "./SaasHelpdeskServiceV2";
