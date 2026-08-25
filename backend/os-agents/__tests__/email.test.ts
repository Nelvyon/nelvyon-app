// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@aws-sdk/client-ses", () => ({
  SESClient: vi.fn(function MockSESClient() {
    return {
      send: vi.fn().mockResolvedValue({}),
    };
  }),
  SendEmailCommand: vi.fn(function MockSendEmailCommand(input) {
    return input;
  }),
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

  it("sendEmail llega al transporte cuando el envio esta ENCENDIDO", async () => {
    // Esta prueba comprueba el contrato con el transporte, asi que necesita el
    // envio encendido de forma EXPLICITA.
    //
    // Antes pasaba sin decir nada porque no habia interruptor: el correo salia
    // siempre. Con credenciales de SES en el entorno, esta misma prueba habria
    // mandado un correo REAL a `test@example.com`. Ahora hay que pedirlo.
    const previo = process.env.NELVYON_EMAIL_ENABLED;
    process.env.NELVYON_EMAIL_ENABLED = "1";
    try {
      await expect(
        sendEmail("welcome", {
          email: "test@example.com",
          name: "Test",
          appUrl: "https://nelvyon.com",
        }),
      ).resolves.toBeUndefined();
    } finally {
      if (previo === undefined) delete process.env.NELVYON_EMAIL_ENABLED;
      else process.env.NELVYON_EMAIL_ENABLED = previo;
    }
  });

  it("con el envio APAGADO, sendEmail se niega en vez de fingir", async () => {
    // La otra mitad: el valor por defecto fuera de produccion protege las
    // fixtures, y negarse es lo honesto -un envio que se da por hecho sin salir
    // deja al cliente creyendo que ha avisado a alguien-.
    const previo = process.env.NELVYON_EMAIL_ENABLED;
    process.env.NELVYON_EMAIL_ENABLED = "0";
    try {
      await expect(
        sendEmail("welcome", { email: "test@example.com", name: "Test", appUrl: "https://nelvyon.com" }),
      ).rejects.toThrow(/desactivado/i);
    } finally {
      if (previo === undefined) delete process.env.NELVYON_EMAIL_ENABLED;
      else process.env.NELVYON_EMAIL_ENABLED = previo;
    }
  });
});
