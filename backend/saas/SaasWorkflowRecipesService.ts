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

    // Extract trigger config from the trigger node data
    const triggerNode = recipe.nodes.find((n) => n.type === "trigger");
    const triggerConfig = (triggerNode?.data?.triggerConfig as Record<string, unknown> | undefined) ?? {};

    // Build action list from action/notify nodes
    const actionNodes = recipe.nodes.filter((n) => n.type === "action");
    const actions = actionNodes.map((n) => {
      const d = n.data ?? {};
      if (d.actionType === "send_email") {
        return { type: "send_email" as const, config: { to: "{{contact.email}}", subject: String(d.subject ?? ""), body: String(d.body ?? "") } };
      }
      if (d.actionType === "notify") {
        return { type: "notify" as const, config: { message: String(d.message ?? n.label) } };
      }
      return { type: "notify" as const, config: { message: `Action: ${n.label}` } };
    });

    const name = overrideName ?? recipe.name;

    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO saas_workflows (tenant_id, name, description, status, trigger_type, trigger_config, conditions, actions)
       VALUES ($1,$2,$3,'draft',$4,$5::jsonb,'[]'::jsonb,$6::jsonb)
       RETURNING id`,
      [tenantId, name, recipe.description, recipe.triggerType, JSON.stringify(triggerConfig), JSON.stringify(actions)],
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
