import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { NelvyonEmailService } from "../NelvyonEmailService";
import { buildEmail } from "../templates";
import { invoiceTemplate } from "../templates/invoice";
import { jobCompletedTemplate } from "../templates/jobCompleted";
import { onboardingCompleteTemplate } from "../templates/onboardingComplete";
import { passwordResetTemplate } from "../templates/passwordReset";
import { welcomeTemplate } from "../templates/welcome";

describe("NelvyonEmailService mock mode", () => {
  const envBackup = process.env.RESEND_API_KEY;

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
  });
  afterEach(() => {
    if (envBackup) process.env.RESEND_API_KEY = envBackup;
    else delete process.env.RESEND_API_KEY;
    vi.restoreAllMocks();
  });

  it("sendWelcome en modo mock retorna success: true", async () => {
    const svc = new NelvyonEmailService();
    await expect(svc.sendWelcome("a@test.com", "Ana", "Acme")).resolves.toMatchObject({ success: true });
  });

  it("sendWelcome en modo mock no llama a Resend API", async () => {
    const fake = { emails: { send: vi.fn() } };
    const svc = new NelvyonEmailService(undefined);
    await svc.sendWelcome("a@test.com", "Ana", "Acme");
    expect(fake.emails.send).not.toHaveBeenCalled();
  });

  it("sendJobCompleted en modo mock retorna success: true", async () => {
    const svc = new NelvyonEmailService();
    await expect(svc.sendJobCompleted("a@test.com", "Ana", "seo", "job-1", "done")).resolves.toMatchObject({ success: true });
  });
  it("sendInvoice en modo mock retorna success: true", async () => {
    const svc = new NelvyonEmailService();
    await expect(svc.sendInvoice("a@test.com", "Ana", "pro", 29.99, "https://inv")).resolves.toMatchObject({ success: true });
  });
  it("sendPasswordReset en modo mock retorna success: true", async () => {
    const svc = new NelvyonEmailService();
    await expect(svc.sendPasswordReset("a@test.com", "Ana", "https://reset")).resolves.toMatchObject({ success: true });
  });
  it("sendOnboardingComplete en modo mock retorna success: true", async () => {
    const svc = new NelvyonEmailService();
    await expect(svc.sendOnboardingComplete("a@test.com", "Ana", "Acme", "https://dash")).resolves.toMatchObject({ success: true });
  });
});

describe("Email templates", () => {
  it("Template welcome incluye nombre del usuario", () => {
    expect(welcomeTemplate("Ana", "Acme", "https://x")).toContain("Ana");
  });
  it("Template welcome incluye CTA button", () => {
    expect(welcomeTemplate("Ana", "Acme", "https://x")).toContain("Ir al onboarding");
  });
  it("Template welcome en locale en usa English CTA", () => {
    expect(welcomeTemplate("Ana", "Acme", "https://x", "en")).toContain("Go to onboarding");
  });
  it("Template passwordReset en locale en usa English CTA", () => {
    expect(passwordResetTemplate("Ana", "https://reset", "en")).toContain("Reset password");
  });
  it("Template invoice en locale en usa English CTA", () => {
    expect(invoiceTemplate("Ana", "pro", 99.5, "https://inv", "en")).toContain("View invoice");
  });
  it("Template jobCompleted en locale en usa English CTA", () => {
    expect(jobCompletedTemplate("Ana", "seo", "j1", "summary", "https://x", "en")).toContain("View result");
  });
  it("Template onboardingComplete en locale en usa English CTA", () => {
    expect(onboardingCompleteTemplate("Ana", "Acme", "https://dash", "en")).toContain("Go to dashboard");
  });
  it("Template jobCompleted incluye serviceId", () => {
    expect(jobCompletedTemplate("Ana", "seo", "j1", "summary", "https://x")).toContain("seo");
  });
  it("Template jobCompleted incluye jobId en el link", () => {
    expect(jobCompletedTemplate("Ana", "seo", "job-99", "summary", "https://app/os/jobs/job-99")).toContain("job-99");
  });
  it("Template invoice incluye plan y amount", () => {
    const html = invoiceTemplate("Ana", "pro", 99.5, "https://inv");
    expect(html).toContain("pro");
    expect(html).toContain("99.50");
  });
  it("Template passwordReset incluye resetUrl", () => {
    expect(passwordResetTemplate("Ana", "https://reset")).toContain("https://reset");
  });
  it("Template onboardingComplete incluye companyName", () => {
    expect(onboardingCompleteTemplate("Ana", "Acme Corp", "https://dash")).toContain("Acme Corp");
  });
  it("Todos los templates incluyen \"© 2026 NELVYON\" en footer", () => {
    const templates = [
      welcomeTemplate("A", "B", "https://x"),
      jobCompletedTemplate("A", "seo", "j", "s", "https://x"),
      invoiceTemplate("A", "pro", 10, "https://x"),
      passwordResetTemplate("A", "https://x"),
      onboardingCompleteTemplate("A", "B", "https://x"),
    ];
    for (const t of templates) expect(t).toContain("© 2026 NELVYON");
  });
  it("Todos los templates tienen max-width: 600px", () => {
    const templates = [
      welcomeTemplate("A", "B", "https://x"),
      jobCompletedTemplate("A", "seo", "j", "s", "https://x"),
      invoiceTemplate("A", "pro", 10, "https://x"),
      passwordResetTemplate("A", "https://x"),
      onboardingCompleteTemplate("A", "B", "https://x"),
    ];
    for (const t of templates) expect(t).toContain("max-width: 600px");
  });
});

