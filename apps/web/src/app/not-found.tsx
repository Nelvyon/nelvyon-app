import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg text-center">
        {/* Big N logo */}
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-4xl font-black text-primary-foreground shadow-lg">
          N
        </div>

        <p className="text-8xl font-black tracking-tight text-primary">404</p>
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          Esta página no existe
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Puede que hayas escrito mal la URL o que la página haya sido movida.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Volver al inicio
          </Link>
          <Link
            href="/contacto"
            className="inline-flex items-center justify-center rounded-xl border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/30"
          >
            Contactar soporte
          </Link>
        </div>

        <p className="mt-12 text-xs text-muted-foreground/60">
          NELVYON · nelvyon.com
        </p>
      </div>
    </main>
  );
}
