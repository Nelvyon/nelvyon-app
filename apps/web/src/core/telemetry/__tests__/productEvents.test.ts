import { trackProductEvent } from "@/core/telemetry/productEvents";

describe("trackProductEvent", () => {
  it("stores event envelope on window", () => {
    window.__nelvyonProductEvents = [];
    trackProductEvent("bot_result", { result: "article", module: "campaigns", confidence: "high" });
    expect(window.__nelvyonProductEvents).toHaveLength(1);
    expect(window.__nelvyonProductEvents?.[0]?.name).toBe("bot_result");
    expect(window.__nelvyonProductEvents?.[0]?.payload?.module).toBe("campaigns");
  });

  it("drops non-whitelisted and sensitive fields", () => {
    window.__nelvyonProductEvents = [];
    trackProductEvent("help_form_submitted", {
      module: "help",
      form_kind: "bug",
      subject: "raw user text",
      description: "contains PII",
      email: "a@b.com",
    });
    const payload = window.__nelvyonProductEvents?.[0]?.payload ?? {};
    expect(payload.module).toBe("help");
    expect(payload.form_kind).toBe("bug");
    expect(payload.subject).toBeUndefined();
    expect(payload.description).toBeUndefined();
    expect(payload.email).toBeUndefined();
  });
});
