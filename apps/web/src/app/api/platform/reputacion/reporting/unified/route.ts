import { NextResponse } from "next/server";

import {
  EMPTY_CONNECTION,
  EMPTY_UNIFIED_REPUTACION,
  buildDemoAlerts,
  buildDemoReviewsList,
  mergeUnifiedReputacion,
} from "@/lib/reputacionBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const reviews = buildDemoReviewsList();
  const connection = { ...EMPTY_CONNECTION, profile_name: "Negocio demo" };
  const alerts = buildDemoAlerts();
  return NextResponse.json(mergeUnifiedReputacion(reviews, connection, alerts));
}
