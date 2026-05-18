import { NextResponse } from "next/server";

import { ChangelogService } from "../../../../../../backend/changelog/ChangelogService";

export const runtime = "nodejs";

export async function GET() {
  const items = await ChangelogService.instance().getRoadmap();
  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
