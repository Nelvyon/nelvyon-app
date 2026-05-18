import { HELP_ARTICLES, HelpArticle } from "@/features/help/content";
import { inferHelpModuleFromPath } from "@/features/help/context";
import { BotReply } from "@/features/helpbot/types";

const STOPWORDS = new Set(["the", "a", "an", "and", "or", "to", "for", "with", "in", "on", "of", "de", "la", "el"]);

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && !STOPWORDS.has(s));
}

function scoreArticle(questionTokens: string[], article: HelpArticle, routeModule: string | null) {
  const blob = `${article.title} ${article.summary} ${article.body} ${article.kind}`.toLowerCase();
  let score = 0;
  for (const token of questionTokens) {
    if (blob.includes(token)) score += 2;
  }
  if (routeModule && article.module === routeModule) score += 2;
  return score;
}

function detectHandoff(question: string): BotReply | null {
  const q = question.toLowerCase();
  if (/(bug|error|fails|broken|not work|500|404|crash|issue)/.test(q)) {
    return {
      answer: "This looks like a bug. Please submit a Bug form so the workspace team can track it with full context.",
      confidence: "high",
      handoffKind: "bug",
      handoffHref: "/help#structured-forms",
    };
  }
  if (/(feedback|suggestion|improve|feature request)/.test(q)) {
    return {
      answer: "This sounds like product feedback. Please send it through the Feedback form so it is captured correctly.",
      confidence: "high",
      handoffKind: "feedback",
      handoffHref: "/help#structured-forms",
    };
  }
  if (/(blocked|stuck|cannot|can't|need help|need guidance)/.test(q)) {
    return {
      answer: "This sounds like a workflow block. Please use the Help form so the request is routed with the right context.",
      confidence: "high",
      handoffKind: "help",
      handoffHref: "/help#structured-forms",
    };
  }
  return null;
}

export function answerHelpQuestion(question: string, pathname: string): BotReply {
  const handoff = detectHandoff(question);
  if (handoff) return handoff;

  const tokens = tokenize(question);
  const routeModule = inferHelpModuleFromPath(pathname);
  const ranked = HELP_ARTICLES.map((article) => ({
    article,
    score: scoreArticle(tokens, article, routeModule),
  })).sort((a, b) => b.score - a.score);

  const top = ranked[0];
  if (!top || top.score < 2) {
    return {
      answer: "I am not confident enough to answer this safely. Open the relevant module guide or submit a Help form.",
      confidence: "low",
      handoffKind: "help",
      handoffHref: "/help#structured-forms",
    };
  }

  return {
    answer: `${top.article.summary} Open ${top.article.title} and follow the linked action.`,
    confidence: top.score >= 4 ? "high" : "low",
    article: top.article,
    ...(top.score >= 4 ? {} : { handoffKind: "help" as const, handoffHref: "/help#structured-forms" }),
  };
}
