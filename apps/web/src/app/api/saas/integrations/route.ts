import { NextResponse } from "next/server";
import {
  getSaasIntegrationsHubService,
  SaasIntegrationsHubError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/saas/integrations
 *  ?action=authorize&provider=slug → { authorizeUrl }
 *  default → { catalog, connections, summary }
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const svc = getSaasIntegrationsHubService();
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const provider = url.searchParams.get("provider");

    if (action === "authorize" && provider) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
        const authorizeUrl = svc.getAuthorizeUrl(ctx.tenant.id, provider, baseUrl);
        return NextResponse.json({ authorizeUrl });
      } catch (err) {
        if (err instanceof SaasIntegrationsHubError) {
          const status = err.code === "NOT_FOUND" ? 404 : 422;
          return NextResponse.json(
            { error: err.message, code: err.code },
            { status }
          );
        }
        throw err;
      }
    }

    const catalog = svc.listCatalog();
    const connections = await svc.listConnections(ctx.tenant.id);
    const summary = svc.buildSummary(connections);

    return NextResponse.json({ catalog, connections, summary });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** DELETE /api/saas/integrations?provider=slug */
export async function DELETE(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider");
    if (!provider) {
      return NextResponse.json({ error: "provider required" }, { status: 400 });
    }
    const svc = getSaasIntegrationsHubService();
    await svc.disconnect(ctx.tenant.id, provider);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof SaasIntegrationsHubError && e.code === "NOT_FOUND") {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
