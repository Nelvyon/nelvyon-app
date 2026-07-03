import { describe, it, expect } from "vitest";

import {
  buildMockAgentOutput,
  buildMockChatReply,
  buildMockCopies,
} from "../nelvyonZeroCostAi";

describe("nelvyonZeroCostAi", () => {
  it("buildMockCopies returns variations without API key", () => {
    const copies = buildMockCopies({
      type: "email_subject",
      context: "Reactivación clientes inactivos",
      variations: 3,
      company: "Acme",
    });
    expect(copies).toHaveLength(3);
    expect(copies[0]!.length).toBeGreaterThan(5);
  });

  it("buildMockChatReply routes CRM questions", () => {
    const reply = buildMockChatReply({
      messages: [{ role: "user", content: "¿Cómo uso el CRM?" }],
      company: "Test Co",
    });
    expect(reply.toLowerCase()).toContain("crm");
  });

  it("buildMockAgentOutput returns structured SEO plan", () => {
    const out = buildMockAgentOutput("seo", "keywords para clínica dental", "Clínica X");
    expect(out).toContain("SEO");
    expect(out).toContain("Clínica X");
  });
});