describe("SES catalog locale wiring (payment_failed / cancellation)", () => {
  it("payment_failed en locale en usa English subject + CTA", () => {
    const email = buildEmail(
      "payment_failed",
      { email: "a@test.com", appUrl: "https://app.nelvyon.com" },
      "en",
    );
    expect(email.subject).toContain("Payment problem");
    expect(email.html).toContain("Update payment method");
  });

  it("cancellation en locale en usa English subject + CTA", () => {
    const email = buildEmail(
      "cancellation",
      { email: "a@test.com", appUrl: "https://app.nelvyon.com", accessUntil: "2026-08-01" },
      "en",
    );
    expect(email.subject).toContain("cancelled");
    expect(email.html).toContain("Reactivate plan");
    expect(email.text).toContain("2026-08-01");
  });

  it("payment_failed sin locale sigue en español (default)", () => {
    const email = buildEmail("payment_failed", {
      email: "a@test.com",
      appUrl: "https://app.nelvyon.com",
    });
    expect(email.subject).toContain("pago");
  });
});

describe("SES catalog locale wiring (Lote A.2 templates)", () => {
  const baseParams = {
    email: "a@test.com",
    name: "Ana",
    appUrl: "https://app.nelvyon.com",
  };

  it("email_verify en locale en usa English subject + CTA", () => {
    const email = buildEmail(
      "email_verify",
      { ...baseParams, verifyUrl: "https://app.nelvyon.com/verify" },
      "en",
    );
    expect(email.subject).toContain("Confirm your email");
    expect(email.html).toContain("Confirm email");
    expect(email.html).toContain('lang="en"');
  });

  it("email_verify sin locale sigue en español (default)", () => {
    const email = buildEmail("email_verify", {
      ...baseParams,
      verifyUrl: "https://app.nelvyon.com/verify",
    });
    expect(email.subject).toContain("Confirma");
    expect(email.html).toContain('lang="es"');
  });

  it("plan_activated en locale en usa English subject + CTA", () => {
    const email = buildEmail(
      "plan_activated",
      { email: baseParams.email, plan: "pro", periodEnd: "2026-08-01", appUrl: baseParams.appUrl },
      "en",
    );
    expect(email.subject).toContain("plan activated");
    expect(email.html).toContain("Go to dashboard");
    expect(email.html).toContain("Complete your profile");
  });

  it("plan_activated sin locale sigue en español (default)", () => {
    const email = buildEmail("plan_activated", {
      email: baseParams.email,
      plan: "pro",
      periodEnd: "01/08/2026",
      appUrl: baseParams.appUrl,
    });
    expect(email.subject).toContain("activado");
    expect(email.html).toContain("Completa tu perfil");
  });

  it("data_export_confirm en locale en usa English subject", () => {
    const email = buildEmail(
      "data_export_confirm",
      { ...baseParams, exportedAt: "2026-07-28" },
      "en",
    );
    expect(email.subject).toContain("exported your data");
    expect(email.html).toContain("Export date");
  });

  it("data_export_confirm sin locale sigue en español (default)", () => {
    const email = buildEmail("data_export_confirm", {
      ...baseParams,
      exportedAt: "28/07/2026",
    });
    expect(email.subject).toContain("exportado");
  });

  it("account_deleted en locale en usa English subject", () => {
    const email = buildEmail(
      "account_deleted",
      { ...baseParams, summary: "All workspaces removed." },
      "en",
    );
    expect(email.subject).toContain("account has been deleted");
    expect(email.html).toContain("Account scheduled for deletion");
  });

  it("account_deleted sin locale sigue en español (default)", () => {
    const email = buildEmail("account_deleted", {
      ...baseParams,
      summary: "Datos eliminados.",
    });
    expect(email.subject).toContain("eliminada");
  });

  it("nps_thank_you en locale en usa English subject + CTA", () => {
    const email = buildEmail(
      "nps_thank_you",
      { ...baseParams, score: "9" },
      "en",
    );
    expect(email.subject).toContain("Thanks for your feedback");
    expect(email.html).toContain("Back to dashboard");
  });

  it("nps_thank_you sin locale sigue en español (default)", () => {
    const email = buildEmail("nps_thank_you", {
      ...baseParams,
      score: "9",
    });
    expect(email.subject).toContain("Gracias");
    expect(email.html).toContain("Volver al dashboard");
  });

  it("welcome SES en locale en usa English dashboard CTA", () => {
    const email = buildEmail("welcome", baseParams, "en");
    expect(email.subject).toBe("Welcome to NELVYON");
    expect(email.html).toContain("Go to dashboard");
  });

  it("password_reset SES en locale en usa English CTA", () => {
    const email = buildEmail(
      "password_reset",
      { ...baseParams, resetUrl: "https://app.nelvyon.com/reset" },
      "en",
    );
    expect(email.html).toContain("Reset password");
  });

  it("invoice SES en locale en usa English labels", () => {
    const email = buildEmail(
      "invoice",
      {
        email: baseParams.email,
        invoiceId: "INV-1",
        period: "Jul 2026",
        plan: "pro",
        amount: "€29.99",
      },
      "en",
    );
    expect(email.subject).toContain("invoice");
    expect(email.html).toContain("Invoice no.");
    expect(email.html).toContain("Amount");
  });
});

describe("NelvyonEmailService real client path", () => {
  it("Si Resend lanza error → retorna { success: false, error: mensaje }", async () => {
    const svc = new NelvyonEmailService({
      emails: {
        send: vi.fn().mockRejectedValue(new Error("Resend down")),
      },
    });
    const out = await svc.sendWelcome("a@test.com", "Ana", "Acme");
    expect(out.success).toBe(false);
    expect(out.error).toContain("Resend down");
  });
});
