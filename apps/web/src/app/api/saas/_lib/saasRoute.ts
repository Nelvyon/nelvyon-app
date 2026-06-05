import { NextResponse } from "next/server";

import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  type SaasAction,
  type SaasRequestContext,
} from "@nelvyon/saas";

export async function withSaasRoute(
  req: Request,
  action: SaasAction,
  handler: (ctx: SaasRequestContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    const ctx = await requireSaasContext(req, action);
    return await handler(ctx);
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export function saasRouteError(e: unknown): NextResponse {
  return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
}
