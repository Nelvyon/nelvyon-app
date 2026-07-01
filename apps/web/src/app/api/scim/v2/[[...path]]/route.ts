import { NextResponse } from "next/server";

import {
  getSaasScimService,
  resolveScimTenantId,
  SaasScimError,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function scimListResponse(total: number, items: unknown[], startIndex: number) {
  return NextResponse.json(
    {
      schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
      totalResults: total,
      startIndex,
      itemsPerPage: items.length,
      Resources: items,
    },
    { headers: { "Content-Type": "application/scim+json" } },
  );
}

function scimError(e: SaasScimError): NextResponse {
  return NextResponse.json(
    { schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: e.message },
    { status: e.status, headers: { "Content-Type": "application/scim+json" } },
  );
}

export async function GET(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  try {
    const tenantId = await resolveScimTenantId(req.headers.get("authorization"));
    const segments = (await ctx.params).path ?? [];
    const svc = getSaasScimService();

    if (segments[0] === "Users" && segments.length === 1) {
      const url = new URL(req.url);
      const startIndex = Number(url.searchParams.get("startIndex") ?? 1);
      const count = Number(url.searchParams.get("count") ?? 100);
      const { total, items } = await svc.listUsers(tenantId, startIndex, count);
      return scimListResponse(total, items, startIndex);
    }

    if (segments[0] === "Users" && segments[1]) {
      const user = await svc.getUser(tenantId, segments[1]);
      return NextResponse.json(user, { headers: { "Content-Type": "application/scim+json" } });
    }

    if (segments[0] === "Groups" && segments.length === 1) {
      const { total, items } = await svc.listGroups(tenantId);
      return scimListResponse(total, items, 1);
    }

    if (segments[0] === "Groups" && segments[1]) {
      const group = await svc.getGroup(tenantId, segments[1]);
      return NextResponse.json(group, { headers: { "Content-Type": "application/scim+json" } });
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (e) {
    if (e instanceof SaasScimError) return scimError(e);
    return NextResponse.json({ error: "SCIM error" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  try {
    const tenantId = await resolveScimTenantId(req.headers.get("authorization"));
    const segments = (await ctx.params).path ?? [];
    if (segments[0] !== "Users") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = (await req.json()) as Record<string, unknown>;
    const user = await getSaasScimService().createUser(tenantId, {
      userName: String(body.userName ?? ""),
      name: typeof body.name === "object" && body.name && "formatted" in (body.name as object)
        ? String((body.name as { formatted?: string }).formatted)
        : undefined,
      active: body.active !== false,
      roles: Array.isArray(body.roles) ? body.roles.map(String) : undefined,
    });
    return NextResponse.json(user, { status: 201, headers: { "Content-Type": "application/scim+json" } });
  } catch (e) {
    if (e instanceof SaasScimError) return scimError(e);
    return NextResponse.json({ error: "SCIM error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  try {
    const tenantId = await resolveScimTenantId(req.headers.get("authorization"));
    const segments = (await ctx.params).path ?? [];
    if (segments[0] !== "Users" || !segments[1]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = (await req.json()) as { active?: boolean; name?: { formatted?: string }; roles?: string[] };
    const user = await getSaasScimService().patchUser(tenantId, segments[1], {
      active: body.active,
      name: body.name?.formatted,
      roles: body.roles,
    });
    return NextResponse.json(user, { headers: { "Content-Type": "application/scim+json" } });
  } catch (e) {
    if (e instanceof SaasScimError) return scimError(e);
    return NextResponse.json({ error: "SCIM error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  try {
    const tenantId = await resolveScimTenantId(req.headers.get("authorization"));
    const segments = (await ctx.params).path ?? [];
    if (segments[0] !== "Users" || !segments[1]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await getSaasScimService().deleteUser(tenantId, segments[1]);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof SaasScimError) return scimError(e);
    return NextResponse.json({ error: "SCIM error" }, { status: 500 });
  }
}
