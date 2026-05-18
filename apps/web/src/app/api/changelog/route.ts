import { NextResponse } from "next/server";

import { ChangelogService } from "../../../../../../backend/changelog/ChangelogService";

export const runtime = "nodejs";

export async function GET() {
  const entries = await ChangelogService.instance().getChangelog();
  return NextResponse.json(
    { entries },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
