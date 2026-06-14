import { EMPTY_EXECUTIONS_LIST, automationsBffGet } from "@/lib/automationsBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  return automationsBffGet(req, "/api/v1/workflow-engine/executions", EMPTY_EXECUTIONS_LIST);
}
