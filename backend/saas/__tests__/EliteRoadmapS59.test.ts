import { describe, expect, it } from "vitest";

import {
  deriveGeoChecklist,
  scoreGeoChecklist,
} from "../SaasGeoVisibilityReportService";
import { buildDeliverableSocialProofPost } from "../nelvyonAgentMockReplies";

describe("Elite roadmap S59", () => {
  it("deriveGeoChecklist detects schema, FAQ and llms.txt", () => {
    const html = `<html><head><script type="application/ld+json">{"@type":"Organization"}</script>
<meta name="description" content="Test"/></head><body><h1>Hello</h1><section>FAQPage preguntas frecuentes</section>contacto</body></html>`;
    const llms = "We are a dental clinic in Madrid offering implants and whitening.";
    const items = deriveGeoChecklist(html, llms);
    expect(items.find((i) => i.id === "schema_org")?.passed).toBe(true);
    expect(items.find((i) => i.id === "faq_schema")?.passed).toBe(true);
    expect(items.find((i) => i.id === "llms_txt")?.passed).toBe(true);
    expect(scoreGeoChecklist(items)).toBeGreaterThanOrEqual(80);
  });

  it("scoreGeoChecklist weights high severity checks", () => {
    const items = deriveGeoChecklist('<html><head><meta name="description" content="x"/></head><body><h1>Hi</h1></body></html>', null);
    const score = scoreGeoChecklist(items);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it("buildDeliverableSocialProofPost includes title and QA", () => {
    const post = buildDeliverableSocialProofPost({
      title: "Landing HelioVolt",
      qaScore: 92,
      platform: "linkedin",
    });
    expect(post.content).toContain("Landing HelioVolt");
    expect(post.content).toContain("92");
    expect(post.platform).toBe("linkedin");
    expect(post.hashtags.length).toBeGreaterThan(0);
    expect(post.mock).toBe(true);
  });

  it("buildDeliverableSocialProofPost defaults to instagram tone", () => {
    const post = buildDeliverableSocialProofPost({ packName: "Local Growth" });
    expect(post.content).toContain("Local Growth");
    expect(post.platform).toBe("linkedin");
  });
});
