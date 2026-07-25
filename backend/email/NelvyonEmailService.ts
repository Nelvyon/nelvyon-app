import { Resend } from "resend";

import {
  getInvoiceCopy,
  getJobCompletedCopy,
  getOnboardingCompleteCopy,
  getPasswordResetCopy,
  getWelcomeCopy,
} from "./localeCopy";
import { invoiceTemplate } from "./templates/invoice";
import { jobCompletedTemplate } from "./templates/jobCompleted";
import { onboardingCompleteTemplate } from "./templates/onboardingComplete";
import { passwordResetTemplate } from "./templates/passwordReset";
import { welcomeTemplate } from "./templates/welcome";

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const FROM = "NELVYON <noreply@nelvyon.com>";

export interface EmailClientPort {
  emails: {
    send(input: {
      from: string;
      to: string;
      subject: string;
      html: string;
    }): Promise<{ data?: { id?: string | null } | null; error?: { message?: string } | null }>;
  };
}

export class NelvyonEmailService {
  private readonly resend?: EmailClientPort;

  constructor(client?: EmailClientPort) {
    if (client) {
      this.resend = client;
      return;
    }
    const apiKey = process.env.RESEND_API_KEY;
    if (typeof apiKey === "string" && apiKey.trim().length > 0) {
      this.resend = new Resend(apiKey.trim()) as unknown as EmailClientPort;
    }
  }

  private isMockMode(): boolean {
    return !this.resend;
  }

  private async sendEmail(type: string, to: string, subject: string, html: string): Promise<EmailResult> {
    if (this.isMockMode()) {
      console.log(`[EMAIL MOCK] Sending ${type} to ${to}`);
      return { success: true, messageId: "mock-id" };
    }
    try {
      const result = await this.resend!.emails.send({ from: FROM, to, subject, html });
      if (result.error) {
        return { success: false, error: result.error.message ?? "Unknown email error" };
      }
      return { success: true, messageId: result.data?.id ?? "sent-no-id" };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async sendWelcome(
    to: string,
    name: string,
    companyName: string,
    locale?: string | null,
  ): Promise<EmailResult> {
    const onboardingUrl = `${process.env.APP_URL ?? "https://app.nelvyon.com"}/saas/onboarding`;
    const copy = getWelcomeCopy(locale);
    return this.sendEmail(
      "welcome",
      to,
      copy.subject(name),
      welcomeTemplate(name, companyName, onboardingUrl, locale),
    );
  }

  async sendJobCompleted(
    to: string,
    name: string,
    serviceId: string,
    jobId: string,
    summary: string,
    locale?: string | null,
  ): Promise<EmailResult> {
    const jobUrl = `${process.env.APP_URL ?? "https://app.nelvyon.com"}/os/jobs/${jobId}`;
    const copy = getJobCompletedCopy(locale);
    return this.sendEmail(
      "job_completed",
      to,
      copy.subject(serviceId),
      jobCompletedTemplate(name, serviceId, jobId, summary, jobUrl, locale),
    );
  }

  async sendInvoice(
    to: string,
    name: string,
    plan: string,
    amount: number,
    invoiceUrl: string,
    locale?: string | null,
  ): Promise<EmailResult> {
    const copy = getInvoiceCopy(locale);
    return this.sendEmail(
      "invoice",
      to,
      copy.subject(plan),
      invoiceTemplate(name, plan, amount, invoiceUrl, locale),
    );
  }

  async sendPasswordReset(
    to: string,
    name: string,
    resetUrl: string,
    locale?: string | null,
  ): Promise<EmailResult> {
    const copy = getPasswordResetCopy(locale);
    return this.sendEmail(
      "password_reset",
      to,
      copy.subject,
      passwordResetTemplate(name, resetUrl, locale),
    );
  }

  async sendOnboardingComplete(
    to: string,
    name: string,
    companyName: string,
    dashboardUrl: string,
    locale?: string | null,
  ): Promise<EmailResult> {
    const copy = getOnboardingCompleteCopy(locale);
    return this.sendEmail(
      "onboarding_complete",
      to,
      copy.subject(companyName),
      onboardingCompleteTemplate(name, companyName, dashboardUrl, locale),
    );
  }
}

let cached: NelvyonEmailService | undefined;

export function getNelvyonEmailService(): NelvyonEmailService {
  if (!cached) cached = new NelvyonEmailService();
  return cached;
}

export function resetNelvyonEmailServiceForTests(): void {
  cached = undefined;
}
