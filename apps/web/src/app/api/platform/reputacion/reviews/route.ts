import { NextResponse } from "next/server";

import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { EMPTY_REVIEWS_LIST } from "@/lib/reputacionBffRoute";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sentiment = url.searchParams.get("sentiment");

  try {
    await requirePlatformClaims(req);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(EMPTY_REVIEWS_LIST);
  }

  let data = EMPTY_REVIEWS_LIST;
  if (sentiment) {
    data = {
      ...data,
      items: data.items.filter((r) => r.sentiment === sentiment),
    };
  }
  return NextResponse.json(data);
}
