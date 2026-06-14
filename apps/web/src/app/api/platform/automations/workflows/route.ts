import { EMPTY_WORKFLOWS_LIST, automationsBffGet, automationsBffPost } from "@/lib/automationsBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  return automationsBffGet(req, "/api/workflows", EMPTY_WORKFLOWS_LIST);
}

export async function POST(req: Request) {
  return automationsBffPost(req, "/api/workflows", EMPTY_WORKFLOWS_LIST);
}
