import { BRAND } from "./shared";
import { FadeIn } from "./FadeIn";
import { PrimaryButton } from "./ui";

export function LandingFinalCta() {
  return (
    <section
      className="relative overflow-hidden py-20 md:py-28"
      style={{
        background: `linear-gradient(135deg, ${BRAND.heroGradEnd} 0%, ${BRAND.blue}55 45%, ${BRAND.bg} 100%)`,
      }}
    >
      <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
        <FadeIn>
          <h2 className="nelvyon-title-glow text-3xl font-extrabold tracking-tight text-white md:text-4xl lg:text-5xl">
            Tu competencia ya invierte en digital. ¿Y tú?
          </h2>
          <p className="mt-4 text-lg" style={{ color: BRAND.textMuted }}>
            Cuéntanos tu negocio y recibe una propuesta personalizada en 48 horas.
          </p>
          <div className="mt-8">
            <PrimaryButton className="nelvyon-glow-btn px-8 py-4 text-base hover:scale-[1.03]" href="/contacto">
              Solicitar propuesta gratis →
            </PrimaryButton>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
