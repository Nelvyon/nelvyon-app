import Link from "next/link";

export default function GoodbyePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#080808] px-6 py-24 text-center text-zinc-100">
      <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-10">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Hasta pronto</h1>
        <p className="text-base leading-relaxed text-zinc-400">
          Tu cuenta ha sido eliminada. Gracias por usar NELVYON.
        </p>
        <Link
          href="/"
          className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
