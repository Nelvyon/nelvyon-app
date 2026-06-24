/**
 * Public survey endpoints — no auth.
 * GET /api/s/[surveyId]   → survey config (share_enabled=true required)
 * POST /api/s/[surveyId]  → submit response
 */
import { NextResponse } from "next/server";
import { getSaasSurveysService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ surveyId: string }> },
) {
  const { surveyId } = await params;
  const survey = await getSaasSurveysService().getPublicSurvey(surveyId);
  if (!survey) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ survey });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ surveyId: string }> },
) {
  const { surveyId } = await params;
  const survey = await getSaasSurveysService().getPublicSurvey(surveyId);
  if (!survey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    answers?: Record<string, unknown>;
    score?: number;
    contactId?: string;
  };

  const response = await getSaasSurveysService().submitResponse(survey.id, {
    answers: body.answers ?? {},
    score: body.score,
    contactId: body.contactId,
  });

  return NextResponse.json({ response }, { status: 201 });
}
