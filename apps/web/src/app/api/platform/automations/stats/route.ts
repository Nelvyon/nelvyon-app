import { EMPTY_STATS, automationsBffGet } from "@/lib/automationsBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  return automationsBffGet(req, "/api/v1/automation/stats", EMPTY_STATS);
}
