import { answerHelpQuestion } from "@/features/helpbot/engine";
import { BOT_EVAL_FIXTURES } from "@/features/helpbot/__tests__/fixtures";

describe("helpbot engine", () => {
  it("routes bug reports to structured bug form", () => {
    const reply = answerHelpQuestion("App crashes with 500 on save", "/campaigns/new");
    expect(reply.handoffKind).toBe("bug");
    expect(reply.handoffHref).toBe("/help#structured-forms");
  });

  it("returns article-based answer for known product question", () => {
    const reply = answerHelpQuestion("How to launch my first campaign?", "/campaigns/new");
    expect(reply.article?.module).toBe("campaigns");
    expect(reply.answer.length).toBeLessThan(220);
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
      if (reply.handoffKind === "bug") return "handoff_bug";
      if (reply.handoffKind === "feedback") return "handoff_feedback";
      return "handoff_help";
    });

    outcomes.forEach((outcome, index) => {
      expect(outcome).toBe(BOT_EVAL_FIXTURES[index]?.expect);
    });
  });
});
