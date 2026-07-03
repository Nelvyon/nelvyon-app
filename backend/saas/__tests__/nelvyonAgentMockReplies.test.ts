import { describe, it, expect } from "vitest";

import { NELVYON_AGENT_SKILLS } from "../nelvyonAgentSkillsCatalog";
import { buildMockAgentReply, buildMockSocialPost } from "../nelvyonAgentMockReplies";

describe("nelvyonAgentMockReplies", () => {
  it("covers all 6 skills with non-empty fallbacks", () => {
    for (const skill of NELVYON_AGENT_SKILLS) {
      const reply = buildMockAgentReply(skill, "mensaje de prueba", false);
      expect(reply.length).toBeGreaterThan(20);
    }
  });

  it("escalates with human handoff copy", () => {
    const skill = NELVYON_AGENT_SKILLS[0]!;
    const reply = buildMockAgentReply(skill, "hola", true);
    expect(reply.toLowerCase()).toContain("especialista");
  });

  it("nelvyon_services responds to pack keywords", () => {
    const skill = NELVYON_AGENT_SKILLS.find((s) => s.id === "nelvyon_services")!;
    const reply = buildMockAgentReply(skill, "quiero un pack seo", false);
    expect(reply.toLowerCase()).toMatch(/seo|pack|nelvyon/);
  });

  it("social_publisher responds to instagram", () => {
    const skill = NELVYON_AGENT_SKILLS.find((s) => s.id === "social_publisher")!;
    const reply = buildMockAgentReply(skill, "post para instagram", false);
    expect(reply.toLowerCase()).toMatch(/instagram|post|hashtag/);
  });

  it("buildMockSocialPost returns 0-cost draft", () => {
    const post = buildMockSocialPost({ topic: "Promo verano", platform: "linkedin" });
    expect(post.mock).toBe(true);
    expect(post.content).toContain("Promo verano");
    expect(post.hashtags.length).toBeGreaterThan(0);
  });
});
