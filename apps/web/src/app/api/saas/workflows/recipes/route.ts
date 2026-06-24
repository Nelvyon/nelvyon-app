import { NextResponse } from "next/server";
import {
  getSaasWorkflowRecipesService,
  SaasWorkflowRecipesError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type RecipeCategory,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasWorkflowRecipesError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.read");
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") as RecipeCategory | null;
    const id = searchParams.get("id");

    if (id) {
      const recipe = await getSaasWorkflowRecipesService().get(id, ctx.tenant.id);
      return NextResponse.json({ recipe });
    }

    const recipes = await getSaasWorkflowRecipesService().list(ctx.tenant.id, category ?? undefined);
    return NextResponse.json({ recipes, total: recipes.length });
  } catch (e: unknown) {
    if (e instanceof SaasWorkflowRecipesError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;

    // action=import → import a recipe into tenant's workflows
    if (b.action === "import" && typeof b.recipe_id === "string") {
      const result = await getSaasWorkflowRecipesService().importRecipe(
        ctx.tenant.id,
        b.recipe_id,
        typeof b.name === "string" ? b.name : undefined,
      );
      return NextResponse.json({ ok: true, ...result }, { status: 201 });
    }

    // action=save → save current nodes/edges as a custom recipe
    if (b.action === "save") {
      const recipe = await getSaasWorkflowRecipesService().saveAsRecipe(ctx.tenant.id, {
        name: typeof b.name === "string" ? b.name : "",
        description: typeof b.description === "string" ? b.description : undefined,
        category: typeof b.category === "string" ? b.category as RecipeCategory : "custom",
        triggerType: typeof b.trigger_type === "string" ? b.trigger_type : "manual",
        tags: Array.isArray(b.tags) ? (b.tags as string[]) : [],
        nodes: Array.isArray(b.nodes) ? b.nodes as WorkflowRecipeNode[] : [],
        edges: Array.isArray(b.edges) ? b.edges as WorkflowRecipeEdge[] : [],
      });
      return NextResponse.json({ recipe }, { status: 201 });
    }

    return NextResponse.json({ error: "action must be 'import' or 'save'" }, { status: 400 });
  } catch (e: unknown) {
    if (e instanceof SaasWorkflowRecipesError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.delete");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await getSaasWorkflowRecipesService().deleteCustomRecipe(ctx.tenant.id, id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof SaasWorkflowRecipesError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

// Local type aliases to avoid import cycle in the route file
type WorkflowRecipeNode = { id: string; type: string; label: string; data?: Record<string, unknown> };
type WorkflowRecipeEdge = { id: string; source: string; target: string };
