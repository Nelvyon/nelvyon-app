export interface BotEvalFixture {
  id: string;
  question: string;
  pathname: string;
  expect: "article" | "handoff_bug" | "handoff_help" | "handoff_feedback";
}

export const BOT_EVAL_FIXTURES: BotEvalFixture[] = [
  {
    id: "campaign-no-project-id",
    question: "How do I create a campaign without entering project id manually?",
    pathname: "/campaigns/new",
    expect: "article",
  },
  {
    id: "billing-overview",
    question: "Where can I see usage and invoices?",
    pathname: "/billing",
    expect: "article",
  },
  {
    id: "report-bug",
    question: "Campaign save fails with 500 error",
    pathname: "/campaigns/new",
    expect: "handoff_bug",
  },
  {
    id: "request-help",
    question: "I am blocked and need guidance for automations setup",
    pathname: "/automations/jobs",
    expect: "handoff_help",
  },
  {
    id: "feedback",
    question: "Feature request: improve invoice filters",
    pathname: "/billing",
    expect: "handoff_feedback",
  },
];
