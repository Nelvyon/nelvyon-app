import type { Metadata } from "next";
import Link from "next/link";

import { siteBrand } from "@/features/public-web";
import { BrandSection } from "@/features/public-web/components/BrandBlocks";
import { BrandPageHero } from "@/features/public-web/components/BrandPageHero";

export const metadata: Metadata = {
  title: { absolute: "Aviso legal | NELVYON" },
  description: "Aviso legal e información societaria del sitio público NELVYON.",
  alternates: { canonical: "/aviso-legal" },
};

const EFFECTIVE_DATE = "1 de agosto de 2026";

export default function AvisoLegalPage() {
  return (
    <>
      <BrandPageHero
        eyebrow="Legal"
        title="Aviso legal"
        description={`Información identificativa y condiciones de uso informativo del sitio ${siteBrand.name}.`}
      />
      <BrandSection>
        <article style={{ maxWidth: 720, margin: "0 auto", color: "#484848", lineHeight: 1.7 }}>
          <p>
            <strong>Última actualización:</strong> {EFFECTIVE_DATE}
          </p>
          <h2 className="h5" style={{ color: "#06050B" }}>
            1. Titular del sitio
          </h2>
          <p>
            El sitio web público operado bajo la marca {siteBrand.name} pone a disposición información comercial y
            acceso a la plataforma SaaS.
          </p>
          <p>
            Contacto:{" "}
            <a href={`mailto:${siteBrand.contactEmail}`} style={{ color: "#0084FF" }}>
              {siteBrand.contactEmail}
            </a>
          </p>
          <p>
            <strong>Datos registrales (completar antes de producción):</strong> razón social, NIF/CIF, domicilio
            social e inscripción en Registro Mercantil —{" "}
            <em>[PENDIENTE_DATOS_REGISTRALES]</em>. Hasta entonces, el canal válido de identificación operativa es{" "}
            {siteBrand.contactEmail}.
          </p>
          <h2 className="h5" style={{ color: "#06050B" }}>
            2. Objeto
          </h2>
          <p>
            Los contenidos de este sitio tienen carácter informativo sobre productos, servicios, precios orientativos
            y documentación de confianza. No constituyen oferta vinculante salvo contrato o pedido aceptado
            expresamente.
          </p>
          <h2 className="h5" style={{ color: "#06050B" }}>
            3. Propiedad intelectual
          </h2>
          <p>
            Textos, textos, diseño, código de interfaz propio y marcas de {siteBrand.name} están protegidos. Queda
            prohibida la reproducción no autorizada.
          </p>
          <h2 className="h5" style={{ color: "#06050B" }}>
            4. Responsabilidad
          </h2>
          <p>
            Se procura exactitud y actualización de la información. {siteBrand.name} no garantiza ausencia total de
            errores tipográficos o de disponibilidad del sitio. El acceso a la plataforma SaaS se rige por los
            términos del servicio y el plan contratado.
          </p>
          <h2 className="h5" style={{ color: "#06050B" }}>
            5. Enlaces
          </h2>
          <p>
            Los enlaces a terceros se facilitan para comodidad. {siteBrand.name} no controla ni responde por sus
            contenidos o políticas.
          </p>
          <h2 className="h5" style={{ color: "#06050B" }}>
            6. Documentación relacionada
          </h2>
          <ul>
            <li>
              <Link href="/privacidad" style={{ color: "#0084FF" }}>
                Política de privacidad
              </Link>
            </li>
            <li>
              <Link href="/cookies" style={{ color: "#0084FF" }}>
                Política de cookies
              </Link>
            </li>
            <li>
              <Link href="/terminos" style={{ color: "#0084FF" }}>
                Términos y condiciones
              </Link>
            </li>
            <li>
              <Link href="/legal/dpa" style={{ color: "#0084FF" }}>
                DPA
              </Link>
            </li>
            <li>
              <Link href="/legal/subprocessors" style={{ color: "#0084FF" }}>
                Subprocesadores
              </Link>
            </li>
          </ul>
        </article>
      </BrandSection>
    </>
  );
}
