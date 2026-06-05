import { describe, expect, it } from "vitest";

import {
  DEFAULT_DEAL_FORM,
  emptyDealForm,
  formStateToCreatePayload,
  validateDealForm,
} from "../dealFormUtils";

describe("dealFormUtils", () => {
  it("requires a non-empty title", () => {
    const result = validateDealForm({ ...DEFAULT_DEAL_FORM, title: "   " });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/título/i);
  });

  it("rejects invalid probability", () => {
    const result = validateDealForm({ ...DEFAULT_DEAL_FORM, title: "Acme", probability: "150" });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/probabilidad/i);
  });

  it("preselects contact when creating from contact context", () => {
    const form = emptyDealForm("contact-uuid");
    expect(form.contact_id).toBe("contact-uuid");
  });

  it("maps valid form to create payload", () => {
    const payload = formStateToCreatePayload({
      ...DEFAULT_DEAL_FORM,
      title: "  Enterprise  ",
      value: "12000",
      probability: "75",
      contact_id: "c1",
      source: "inbound",
    });
    expect(payload).toEqual({
      title: "Enterprise",
      contact_id: "c1",
      value: 12000,
      currency: "EUR",
      stage: "new",
      probability: 75,
      expected_close_date: null,
      source: "inbound",
      notes: null,
    });
  });
});
