import { NextResponse } from "next/server";

import { SupportService } from "../../../../../../../backend/support/SupportService";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

const CATEGORIES = new Set(["billing", "technical", "feature_request", "other"]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("category");
  const category = raw && CATEGORIES.has(raw) ? raw : undefined;
  const templates = await SupportService.instance().getTemplates(category);
  return NextResponse.json({ templates });
}
