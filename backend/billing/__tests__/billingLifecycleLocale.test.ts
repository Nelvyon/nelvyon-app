import { describe, expect, it } from "vitest";
import {
  cancellationScheduledEmail,
  offboardingEmail,
} from "../cancellationEmailTemplates";
import {
  finalWarningEmail,
  paymentFailedEmail,
  reactivationEmail,
  secondNoticeEmail,
  suspensionEmail,
} from "../dunningEmailTemplates";

describe("billing lifecycle email locales", () => {
  it("keeps Spanish default subjects for backward compatibility", () => {
    expect(paymentFailedEmail("Ana", "pro", "https://x").subject).toContain("pago");
    expect(cancellationScheduledEmail("Ana", "pro", "2026-08-01", "https://x").subject).toContain(
      "cancelará",
    );
  });

  it("localizes paymentFailed to en/fr/de/it/pt", () => {
    expect(paymentFailedEmail("Ana", "pro", "https://x", "en").subject).toMatch(/payment/i);
    expect(paymentFailedEmail("Ana", "pro", "https://x", "fr").html).toContain('lang="fr"');
    expect(paymentFailedEmail("Ana", "pro", "https://x", "de").text).toMatch(/Hallo/);
    expect(paymentFailedEmail("Ana", "pro", "https://x", "it").subject).toMatch(/pagamento/i);
    expect(paymentFailedEmail("Ana", "pro", "https://x", "pt").subject).toMatch(/pagamento/i);
  });

  it("localizes remaining dunning + cancellation templates", () => {
    expect(secondNoticeEmail("Ana", 3, "https://x", "en").subject).toMatch(/Second notice/i);
    expect(finalWarningEmail("Ana", "https://x", "en").subject).toMatch(/tomorrow/i);
    expect(suspensionEmail("Ana", "https://x", "en").subject).toMatch(/suspended/i);
    expect(reactivationEmail("Ana", "pro", "en").subject).toMatch(/reactivated/i);
    expect(cancellationScheduledEmail("Ana", "pro", "2026-08-01", "https://x", "en").text).toMatch(
      /cancels/i,
    );
    expect(offboardingEmail("Ana", "https://export", "en").subject).toMatch(/Thank you/i);
  });
});
