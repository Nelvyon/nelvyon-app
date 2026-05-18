export const HELP_MODULES = ["crm", "inbox", "campaigns", "automations", "billing", "settings", "os"] as const;

export type HelpModule = (typeof HELP_MODULES)[number];

export interface HelpArticle {
  id: string;
  module: HelpModule;
  title: string;
  kind: "faq" | "howto" | "first_steps";
  summary: string;
  body: string;
  href: string;
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "crm-first-client",
    module: "crm",
    title: "Create your first CRM client",
    kind: "first_steps",
    summary: "Start activation by creating a client profile with name and sector.",
    body: "Open CRM, click New client, and save business_name + sector. This unlocks project and campaign flows.",
    href: "/crm/clients/new",
  },
  {
    id: "inbox-ticket-types",
    module: "inbox",
    title: "Which ticket should I open?",
    kind: "faq",
    summary: "Use Bug, Help request, or Feedback depending on the issue type.",
    body: "Bug is for broken behavior. Help request is for guidance. Feedback is for product suggestions.",
    href: "/help#structured-forms",
  },
  {
    id: "campaign-first-launch",
    module: "campaigns",
    title: "Launch first campaign without manual IDs",
    kind: "howto",
    summary: "Use the assistant on New campaign: client, project, then campaign.",
    body: "The assistant creates a project row first and then submits the campaign linked to that project_id automatically.",
    href: "/campaigns/new",
  },
  {
    id: "automations-job-retry",
    module: "automations",
    title: "Retry a failed automation job",
    kind: "howto",
    summary: "Operators can retry failed jobs from automation job details.",
    body: "Open Automations > Jobs, select a failed job, and use Retry if your role has edit permissions.",
    href: "/automations/jobs",
  },
  {
    id: "billing-understand-usage",
    module: "billing",
    title: "Understand usage and limits",
    kind: "first_steps",
    summary: "Read usage bars and invoice list before deciding on upgrades.",
    body: "Billing shows plan summary, usage-vs-limit bars, and invoices pulled from backend billing endpoints.",
    href: "/billing",
  },
  {
    id: "settings-workspace-profile",
    module: "settings",
    title: "Set workspace profile",
    kind: "howto",
    summary: "Update branding and timezone to complete workspace activation step.",
    body: "Go to Settings and save tenant/workspace profile fields. This maps to onboarding step workspace.",
    href: "/settings",
  },
  {
    id: "os-operations-overview",
    module: "os",
    title: "Use operations overview to triage",
    kind: "faq",
    summary: "OS centralizes automation health, recent jobs, and module shortcuts.",
    body: "When issues appear, start in OS to inspect failed/pending jobs and jump into the affected module.",
    href: "/os",
  },
];

export function getHelpModuleTitle(module: HelpModule): string {
  switch (module) {
    case "crm":
      return "CRM";
    case "inbox":
      return "Inbox";
    case "campaigns":
      return "Campaigns";
    case "automations":
      return "Automations";
    case "billing":
      return "Billing";
    case "settings":
      return "Settings";
    case "os":
      return "OS";
  }
}
