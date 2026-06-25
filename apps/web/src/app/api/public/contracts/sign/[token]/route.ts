import { type NextRequest, NextResponse } from "next/server";
import { getSaasCpqEnterpriseService, SaasCpqEnterpriseError } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { token } = await params;
    const contract = await getSaasCpqEnterpriseService().getContractByToken(token);
    return NextResponse.json({ contract });
  } catch (e) {
    if (e instanceof SaasCpqEnterpriseError) return NextResponse.json({ error: e.message }, { status: 404 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const { token } = await params;
    const contract = await getSaasCpqEnterpriseService().signContract(token);
    return NextResponse.json({ contract, signed: true });
  } catch (e) {
    if (e instanceof SaasCpqEnterpriseError) return NextResponse.json({ error: e.message }, { status: 404 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
