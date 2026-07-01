import { NextResponse } from "next/server";
import {
  getSaasWebBuilderService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireSaasContext(req, "contacts.read");
    const templates = getSaasWebBuilderService().listFeaturedTemplates();
    return NextResponse.json({ templates });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
