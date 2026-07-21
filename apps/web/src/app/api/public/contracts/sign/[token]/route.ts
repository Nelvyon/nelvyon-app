import { type NextRequest, NextResponse } from "next/server";
import { getSaasCpqEnterpriseService, SaasCpqEnterpriseError, checkPublicApiRateLimit } from "@nelvyon/saas";
import { sanitizeRichHtml } from "@/lib/sanitizeRichHtml";

// Simple rate limit for contract sign endpoint: 10 sign attempts per token per minute
function checkSignRateLimit(token: string): boolean {
  return checkPublicApiRateLimit(`sign:${token}`, 10);
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

function sanitizeContract<T extends { termsHtml?: string | null }>(contract: T): T {
  if (contract.termsHtml) {
    return { ...contract, termsHtml: sanitizeRichHtml(contract.termsHtml) };
  }
  return contract;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { token } = await params;
    const contract = await getSaasCpqEnterpriseService().getContractByToken(token);
    return NextResponse.json({ contract: sanitizeContract(contract) });
  } catch (e) {
    if (e instanceof SaasCpqEnterpriseError) return NextResponse.json({ error: e.message }, { status: 404 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const { token } = await params;
    if (!checkSignRateLimit(token)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const contract = await getSaasCpqEnterpriseService().signContract(token);
    return NextResponse.json({ contract: sanitizeContract(contract), signed: true });
  } catch (e) {
    if (e instanceof SaasCpqEnterpriseError) return NextResponse.json({ error: e.message }, { status: 404 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
