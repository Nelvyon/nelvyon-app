import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-2xl flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-semibold">404 - Página no encontrada</h1>
      <Link href="/" className="mt-4 text-indigo-400 underline">
        Volver al inicio
      </Link>
    </main>
  );
}
