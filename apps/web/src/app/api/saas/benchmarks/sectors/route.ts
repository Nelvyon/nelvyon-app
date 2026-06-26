import { type NextRequest, NextResponse } from "next/server";
import { getSaasSectorBenchmarkService, requireSaasContext } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireSaasContext(req, "contacts.read");
    const svc = getSaasSectorBenchmarkService();
    return NextResponse.json({ sectors: svc.listSectors() });
  } catch (e) {
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[benchmarks/sectors GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
