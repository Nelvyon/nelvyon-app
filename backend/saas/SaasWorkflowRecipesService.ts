/**
 * SaasWorkflowRecipesService — importable workflow recipe library.
 * Official recipes are static (no DB read). Tenant custom recipes are stored in DB.
 * Import = create a real SaasWorkflow from a recipe template.
 */
import { DbClient } from "../db/DbClient";

export type RecipeCategory =
  | "lead-nurture"
  | "onboarding"
  | "re-engagement"
  | "sales"
  | "support"
  | "event-based"
  | "custom";

export type WorkflowRecipe = {
  id: string;
  tenantId: string | null;
  name: string;
  description: string;
  category: RecipeCategory;
  triggerType: string;
  tags: string[];
  isOfficial: boolean;
  nodes: Array<{ id: string; type: string; label: string; data?: Record<string, unknown> }>;
  edges: Array<{ id: string; source: string; target: string }>;
};

export class SaasWorkflowRecipesError extends Error {
  constructor(message: string, public readonly code: "NOT_FOUND" | "VALIDATION") {
    super(message);
    this.name = "SaasWorkflowRecipesError";
  }
}

// ---------------------------------------------------------------------------
// Official recipe catalog (static — never hits DB)
// ---------------------------------------------------------------------------
const OFFICIAL_RECIPES: WorkflowRecipe[] = [
  {
    id: "welcome-new-contact",
    tenantId: null,
    name: "Welcome New Contact",
    description: "Send a welcome email immediately when a new contact is created.",
    category: "onboarding",
    triggerType: "contact_created",
    tags: ["email", "onboarding", "welcome"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Contact Created", data: { triggerType: "contact_created" } },
      { id: "n2", type: "action", label: "Send Welcome Email", data: { actionType: "send_email", subject: "Welcome to {{company}}!", body: "Hi {{contact.name}},\n\nWelcome! We are glad to have you." } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }],
  },
  {
    id: "form-submitted-followup",
    tenantId: null,
    name: "Form Submission Follow-up",
    description: "Send a personalized follow-up when a contact submits a form.",
    category: "lead-nurture",
    triggerType: "form_submitted",
    tags: ["form", "lead", "follow-up"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Form Submitted", data: { triggerType: "form_submitted" } },
      { id: "n2", type: "action", label: "Send Follow-up Email", data: { actionType: "send_email", subject: "Thanks for reaching out!", body: "Hi {{contact.name}},\n\nWe received your message and will get back to you shortly." } },
      { id: "n3", type: "action", label: "Notify Team", data: { actionType: "notify", message: "New form submission from {{contact.name}} ({{contact.email}})" } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" }],
  },
  {
    id: "deal-won-celebration",
    tenantId: null,
    name: "Deal Won Celebration",
    description: "Notify the team and send a thank-you email when a deal is won.",
    category: "sales",
    triggerType: "deal_stage_changed",
    tags: ["deal", "won", "sales"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Deal Stage Changed", data: { triggerType: "deal_stage_changed", triggerConfig: { stage_to: "won" } } },
      { id: "n2", type: "action", label: "Notify Team", data: { actionType: "notify", message: "🎉 Deal won: {{deal.title}} — {{deal.value}} €" } },
      { id: "n3", type: "action", label: "Send Thank-You Email", data: { actionType: "send_email", subject: "Thank you for choosing us!", body: "Hi {{contact.name}},\n\nWe are thrilled to welcome you as a client!" } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" }],
  },
  {
    id: "re-engagement-inactive",
    tenantId: null,
    name: "Re-Engage Inactive Leads",
    description: "Triggered manually or on a schedule — send a re-engagement campaign to cold leads.",
    category: "re-engagement",
    triggerType: "manual",
    tags: ["re-engagement", "cold-leads", "email"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Manual Trigger", data: { triggerType: "manual" } },
      { id: "n2", type: "action", label: "Send Re-engagement Email", data: { actionType: "send_email", subject: "We miss you!", body: "Hi {{contact.name}},\n\nWe noticed you haven't been active in a while. Here is what's new…" } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }],
  },
  {
    id: "tag-added-vip",
    tenantId: null,
    name: "VIP Tag → Special Offer",
    description: "Send a special offer when a contact is tagged as VIP.",
    category: "sales",
    triggerType: "tag_added",
    tags: ["tag", "vip", "offer"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Tag Added", data: { triggerType: "tag_added", triggerConfig: { tag: "vip" } } },
      { id: "n2", type: "action", label: "Send VIP Offer", data: { actionType: "send_email", subject: "Your exclusive VIP offer 🎁", body: "Hi {{contact.name}},\n\nAs a VIP member, you have access to our exclusive benefits…" } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }],
  },
  {
    id: "email-opened-upsell",
    tenantId: null,
    name: "Email Opened → Upsell Sequence",
    description: "When a contact opens your campaign email, trigger an upsell follow-up.",
    category: "sales",
    triggerType: "email_opened",
    tags: ["email", "open", "upsell"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Email Opened", data: { triggerType: "email_opened" } },
      { id: "n2", type: "action", label: "Send Upsell Email", data: { actionType: "send_email", subject: "Glad you opened it — here's more!", body: "Hi {{contact.name}},\n\nWe noticed you opened our email. We thought you'd love to know about…" } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }],
  },
  {
    id: "webhook-in-crm-update",
    tenantId: null,
    name: "Incoming Webhook → Update Contact",
    description: "When a webhook is received from an external system, update the matching contact.",
    category: "event-based",
    triggerType: "webhook_in",
    tags: ["webhook", "integration", "crm"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Webhook Received", data: { triggerType: "webhook_in" } },
      { id: "n2", type: "action", label: "Notify Team", data: { actionType: "notify", message: "Incoming webhook from {{source}}: {{payload.event}}" } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }],
  },
  {
    id: "date-reached-birthday",
    tenantId: null,
    name: "Date Reached → Birthday Email",
    description: "Send a birthday email on a specific date each year.",
    category: "event-based",
    triggerType: "date_reached",
    tags: ["date", "birthday", "email"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Date Reached", data: { triggerType: "date_reached" } },
      { id: "n2", type: "action", label: "Send Birthday Email", data: { actionType: "send_email", subject: "Happy Birthday! 🎂", body: "Hi {{contact.name}},\n\nWishing you a wonderful birthday from all of us!" } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }],
  },
  {
    id: "stage-changed-proposal",
    tenantId: null,
    name: "Contact Moved to Proposal → Send Proposal Email",
    description: "Automatically send a proposal email when a contact enters the Proposal stage.",
    category: "sales",
    triggerType: "stage_changed",
    tags: ["stage", "proposal", "email"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Stage Changed", data: { triggerType: "stage_changed" } },
      { id: "n2", type: "condition", label: "Is Proposal Stage?", data: { field: "contact.pipeline_stage", operator: "equals", value: "proposal" } },
      { id: "n3", type: "action", label: "Send Proposal", data: { actionType: "send_email", subject: "Your custom proposal is ready", body: "Hi {{contact.name}},\n\nPlease find your tailored proposal attached…" } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" }],
  },
  {
    id: "email-clicked-demo",
    tenantId: null,
    name: "Email Click → Book a Demo",
    description: "When a contact clicks a link in your campaign, invite them to book a demo.",
    category: "lead-nurture",
    triggerType: "email_clicked",
    tags: ["email", "click", "demo", "booking"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Email Link Clicked", data: { triggerType: "email_clicked" } },
      { id: "n2", type: "action", label: "Send Demo Invite", data: { actionType: "send_email", subject: "Ready to see it live? Book a demo!", body: "Hi {{contact.name}},\n\nWe noticed you clicked our link. Book a free 30-min demo: {{booking_link}}" } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }],
  },
  {
    id: "hot-lead-score-notify",
    tenantId: null,
    name: "Hot Lead (Score ≥ 70) → Alert Sales",
    description: "Notify the team and create a follow-up task when lead score crosses the hot threshold.",
    category: "sales",
    triggerType: "score_threshold",
    tags: ["scoring", "hot-lead", "sales"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Score Threshold", data: { triggerType: "score_threshold", triggerConfig: { min_score: 70, category: "hot" } } },
      { id: "n2", type: "action", label: "Notify Sales", data: { actionType: "notify", message: "🔥 Hot lead: {{contact.name}} (score {{contact.score}})" } },
      { id: "n3", type: "action", label: "Create Follow-up Task", data: { actionType: "create_task", title: "Call hot lead {{contact.name}}", description: "Score crossed hot threshold", dueInDays: 0 } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" }],
  },
  {
    id: "review-positive-thankyou",
    tenantId: null,
    name: "5-Star Review → Thank You",
    description: "Send a thank-you email when a positive review is received.",
    category: "support",
    triggerType: "review_received",
    tags: ["reviews", "reputation", "thank-you"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Review Received", data: { triggerType: "review_received", triggerConfig: { min_rating: 5 } } },
      { id: "n2", type: "action", label: "Thank You Email", data: { actionType: "send_email", subject: "Thank you for your review! ⭐", body: "Hi {{contact.name}},\n\nWe appreciate your kind words. It means a lot to our team!" } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }],
  },
  {
    id: "negative-review-alert",
    tenantId: null,
    name: "Low Review → Escalate to Team",
    description: "Alert the team immediately when a 1–2 star review arrives.",
    category: "support",
    triggerType: "review_received",
    tags: ["reviews", "escalation", "support"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Low Review", data: { triggerType: "review_received", triggerConfig: { min_rating: 1 } } },
      { id: "n2", type: "action", label: "Escalate", data: { actionType: "notify", message: "⚠️ Low review from {{contact.name}} — respond within 2h" } },
      { id: "n3", type: "action", label: "Create Recovery Task", data: { actionType: "create_task", title: "Recover unhappy client {{contact.name}}", dueInDays: 0 } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" }],
  },
  {
    id: "sequence-welcome",
    tenantId: null,
    name: "Sequence Enrolled → Welcome Email",
    description: "Send a welcome email when a contact is enrolled in a nurture sequence.",
    category: "onboarding",
    triggerType: "sequence_enrolled",
    tags: ["sequence", "drip", "welcome"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Sequence Enrolled", data: { triggerType: "sequence_enrolled" } },
      { id: "n2", type: "action", label: "Welcome Email", data: { actionType: "send_email", subject: "You're in — here's what to expect", body: "Hi {{contact.name}},\n\nYou've been enrolled in our nurture sequence. Watch your inbox!" } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }],
  },
  {
    id: "pack-completed-notify",
    tenantId: null,
    name: "OS Pack Completed → Notify Client",
    description: "Notify the team when an AI marketing pack finishes (Nelvyon differentiator).",
    category: "event-based",
    triggerType: "job_completed",
    tags: ["os", "pack", "agency"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Pack Completed", data: { triggerType: "job_completed" } },
      { id: "n2", type: "action", label: "Notify Team", data: { actionType: "notify", message: "✅ Pack completed for {{contact.name}} — review deliverables in portal" } },
      { id: "n3", type: "action", label: "Client Email", data: { actionType: "send_email", subject: "Your deliverables are ready!", body: "Hi {{contact.name}},\n\nYour marketing pack is complete. Log in to review and approve." } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" }],
  },
  {
    id: "scheduled-weekly-pipeline",
    tenantId: null,
    name: "Weekly Pipeline Check-in",
    description: "Scheduled reminder for the sales team to review open deals.",
    category: "sales",
    triggerType: "scheduled",
    tags: ["scheduled", "pipeline", "reminder"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Weekly Schedule", data: { triggerType: "scheduled" } },
      { id: "n2", type: "action", label: "Pipeline Reminder", data: { actionType: "notify", message: "📊 Weekly pipeline review — check open deals and follow-ups" } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }],
  },
  {
    id: "missed-call-text-back",
    tenantId: null,
    name: "Missed Call → SMS Text-Back",
    description: "GHL-style: send an SMS when you miss a call (trigger manually or via webhook).",
    category: "support",
    triggerType: "manual",
    tags: ["sms", "missed-call", "ghl"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Missed Call", data: { triggerType: "manual" } },
      { id: "n2", type: "action", label: "SMS Text-Back", data: { actionType: "send_sms", body: "Hi {{contact.name}}, sorry we missed your call! Reply here or book: {{booking_link}}" } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }],
  },
  {
    id: "whatsapp-followup-no-answer",
    tenantId: null,
    name: "No Answer → WhatsApp Follow-up",
    description: "Send a WhatsApp message after an unanswered outreach attempt.",
    category: "lead-nurture",
    triggerType: "manual",
    tags: ["whatsapp", "follow-up", "ghl"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Manual Trigger", data: { triggerType: "manual" } },
      { id: "n2", type: "action", label: "WhatsApp Message", data: { actionType: "send_whatsapp", body: "Hi {{contact.name}}, just following up on our conversation. Let me know if you have questions!" } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }],
  },
  {
    id: "review-request-after-won",
    tenantId: null,
    name: "Deal Won → Review Request (3 days)",
    description: "Wait 3 days after winning a deal, then ask for a Google review.",
    category: "sales",
    triggerType: "deal_stage_changed",
    tags: ["review", "deal-won", "reputation"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Deal Won", data: { triggerType: "deal_stage_changed", triggerConfig: { stage_to: "won" } } },
      { id: "n2", type: "action", label: "Wait 3 Days", data: { actionType: "delay_minutes", minutes: 4320 } },
      { id: "n3", type: "action", label: "Review Request", data: { actionType: "send_email", subject: "How was your experience?", body: "Hi {{contact.name}},\n\nWe'd love a quick review: {{review_link}}" } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" }],
  },
  {
    id: "proposal-followup-task",
    tenantId: null,
    name: "Deal in Proposal → Follow-up Task",
    description: "Create a sales task when a deal enters the proposal stage.",
    category: "sales",
    triggerType: "deal_stage_changed",
    tags: ["deal", "proposal", "task"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Proposal Stage", data: { triggerType: "deal_stage_changed", triggerConfig: { stage_to: "proposal" } } },
      { id: "n2", type: "action", label: "Follow-up Task", data: { actionType: "create_task", title: "Follow up on proposal — {{deal.title}}", dueInDays: 2 } },
      { id: "n3", type: "action", label: "Notify Owner", data: { actionType: "notify", message: "Proposal sent for {{deal.title}} — follow up in 2 days" } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" }],
  },
  {
    id: "contact-updated-high-value",
    tenantId: null,
    name: "Contact Updated (High Value) → Notify",
    description: "Alert sales when a high-value contact record is updated.",
    category: "sales",
    triggerType: "contact_updated",
    tags: ["crm", "high-value", "alert"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Contact Updated", data: { triggerType: "contact_updated" } },
      { id: "n2", type: "condition", label: "Value > 5000?", data: { field: "contact.value", operator: "greater_than", value: 5000 } },
      { id: "n3", type: "action", label: "Notify Sales", data: { actionType: "notify", message: "💰 High-value contact updated: {{contact.name}} ({{contact.value}} €)" } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" }],
  },
  {
    id: "appointment-reminder-sms",
    tenantId: null,
    name: "Appointment Reminder SMS",
    description: "Send an SMS reminder before a scheduled appointment.",
    category: "event-based",
    triggerType: "date_reached",
    tags: ["sms", "appointment", "reminder"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Appointment Date", data: { triggerType: "date_reached" } },
      { id: "n2", type: "action", label: "SMS Reminder", data: { actionType: "send_sms", body: "Hi {{contact.name}}, reminder: your appointment is tomorrow. Reply CONFIRM to confirm." } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }],
  },
  {
    id: "lost-deal-re-engage",
    tenantId: null,
    name: "Lost Deal → Re-engagement Email",
    description: "Send a win-back email when a contact moves to the lost stage.",
    category: "re-engagement",
    triggerType: "stage_changed",
    tags: ["lost", "win-back", "email"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Stage Changed", data: { triggerType: "stage_changed" } },
      { id: "n2", type: "condition", label: "Is Lost?", data: { field: "contact.pipeline_stage", operator: "equals", value: "lost" } },
      { id: "n3", type: "action", label: "Win-back Email", data: { actionType: "send_email", subject: "Can we try again?", body: "Hi {{contact.name}},\n\nWe understand timing matters. Here's what's new since we last spoke…" } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" }],
  },
  {
    id: "new-lead-tag-outbound",
    tenantId: null,
    name: "New Lead Tag → Outbound Sequence",
    description: "Tag new leads and enroll them in your outbound nurture sequence.",
    category: "lead-nurture",
    triggerType: "tag_added",
    tags: ["tag", "outbound", "sequence"],
    isOfficial: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Tag: new-lead", data: { triggerType: "tag_added", triggerConfig: { tag: "new-lead" } } },
      { id: "n2", type: "action", label: "Add Tag outbound", data: { actionType: "add_tag", tag: "outbound-active" } },
      { id: "n3", type: "action", label: "Notify SDR", data: { actionType: "notify", message: "New outbound lead: {{contact.name}}" } },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" }],
  },
];

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
type DbPort = { query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]> };

type RecipeRow = {
  id: string; tenant_id: string | null; name: string; description: string | null;
  category: string; trigger_type: string; tags: string[]; is_official: boolean;
  nodes: WorkflowRecipe["nodes"]; edges: WorkflowRecipe["edges"];
};

function rowToRecipe(r: RecipeRow): WorkflowRecipe {
  return {
    id: r.id, tenantId: r.tenant_id, name: r.name, description: r.description ?? "",
    category: r.category as RecipeCategory, triggerType: r.trigger_type,
    tags: r.tags ?? [], isOfficial: r.is_official,
    nodes: r.nodes ?? [], edges: r.edges ?? [],
  };
}

function orderNodesFromTrigger(recipe: WorkflowRecipe): WorkflowRecipe["nodes"] {
  const trigger = recipe.nodes.find((n) => n.type === "trigger");
  if (!trigger) return recipe.nodes;
  const ordered: WorkflowRecipe["nodes"] = [];
  const visited = new Set<string>();
  let current: string | undefined = trigger.id;
  for (let guard = 0; guard < 50; guard++) {
    const edge = recipe.edges.find((e) => e.source === current);
    if (!edge) break;
    const next = recipe.nodes.find((n) => n.id === edge.target);
    if (!next || visited.has(next.id)) break;
    visited.add(next.id);
    ordered.push(next);
    current = next.id;
  }
  return ordered;
}

function nodeToWorkflowAction(
  n: WorkflowRecipe["nodes"][number],
): { type: string; config: Record<string, unknown> } {
  const d = n.data ?? {};
  const actionType = String(d.actionType ?? "");
  switch (actionType) {
    case "send_email":
      return { type: "send_email", config: { to: "{{contact.email}}", subject: String(d.subject ?? ""), body: String(d.body ?? "") } };
    case "notify":
      return { type: "notify", config: { message: String(d.message ?? n.label) } };
    case "send_sms":
      return { type: "send_sms", config: { to: String(d.to ?? "{{contact.phone}}"), body: String(d.body ?? "") } };
    case "send_whatsapp":
      return { type: "send_whatsapp", config: { to: String(d.to ?? "{{contact.phone}}"), body: String(d.body ?? "") } };
    case "delay_minutes":
      return { type: "delay_minutes", config: { minutes: Number(d.minutes ?? 60) } };
    case "add_tag":
      return { type: "add_tag", config: { tag: String(d.tag ?? "") } };
    case "create_task":
      return {
        type: "create_task",
        config: {
          title: String(d.title ?? n.label),
          description: String(d.description ?? ""),
          dueInDays: Number(d.dueInDays ?? 1),
        },
      };
    case "enroll_sequence":
      return { type: "enroll_sequence", config: { sequenceId: String(d.sequenceId ?? "") } };
    case "change_deal_stage":
      return { type: "change_deal_stage", config: { stage: String(d.stage ?? "proposal") } };
    case "change_stage":
      return { type: "change_stage", config: { contactId: "{{contact.id}}", stage: String(d.stage ?? "qualified") } };
    case "webhook_out":
      return { type: "webhook_out", config: { url: String(d.url ?? ""), method: String(d.method ?? "POST") } };
    default:
      return { type: "notify", config: { message: `Action: ${n.label}` } };
  }
}

function buildImportPayload(recipe: WorkflowRecipe): {
  triggerConfig: Record<string, unknown>;
  conditions: Array<{ field: string; operator: "equals" | "greater_than"; value: string | number }>;
  actions: Array<{ type: string; config: Record<string, unknown> }>;
} {
  const triggerNode = recipe.nodes.find((n) => n.type === "trigger");
  const triggerConfig = (triggerNode?.data?.triggerConfig as Record<string, unknown> | undefined) ?? {};

  const conditions = orderNodesFromTrigger(recipe)
    .filter((n) => n.type === "condition")
    .map((n) => {
      const d = n.data ?? {};
      return {
        field: String(d.field ?? ""),
        operator: (d.operator === "greater_than" ? "greater_than" : "equals") as "equals" | "greater_than",
        value: d.value as string | number,
      };
    })
    .filter((c) => c.field);

  const actions = orderNodesFromTrigger(recipe)
    .filter((n) => n.type === "action")
    .map(nodeToWorkflowAction);

  return { triggerConfig, conditions, actions };
}

export class SaasWorkflowRecipesService {
  constructor(private readonly db: DbPort) {}

  /** List all recipes: official static + tenant custom saved in DB */
  async list(tenantId: string, category?: RecipeCategory): Promise<WorkflowRecipe[]> {
    // Custom recipes from DB
    const dbRows = await this.db.query<RecipeRow>(
      `SELECT id,tenant_id,name,description,category,trigger_type,tags,is_official,nodes,edges
       FROM saas_workflow_recipes
       WHERE (tenant_id=$1 OR is_official=true)
       ${category ? "AND category=$2" : ""}
       ORDER BY is_official DESC, created_at DESC`,
      category ? [tenantId, category] : [tenantId],
    ).catch(() => [] as RecipeRow[]);

    const dbRecipes = dbRows.map(rowToRecipe);

    // Merge official static catalog (avoid duplicate ids already in DB)
    const dbIds = new Set(dbRecipes.map((r) => r.id));
    const staticOfficials = OFFICIAL_RECIPES.filter((r) => {
      if (category && r.category !== category) return false;
      return !dbIds.has(r.id);
    });

    return [...staticOfficials, ...dbRecipes];
  }

  /** Get a single recipe by id — checks static catalog first, then DB */
  async get(id: string, tenantId: string): Promise<WorkflowRecipe> {
    const staticRecipe = OFFICIAL_RECIPES.find((r) => r.id === id);
    if (staticRecipe) return staticRecipe;

    const rows = await this.db.query<RecipeRow>(
      `SELECT id,tenant_id,name,description,category,trigger_type,tags,is_official,nodes,edges
       FROM saas_workflow_recipes WHERE id=$1 AND (tenant_id=$2 OR is_official=true) LIMIT 1`,
      [id, tenantId],
    );
    if (!rows.length) throw new SaasWorkflowRecipesError("Recipe not found", "NOT_FOUND");
    return rowToRecipe(rows[0]);
  }

  /**
   * Import a recipe into the tenant's SaasWorkflow engine.
   * Returns the created workflow id so the caller can activate it.
   */
  async importRecipe(tenantId: string, recipeId: string, overrideName?: string): Promise<{ workflowId: string; name: string }> {
    const recipe = await this.get(recipeId, tenantId);
    const { triggerConfig, conditions, actions } = buildImportPayload(recipe);
    const name = overrideName ?? recipe.name;

    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO saas_workflows (tenant_id, name, description, status, trigger_type, trigger_config, conditions, actions)
       VALUES ($1,$2,$3,'draft',$4,$5::jsonb,$6::jsonb,$7::jsonb)
       RETURNING id`,
      [tenantId, name, recipe.description, recipe.triggerType, JSON.stringify(triggerConfig), JSON.stringify(conditions), JSON.stringify(actions)],
    );

    return { workflowId: rows[0].id, name };
  }

  /** Save a custom recipe from an existing workflow (so it can be re-used) */
  async saveAsRecipe(tenantId: string, input: {
    name: string; description?: string; category: RecipeCategory;
    triggerType: string; tags?: string[];
    nodes: WorkflowRecipe["nodes"]; edges: WorkflowRecipe["edges"];
  }): Promise<WorkflowRecipe> {
    if (!input.name?.trim()) throw new SaasWorkflowRecipesError("name required", "VALIDATION");
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const rows = await this.db.query<RecipeRow>(
      `INSERT INTO saas_workflow_recipes (id,tenant_id,name,description,category,trigger_type,tags,nodes,edges,is_official)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,false)
       RETURNING id,tenant_id,name,description,category,trigger_type,tags,is_official,nodes,edges`,
      [id, tenantId, input.name.trim(), input.description ?? null, input.category,
       input.triggerType, input.tags ?? [], JSON.stringify(input.nodes), JSON.stringify(input.edges)],
    );
    return rowToRecipe(rows[0]);
  }

  async deleteCustomRecipe(tenantId: string, id: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM saas_workflow_recipes WHERE id=$1 AND tenant_id=$2 AND is_official=false RETURNING id`,
      [id, tenantId],
    );
    if (!rows.length) throw new SaasWorkflowRecipesError("Recipe not found or is official (cannot delete)", "NOT_FOUND");
  }
}

let _instance: SaasWorkflowRecipesService | null = null;
export function getSaasWorkflowRecipesService(): SaasWorkflowRecipesService {
  if (!_instance) _instance = new SaasWorkflowRecipesService(DbClient.getInstance());
  return _instance;
}
export function resetSaasWorkflowRecipesServiceForTests(): void { _instance = null; }
