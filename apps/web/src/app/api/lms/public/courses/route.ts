import { NextResponse } from "next/server";

import { getSaasLmsService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Public catalog — empty list when DB unavailable (never 500 on read). */
export async function GET() {
  const items = await getSaasLmsService().listPublishedCourses();
  return NextResponse.json({ items });
}
