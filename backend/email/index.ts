export {
  NelvyonEmailService,
  getNelvyonEmailService,
  resetNelvyonEmailServiceForTests,
  type EmailResult,
  type EmailClientPort,
} from "./NelvyonEmailService";
export { sendEmail } from "./emailService";
export { sendRawEmail, isSesConfigured, allowSaasEmailDryRun, type RawEmailPayload, type RawEmailResult } from "./sendRawEmail";
export { getSesClient, resetSesClientForTests } from "./sesClient";
export { buildEmail } from "./templates";
export type { EmailTemplate, EmailData } from "./templates";
