"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const MESSAGES: Record<string, { title: string; body: string; tone: "ok" | "error" }> = {
  ok: {
    title: "Email confirmado",
    body: "Tu dirección de correo ha sido verificada. Ya puedes usar todas las funciones de NELVYON.",
    tone: "ok",
  },
  expired: {
    title: "Enlace caducado",
    body: "El enlace de verificación ha expirado. Inicia sesión y solicita un nuevo correo desde tu cuenta.",
    tone: "error",
  },
  invalid: {
    title: "Enlace no válido",
    body: "No hemos podido verificar tu email con este enlace. Comprueba que copiaste la URL completa.",
    tone: "error",
  },
};

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const status = searchParams?.get("status") ?? "invalid";
  const info = MESSAGES[status] ?? MESSAGES.invalid;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080808] px-4 text-zinc-100">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <Link href="/" className="text-2xl font-black tracking-tight text-indigo-500">
          NELVYON
        </Link>
        <h1
          className={`mt-6 text-xl font-semibold ${info.tone === "ok" ? "text-emerald-400" : "text-red-300"}`}
        >
          {info.title}
        </h1>
        <p className="mt-3 text-sm text-zinc-400">{info.body}</p>
        <Link
          href="/dashboard"
          className="mt-8 inline-block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Ir al dashboard →
        </Link>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-zinc-400">Cargando…</p>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
