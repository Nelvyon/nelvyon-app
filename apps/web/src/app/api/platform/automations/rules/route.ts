import { EMPTY_RULES_LIST, automationsBffGet, automationsBffPost } from "@/lib/automationsBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  return automationsBffGet(req, "/api/v1/workflow-engine/rules", EMPTY_RULES_LIST);
}

export async function POST(req: Request) {
  return automationsBffPost(req, "/api/v1/workflow-engine/rules", {
    id: 0,
    name: "Regla demo",
    trigger_type: "manual",
    action_type: "create_notification",
    is_active: true,
    runs_count: 0,
  });
}
