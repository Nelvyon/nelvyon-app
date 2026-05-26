import { BRAND } from "./shared";
import { FadeIn } from "./FadeIn";
import Link from "next/link";

export function LandingFinalCta() {
  return (
    <section className="py-24 md:py-[100px]" style={{ backgroundColor: BRAND.bgSection }}>
      <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
        <FadeIn>
          <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
            ¿Listo para dominar tu mercado?
          </h2>
          <p className="mt-4 text-lg text-[#94A3B8]">
            Empieza hoy. Sin permanencia. Resultados en semanas.
          </p>
          <div className="mt-10">
            <Link
              className="nelvyon-cta-btn nelvyon-btn-shimmer inline-flex items-center justify-center rounded-xl px-10 py-[18px] text-base font-bold text-white transition duration-200 hover:scale-[1.02]"
              href="/contacto"
            >
              Solicitar propuesta gratuita →
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
