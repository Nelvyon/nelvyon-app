import Image from "next/image";
import Link from "next/link";

export function NelvyonFooter() {
  return (
    <footer className="bg-[#07122a] text-white">
      <div className="mx-auto max-w-6xl px-4 py-14 lg:px-6">
        <div className="mb-10 flex flex-col gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png.png" alt="NELVYON" width={36} height={36} className="object-contain" />
            <span className="text-lg font-bold">NELVYON</span>
          </Link>
          <p className="max-w-sm text-sm text-white/70 italic">
            Donde nace tu imperio, crece tu marca y se impone tu legado
          </p>
        </div>

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#00d6fe]">Producto</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <Link href="/" className="hover:text-white">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/saas" className="hover:text-white">
                  SaaS
                </Link>
              </li>
              <li>
                <Link href="/servicios" className="hover:text-white">
                  Servicios
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white">
                  Precios
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#00d6fe]">Empresa</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <Link href="/nosotros" className="hover:text-white">
                  Nosotros
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/contacto" className="hover:text-white">
                  Contacto
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#00d6fe]">Legal</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <Link href="/privacy" className="hover:text-white">
                  Privacidad
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white">
                  Términos
                </Link>
              </li>
              <li>
                <Link href="/legal/cookies" className="hover:text-white">
                  Cookies
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#00d6fe]">Contacto</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <a href="mailto:soporte@nelvyon.com" className="hover:text-white">
                  soporte@nelvyon.com
                </a>
              </li>
              <li>Madrid, España</li>
            </ul>
          </div>
        </div>

        <p className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/50">
          © 2024 NELVYON. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
