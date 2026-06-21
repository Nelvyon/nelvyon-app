import { NextResponse } from "next/server";

import { resetPasswordWithToken } from "@nelvyon/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  const token = typeof (body as { token?: unknown }).token === "string" ? (body as { token: string }).token : "";
  const password =
    typeof (body as { password?: unknown }).password === "string" ? (body as { password: string }).password : "";

  if (!token.trim()) {
    return NextResponse.json({ error: "token es obligatorio" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }

  try {
    const result = await resetPasswordWithToken(token, password);
    if (result === "ok") {
      return NextResponse.json({ ok: true, message: "Contraseña actualizada. Ya puedes iniciar sesión." });
    }
    if (result === "expired") {
      return NextResponse.json({ error: "El enlace ha caducado. Solicita uno nuevo." }, { status: 400 });
    }
    return NextResponse.json({ error: "Enlace no válido" }, { status: 400 });
  } catch (err) {
    console.error("[auth/reset-password]", err);
    return NextResponse.json({ error: "No se pudo restablecer la contraseña" }, { status: 500 });
  }
}
