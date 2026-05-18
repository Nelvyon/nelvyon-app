import { Resend } from "resend";

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

  async sendWelcome(to: string, name: string, companyName: string): Promise<EmailResult> {
    const onboardingUrl = `${process.env.APP_URL ?? "https://app.nelvyon.com"}/saas/onboarding`;
    return this.sendEmail("welcome", to, `Bienvenido a NELVYON, ${name}`, welcomeTemplate(name, companyName, onboardingUrl));
  }

  async sendJobCompleted(to: string, name: string, serviceId: string, jobId: string, summary: string): Promise<EmailResult> {
    const jobUrl = `${process.env.APP_URL ?? "https://app.nelvyon.com"}/os/jobs/${jobId}`;
    return this.sendEmail(
      "job_completed",
      to,
      `Tu servicio ${serviceId} esta listo`,
      jobCompletedTemplate(name, serviceId, jobId, summary, jobUrl),
    );
  }

  async sendInvoice(to: string, name: string, plan: string, amount: number, invoiceUrl: string): Promise<EmailResult> {
    return this.sendEmail("invoice", to, `Factura NELVYON - Plan ${plan}`, invoiceTemplate(name, plan, amount, invoiceUrl));
  }

  async sendPasswordReset(to: string, name: string, resetUrl: string): Promise<EmailResult> {
    return this.sendEmail("password_reset", to, "Restablece tu contrasena NELVYON", passwordResetTemplate(name, resetUrl));
  }

  async sendOnboardingComplete(to: string, name: string, companyName: string, dashboardUrl: string): Promise<EmailResult> {
    return this.sendEmail(
      "onboarding_complete",
      to,
      `${companyName} esta lista en NELVYON`,
      onboardingCompleteTemplate(name, companyName, dashboardUrl),
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
