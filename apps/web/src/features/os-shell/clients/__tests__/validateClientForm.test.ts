import { describe, expect, it } from "vitest";

import { validateClientForm } from "@/features/os-shell/clients/validateClientForm";

describe("validateClientForm", () => {
  it("requires business name", () => {
    expect(validateClientForm({ business_name: "  " })).toMatch(/obligatorio/i);
  });

  it("validates email format", () => {
    expect(
      validateClientForm({ business_name: "Acme", contact_email: "not-an-email" }),
    ).toMatch(/email/i);
  });

  it("passes valid form", () => {
    expect(
      validateClientForm({
        business_name: "Acme",
        contact_email: "hello@acme.com",
        website_url: "https://acme.com",
      }),
    ).toBeNull();
  });
});
