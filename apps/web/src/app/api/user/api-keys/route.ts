import { NextResponse } from "next/server";

import { captureUnknownApiError } from "@/lib/sentryCapture";
import { authenticate } from "@nelvyon/auth";
import { deleteApiKey, isApiKeyProvider, listUserProviders, saveApiKey, type ApiKeyProvider } from "@nelvyon/apikeys";
import { toClientError } from "@nelvyon/errors";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const claims = await authenticate(req);
    const providers = await listUserProviders(claims.userId);
    return NextResponse.json({ providers });
  } catch (e: unknown) {
    const p = toClientError(e);
    return NextResponse.json(
      { error: p.code, message: p.message, action: p.action, actionUrl: p.actionUrl },
      { status: p.statusCode },
    );
  }
}

export async function POST(req: Request) {
  try {
    const claims = await authenticate(req);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "INVALID_INPUT", message: "JSON inválido." }, { status: 400 });
    }
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "INVALID_INPUT", message: "Cuerpo inválido." }, { status: 400 });
    }
    const o = body as Record<string, unknown>;
    const provider = o.provider;
    const key = o.key;
    if (typeof provider !== "string" || typeof key !== "string" || !key.trim()) {
      return NextResponse.json({ error: "INVALID_INPUT", message: "Indica provider y key." }, { status: 400 });
    }
    if (!isApiKeyProvider(provider)) {
      return NextResponse.json({ error: "INVALID_INPUT", message: "Proveedor no soportado." }, { status: 400 });
    }
    await saveApiKey(claims.userId, provider as ApiKeyProvider, key.trim());
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("[api/user/api-keys] POST failed:", e);
    const p = toClientError(e);
    return NextResponse.json(
      { error: p.code, message: p.message, action: p.action, actionUrl: p.actionUrl },
      { status: p.statusCode },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const claims = await authenticate(req);
    const provider = new URL(req.url).searchParams.get("provider");
    if (!provider) {
      return NextResponse.json({ error: "INVALID_INPUT", message: "Falta el parámetro provider." }, { status: 400 });
    }
    if (!isApiKeyProvider(provider)) {
      return NextResponse.json({ error: "INVALID_INPUT", message: "Proveedor no soportado." }, { status: 400 });
    }
    await deleteApiKey(claims.userId, provider as ApiKeyProvider);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("[api/user/api-keys] DELETE failed:", e);
    const p = toClientError(e);
    captureUnknownApiError(e, p.code);
    return NextResponse.json(
      { error: p.code, message: p.message, action: p.action, actionUrl: p.actionUrl },
      { status: p.statusCode },
    );
  }
}
