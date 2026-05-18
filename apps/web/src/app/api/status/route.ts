import { NextResponse } from "next/server";

import { DbClient } from "../../../../../../backend/db/DbClient";
import { getCurrentStatus } from "@nelvyon/monitoring";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [current, incidents] = await Promise.all([
      getCurrentStatus(),
      DbClient.getInstance().query<{
        id: string;
        title: string;
        message: string;
        severity: string;
        resolved: boolean;
        created_at: string;
      }>(
        `SELECT id, title, message, severity, resolved, created_at
         FROM incidents
         WHERE resolved = false OR created_at > now() - interval '7 days'
         ORDER BY created_at DESC
         LIMIT 10`,
      ),
    ]);

    const allUp = Object.values(current).every((s) => s.status === "up");
    const anyDown = Object.values(current).some((s) => s.status === "down");
    const overallStatus = anyDown ? "down" : allUp ? "operational" : "degraded";

    return NextResponse.json({
      status: overallStatus,
      services: current,
      incidents,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "unknown", services: {}, incidents: [], updatedAt: new Date().toISOString() },
      { status: 200 },
    );
  }
}
