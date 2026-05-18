import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080808] px-4 text-zinc-100">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <Link href="/" className="text-2xl font-black tracking-tight text-indigo-500">
          NELVYON
        </Link>
        <h1 className="mt-6 text-xl font-semibold text-zinc-100">Recuperar contraseña</h1>
        <p className="mt-3 text-sm text-zinc-400">
          El restablecimiento de contraseña estará disponible pronto. Mientras tanto, contacta con soporte si
          necesitas ayuda.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-block text-sm text-indigo-400 hover:text-indigo-300"
        >
          ← Volver al login
        </Link>
      </div>
    </main>
  );
}
