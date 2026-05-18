/** @vitest-environment node */
import { describe, expect, it } from "vitest";

import {
  buildEmailBundleFiles,
  createEmailBundleZip,
  listZipEntryNames,
} from "../artifacts/emailBundleBuilder";

const executionJson = JSON.stringify({
  emails: [
    { subject: "Bienvenida", preheader: "Empieza hoy", body: "Hola,\n\nGracias por unirte.", cta: "Empezar" },
    { subject: "Oferta", preheader: "Solo 48h", body: "Última oportunidad.", cta: "Comprar" },
  ],
});

describe("emailBundleBuilder", () => {
  it("genera un HTML por email con tablas responsive", () => {
    const files = buildEmailBundleFiles(executionJson, { clientName: "Acme" });
    expect(files["emails/email-01.html"]).toContain("<table role=\"presentation\"");
    expect(files["emails/email-01.html"]).toContain("Bienvenida");
    expect(files["emails/email-02.html"]).toContain("Oferta");
  });

  it("ZIP incluye todos los emails", () => {
    const files = buildEmailBundleFiles(executionJson, { clientName: "Acme" });
    const zip = createEmailBundleZip(files);
    const names = listZipEntryNames(zip);
    expect(names).toContain("emails/email-01.html");
    expect(names).toContain("emails/email-02.html");
    expect(names).toContain("README.txt");
  });
});
