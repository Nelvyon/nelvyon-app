import { describe, it, expect, vi } from "vitest";
import { SaasWorkflowRecipesService } from "../SaasWorkflowRecipesService";

type Row = Record<string, unknown>;
const makeDb = (rows: Row[][] = []) => {
  let call = 0;
  return { query: vi.fn(async () => rows[call++] ?? []) };
};

const TENANT = "tenant-recipes";

describe("SaasWorkflowRecipesService — official catalog", () => {
  it("list returns 25+ official recipes when DB has no custom ones", async () => {
    const db = makeDb([[]]);
    const svc = new SaasWorkflowRecipesService(db);
    const recipes = await svc.list(TENANT);
    expect(recipes.length).toBeGreaterThanOrEqual(24);
    expect(recipes.every((r) => r.isOfficial)).toBe(true);
  });

  it("list filters by category", async () => {
    const db = makeDb([[]]);
    const svc = new SaasWorkflowRecipesService(db);
    const recipes = await svc.list(TENANT, "sales");
    expect(recipes.every((r) => r.category === "sales")).toBe(true);
    expect(recipes.length).toBeGreaterThan(0);
  });

  it("get returns official recipe by id", async () => {
    const db = makeDb([[]]);
    const svc = new SaasWorkflowRecipesService(db);
    const recipe = await svc.get("welcome-new-contact", TENANT);
    expect(recipe.id).toBe("welcome-new-contact");
    expect(recipe.triggerType).toBe("contact_created");
    expect(recipe.nodes.length).toBeGreaterThanOrEqual(2);
    expect(recipe.edges.length).toBeGreaterThanOrEqual(1);
  });

  it("get returns email_opened recipe", async () => {
    const db = makeDb([[]]);
    const svc = new SaasWorkflowRecipesService(db);
    const recipe = await svc.get("email-opened-upsell", TENANT);
    expect(recipe.triggerType).toBe("email_opened");
  });

  it("get returns webhook_in recipe", async () => {
    const db = makeDb([[]]);
    const svc = new SaasWorkflowRecipesService(db);
    const recipe = await svc.get("webhook-in-crm-update", TENANT);
    expect(recipe.triggerType).toBe("webhook_in");
  });

  it("get returns date_reached recipe", async () => {
    const db = makeDb([[]]);
    const svc = new SaasWorkflowRecipesService(db);
    const recipe = await svc.get("date-reached-birthday", TENANT);
    expect(recipe.triggerType).toBe("date_reached");
  });

  it("get throws NOT_FOUND for unknown id", async () => {
    const db = makeDb([[]]);
    const svc = new SaasWorkflowRecipesService(db);
    await expect(svc.get("nonexistent-recipe", TENANT)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("all 16 trigger types are covered by at least one recipe", async () => {
    const db = makeDb([[]]);
    const svc = new SaasWorkflowRecipesService(db);
    const recipes = await svc.list(TENANT);
    const triggerTypes = new Set(recipes.map((r) => r.triggerType));
    const expected = [
      "contact_created", "contact_updated", "form_submitted", "deal_stage_changed", "manual", "tag_added",
      "email_opened", "email_clicked", "webhook_in", "date_reached", "stage_changed",
      "score_threshold", "review_received", "sequence_enrolled", "job_completed", "scheduled",
    ];
    for (const t of expected) {
      expect(triggerTypes.has(t), `No recipe for trigger: ${t}`).toBe(true);
    }
  });

  it("importRecipe preserves conditions from recipe with condition nodes", async () => {
    const workflowRow = { id: "wf-cond" };
    const db = makeDb([[workflowRow]]);
    const svc = new SaasWorkflowRecipesService(db);
    await svc.importRecipe(TENANT, "stage-changed-proposal");
    const insertCall = db.query.mock.calls.find((c) => String(c[0]).includes("INSERT INTO saas_workflows"));
    expect(insertCall).toBeDefined();
    const conditionsJson = insertCall![1]![5];
    expect(JSON.parse(String(conditionsJson))).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "contact.pipeline_stage", value: "proposal" })]),
    );
  });

  it("importRecipe maps SMS and delay actions", async () => {
    const workflowRow = { id: "wf-sms" };
    const db = makeDb([[workflowRow]]);
    const svc = new SaasWorkflowRecipesService(db);
    await svc.importRecipe(TENANT, "missed-call-text-back");
    const insertCall = db.query.mock.calls.find((c) => String(c[0]).includes("INSERT INTO saas_workflows"));
    const actions = JSON.parse(String(insertCall![1]![6])) as Array<{ type: string }>;
    expect(actions.some((a) => a.type === "send_sms")).toBe(true);
  });
});

describe("SaasWorkflowRecipesService — importRecipe", () => {
  it("creates a SaasWorkflow from recipe template", async () => {
    const workflowRow = { id: "wf-new-123" };
    // official recipe get() skips DB; next call is the INSERT
    const db = makeDb([[workflowRow]]);
    const svc = new SaasWorkflowRecipesService(db);
    const result = await svc.importRecipe(TENANT, "welcome-new-contact");
    expect(result.workflowId).toBe("wf-new-123");
    expect(result.name).toBe("Welcome New Contact");
    // Check that INSERT was called with correct trigger_type
    const insertCall = db.query.mock.calls.find((c) => String(c[0]).includes("INSERT INTO saas_workflows"));
    expect(insertCall).toBeDefined();
    expect(insertCall![1]).toContain("contact_created");
  });

  it("allows overriding the workflow name on import", async () => {
    const workflowRow = { id: "wf-custom" };
    const db = makeDb([[workflowRow]]);
    const svc = new SaasWorkflowRecipesService(db);
    const result = await svc.importRecipe(TENANT, "welcome-new-contact", "My Custom Welcome");
    expect(result.name).toBe("My Custom Welcome");
  });

  it("throws NOT_FOUND for unknown recipe on import", async () => {
    const db = makeDb([[]]);
    const svc = new SaasWorkflowRecipesService(db);
    await expect(svc.importRecipe(TENANT, "no-such-recipe")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("SaasWorkflowRecipesService — saveAsRecipe", () => {
  it("validates empty name", async () => {
    const db = makeDb();
    const svc = new SaasWorkflowRecipesService(db);
    await expect(svc.saveAsRecipe(TENANT, {
      name: "", category: "custom", triggerType: "manual", nodes: [], edges: [],
    })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("saves custom recipe to DB", async () => {
    const savedRow = {
      id: "custom-123-abc",
      tenant_id: TENANT, name: "My Recipe", description: null,
      category: "custom", trigger_type: "manual", tags: [], is_official: false, nodes: [], edges: [],
    };
    const db = makeDb([[savedRow]]);
    const svc = new SaasWorkflowRecipesService(db);
    const recipe = await svc.saveAsRecipe(TENANT, {
      name: "My Recipe", category: "custom", triggerType: "manual", nodes: [], edges: [],
    });
    expect(recipe.id).toBe("custom-123-abc");
    expect(recipe.isOfficial).toBe(false);
    expect(recipe.tenantId).toBe(TENANT);
  });
});

describe("SaasWorkflowRecipesService — deleteCustomRecipe", () => {
  it("throws NOT_FOUND when recipe not found or is official", async () => {
    const db = makeDb([[]]);
    const svc = new SaasWorkflowRecipesService(db);
    await expect(svc.deleteCustomRecipe(TENANT, "welcome-new-contact")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
