// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@aws-sdk/client-ses", () => ({
  SESClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  SendEmailCommand: vi.fn().mockImplementation((input) => input),
}));

import { resetSesClientForTests } from "../../email/sesClient";
import { buildEmail } from "../../email/templates";
import { sendEmail } from "../../email/emailService";

describe("email", () => {
  beforeEach(() => {
    resetSesClientForTests();
  });

  it("buildEmail email_verify incluye enlace de confirmación", () => {
    const email = buildEmail("email_verify", {
      email: "test@example.com",
      name: "Test",
      appUrl: "https://nelvyon.com",
      verifyUrl: "https://nelvyon.com/api/auth/verify-email?token=abc",
    });
    expect(email.subject).toContain("Confirma");
    expect(email.html).toContain("verify-email?token=abc");
  });

  it("buildEmail welcome genera subject correcto", () => {
    const email = buildEmail("welcome", {
      email: "test@example.com",
      name: "Test",
      appUrl: "https://nelvyon.com",
    });
    expect(email.subject).toBe("Bienvenido a NELVYON");
    expect(email.to).toBe("test@example.com");
  });

  it("buildEmail plan_activated incluye plan en subject", () => {
    const email = buildEmail("plan_activated", {
      email: "test@example.com",
      plan: "Pro",
      periodEnd: "01/06/2026",
      appUrl: "https://nelvyon.com",
    });
    expect(email.subject).toContain("Pro");
  });

  it("sendEmail llama a SESClient.send sin lanzar error", async () => {
    await expect(
      sendEmail("welcome", {
        email: "test@example.com",
        name: "Test",
        appUrl: "https://nelvyon.com",
      }),
    ).resolves.toBeUndefined();
  });
});
