import Link from "next/link";

import { BrandSection } from "@/features/public-web/components/BrandBlocks";
import { BrandPageHero } from "@/features/public-web/components/BrandPageHero";

export default function GoodbyePage() {
  return (
    <>
      <BrandPageHero
        eyebrow="Cuenta"
        title="Hasta pronto"
        description="Su cuenta ha sido eliminada. Gracias por haber usado NELVYON."
        primaryCta={{ label: "Volver al inicio", href: "/" }}
        secondaryCta={{ label: "Contactar", href: "/contacto" }}
      />
      <BrandSection>
        <div className="text-center" style={{ maxWidth: 520, margin: "0 auto" }}>
          <p style={{ color: "#484848" }}>
            Si elimina la cuenta por error o necesita recuperar documentación legal, escriba a soporte.
          </p>
          <Link href="/" className="th-btn2 btn-gradient2">
            Ir a NELVYON
          </Link>
        </div>
      </BrandSection>
    </>
  );
}
