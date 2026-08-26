export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  getSaasSharedMemoryService,
  SharedMemoryApprovalRequiredError,
  SharedMemoryDeniedError,
  SharedMemoryNotEnabledError,
  type SaasRequestContext,
} from "@nelvyon/saas";

function memoryStatus(e: unknown): number {
  if (e instanceof SharedMemoryNotEnabledError) return 503;
  if (e instanceof SharedMemoryDeniedError) return 403;
  if (e instanceof SharedMemoryApprovalRequiredError) return 202;
  return saasErrorStatus(e);
}

function policyCtx(ctx: SaasRequestContext, scopes: string[]) {
  return {
    tenantId: ctx.tenant.id,
    userId: ctx.claims.userId,
    agentId: "saas_api",
    roles: [ctx.role],
    scopes,
  };
}

/** GET /api/saas/shared-memory — status + search */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const svc = getSaasSharedMemoryService();
    const url = new URL(req.url);
    const resource = url.searchParams.get("resource") ?? "status";

    if (resource === "status") {
      return NextResponse.json(svc.status());
    }

    if (resource === "search") {
      const result = await svc.search(policyCtx(ctx, ["memory.read"]), {
        query: url.searchParams.get("q") ?? undefined,
        scope: (url.searchParams.get("scope") as "tenant" | "agent" | "session" | "user" | undefined) ?? undefined,
        agentId: url.searchParams.get("agentId") ?? undefined,
        userId: url.searchParams.get("userId") ?? undefined,
        layer: (url.searchParams.get("layer") as "stm" | "ltm" | undefined) ?? undefined,
        limit: Number(url.searchParams.get("limit") ?? 20),
      });
      return NextResponse.json(result);
    }

    if (resource === "get") {
      const id = url.searchParams.get("id");
      if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });
      const entry = await svc.read(policyCtx(ctx, ["memory.read"]), id);
      if (!entry) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ entry });
    }

    return NextResponse.json({ error: "unknown_resource" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: memoryStatus(e) });
  }
}

/** POST /api/saas/shared-memory — write entry */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = (await req.json()) as Record<string, unknown>;
    const svc = getSaasSharedMemoryService();
    const entry = await svc.write(policyCtx(ctx, ["memory.write"]), {
      tenantId: ctx.tenant.id,
      scope: (body.scope as "tenant") ?? "tenant",
      visibility: (body.visibility as "private") ?? "private",
      kind: (body.kind as "fact") ?? "fact",
      layer: body.layer as "stm" | "ltm" | undefined,
      agentId: (body.agentId as string) ?? null,
      // De la sesión y del inquilino verificado, nunca del cuerpo.
      //
      // `tenantId` ya salía de aquí, pero sus dos campos hermanos —los que
      // dicen de quién es la entrada DENTRO del inquilino— salían del cliente.
      // `userId` es filtro de búsqueda, así que aceptarlo dejaba escribir
      // memoria que aparece en la búsqueda por usuario de otro; y el workspace
      // es una unidad de aislamiento real cuya pertenencia aquí no se
      // comprobaba. `agentId` sí es del cuerpo a propósito: acotar una entrada
      // a un agente es para lo que existe el campo, y `authorizeRead` lo cierra.
      userId: ctx.claims.userId,
      workspaceId: ctx.tenant.workspaceId === null ? null : String(ctx.tenant.workspaceId),
      sessionId: (body.sessionId as string) ?? null,
      // Con tope. `key` llega del cuerpo y acaba dentro del contexto de un
      // agente; sin limite, una sola entrada empuja el resto fuera de la
      // ventana del modelo. La neutralizacion estructural vive en
      // `AgentContextEngine.comoDato`, pero un campo sin tope tampoco tiene
      // por que llegar hasta alli para que alguien se acuerde de acotarlo.
      key: String(body.key ?? "default").slice(0, 200),
      title: typeof body.title === "string" ? body.title : "",
      content: String(body.content ?? ""),
      tags: Array.isArray(body.tags) ? (body.tags as string[]) : [],
      metadata: (body.metadata as Record<string, unknown>) ?? {},
      expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : null,
      createdBy: ctx.claims.userId,
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (e: unknown) {
    const status = memoryStatus(e);
    if (status === 202) {
      return NextResponse.json({ status: "approval_required", ...saasErrorBody(e) }, { status: 202 });
    }
    return NextResponse.json(saasErrorBody(e), { status });
  }
}

/** DELETE /api/saas/shared-memory?id= */
export async function DELETE(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });
    const ok = await getSaasSharedMemoryService().delete(policyCtx(ctx, ["memory.write"]), id);
    return NextResponse.json({ deleted: ok });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: memoryStatus(e) });
  }
}
