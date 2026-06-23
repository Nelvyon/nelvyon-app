import { NextResponse } from "next/server";

import { applyNelvyonAuthCookie } from "@/lib/authCookies";
import { getAuthService, issueEmailVerification } from "@nelvyon/auth";
import { initOnboarding } from "@nelvyon/onboarding";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function resolveFullName(body: Record<string, unknown>): string | null {
  if (typeof body.fullName === "string") return body.fullName;
  if (typeof body.name === "string") return body.name;
  return null;
}

function toClientMessage(msg: string): string {
  const map: Record<string, string> = {
    "Email already registered": "Este email ya está registrado",
    "Invalid email format": "Introduce un email válido",
    "Password must be at least 8 characters": "La contraseña debe tener al menos 8 caracteres",
    "Name must be at least 2 characters": "El nombre debe tener al menos 2 caracteres",
    "Full name is required": "El nombre debe tener al menos 2 caracteres",
  };
  return map[msg] ?? msg;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Cuerpo JSON inválido", 400);
  }
  if (!isRecord(body)) {
    return jsonError("El cuerpo debe ser un objeto JSON", 400);
  }
  const email = body.email;
  const password = body.password;
  const fullName = resolveFullName(body);
  if (typeof email !== "string" || typeof password !== "string" || fullName === null) {
    return jsonError("email, password y name son obligatorios", 400);
  }

  try {
    const auth = getAuthService();
    const result = await auth.register(email, password, fullName);
    const displayName = fullName.trim();
    try {
      await initOnboarding(result.userId, result.email, displayName);
    } catch (err) {
      console.error("[register] onboarding init failed:", err);
    }
    let emailVerificationSent = false;
    try {
      await issueEmailVerification(result.userId, result.email, displayName);
      emailVerificationSent = true;
    } catch (err) {
      console.error("[register] verification email failed:", err);
    }
    const res = NextResponse.json({
      userId: result.userId,
      email: result.email,
      tenantId: result.tenantId,
      token: result.token,
      expiresAt: result.expiresAt,
      emailVerificationSent,
    });
    applyNelvyonAuthCookie(res, result.token);
    return res;
  } catch (e: unknown) {
    if (e instanceof OsAgentError) {
      const msg = toClientMessage(e.message);
      if (e.message === "Email already registered") {
        return jsonError(msg, 409);
      }
      if (
        e.message === "Invalid email format" ||
        e.message.startsWith("Password") ||
        e.message === "Name must be at least 2 characters" ||
        e.message === "Full name is required"
      ) {
        return jsonError(msg, 400);
      }
      return jsonError(msg, 400);
    }
    throw e;
  }
}
