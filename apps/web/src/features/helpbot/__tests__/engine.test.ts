import { answerHelpQuestion } from "@/features/helpbot/engine";
import { BOT_EVAL_FIXTURES } from "@/features/helpbot/__tests__/fixtures";

describe("helpbot engine", () => {
  it("routes bug reports to structured bug form", () => {
    const reply = answerHelpQuestion("App crashes with 500 on save", "/campaigns/new");
    expect(reply.handoffKind).toBe("bug");
    expect(reply.handoffHref).toBe("/help#structured-forms");
  });

  it("returns playbook for growth-oriented questions", () => {
    const reply = answerHelpQuestion("¿Cómo consigo más leads?", "/crm/clients");
    expect(reply.actionHref).toBe("/crm/clients/new");
    expect(reply.confidence).toBe("high");
  });

  it("returns article-based answer for specific help article match", () => {
    const reply = answerHelpQuestion("How do I create a campaign without entering project id manually?", "/campaigns/new");
    expect(reply.article?.module).toBe("campaigns");
    expect(reply.answer.length).toBeLessThan(280);
  });

  it("returns low-confidence help handoff for unknown question", () => {
    const reply = answerHelpQuestion("How do I tune quantum kernel scheduler thrash?", "/os");
    expect(reply.confidence).toBe("low");
    expect(reply.handoffKind).toBe("help");
  });

  it("passes offline fixtures for v1 success criteria", () => {
    const outcomes = BOT_EVAL_FIXTURES.map((fixture) => {
      const reply = answerHelpQuestion(fixture.question, fixture.pathname);
      if (reply.article) return "article";
      if (reply.actionHref) return "playbook";
      if (reply.handoffKind === "bug") return "handoff_bug";
      if (reply.handoffKind === "feedback") return "handoff_feedback";
      return "handoff_help";
    });

    outcomes.forEach((outcome, index) => {
      expect(outcome).toBe(BOT_EVAL_FIXTURES[index]?.expect);
    });
  });
});
