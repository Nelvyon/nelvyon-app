import { NextResponse } from "next/server";

import { getSaasLmsService, SaasLmsError } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const items = await getSaasLmsService().listPublishedCourses();
    return NextResponse.json({ items });
  } catch (e: unknown) {
    const message = e instanceof SaasLmsError ? e.message : "Failed to list courses";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
