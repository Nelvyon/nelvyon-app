import { NextResponse } from "next/server";

import { requestPasswordReset } from "@nelvyon/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  const email =
    typeof body === "object" && body !== null && "email" in body && typeof (body as { email: unknown }).email === "string"
      ? (body as { email: string }).email
      : null;

  if (!email?.trim()) {
    return NextResponse.json({ error: "email es obligatorio" }, { status: 400 });
  }

  try {
    await requestPasswordReset(email);
  } catch (err) {
    console.error("[auth/forgot-password]", err);
    return NextResponse.json({ error: "No se pudo procesar la solicitud" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Si existe una cuenta con ese email, recibirás un enlace para restablecer la contraseña.",
  });
}
