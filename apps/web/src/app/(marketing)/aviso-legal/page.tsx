import type { Metadata } from "next";
import Link from "next/link";

import { siteBrand } from "@/features/public-web";
import { Container, PageHero } from "@/features/public-web/components/ui";

export const metadata: Metadata = {
  title: "Aviso legal | NELVYON",
  description: "Aviso legal e información societaria del sitio público NELVYON.",
  alternates: { canonical: "/aviso-legal" },
};

const EFFECTIVE_DATE = "1 de agosto de 2026";

export default function AvisoLegalPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Aviso legal"
        description={`Información identificativa y condiciones de uso informativo del sitio ${siteBrand.name}.`}
      />
      <section className="py-14 md:py-20">
        <Container className="max-w-3xl">
          <article className="nv-public-panel space-y-6 p-6 text-sm leading-relaxed text-[var(--nv-muted)] md:p-10">
            <p>
              <strong className="text-slate-200">Última actualización:</strong> {EFFECTIVE_DATE}
            </p>
            <h2 className="text-lg font-semibold text-white">1. Titular del sitio</h2>
            <p>
              El sitio web público operado bajo la marca {siteBrand.name} (dominio de aplicación y propiedades
              asociadas documentadas en la infraestructura del producto) pone a disposición información comercial y
              acceso a la plataforma SaaS.
            </p>
            <p>
              Contacto:{" "}
              <a className="text-[var(--nv-accent)] hover:underline" href={`mailto:${siteBrand.contactEmail}`}>
                {siteBrand.contactEmail}
              </a>
            </p>
            <h2 className="text-lg font-semibold text-white">2. Objeto</h2>
            <p>
              Los contenidos de este sitio tienen carácter informativo sobre productos, servicios, precios orientativos
              y documentación de confianza (seguridad, estado del servicio, legal). No constituyen oferta vinculante
              salvo contrato o pedido aceptado expresamente.
            </p>
            <h2 className="text-lg font-semibold text-white">3. Propiedad intelectual</h2>
            <p>
              Textos, textos, diseño, código de interfaz propio y marcas de {siteBrand.name} están protegidos. Queda
              prohibida la reproducción no autorizada. Los recursos visuales licenciados se utilizan conforme a las
              licencias aplicables y no transfieren derechos a terceros.
            </p>
            <h2 className="text-lg font-semibold text-white">4. Responsabilidad</h2>
            <p>
              Se procura exactitud y actualización de la información. {siteBrand.name} no garantiza ausencia total de
              errores tipográficos o de disponibilidad del sitio. El acceso a la plataforma SaaS se rige por los
              términos del servicio y el plan contratado.
            </p>
            <h2 className="text-lg font-semibold text-white">5. Enlaces</h2>
            <p>
              Los enlaces a terceros se facilitan para comodidad. {siteBrand.name} no controla ni responde por sus
              contenidos o políticas.
            </p>
            <h2 className="text-lg font-semibold text-white">6. Documentación relacionada</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <Link className="text-[var(--nv-accent)] hover:underline" href="/privacidad">
                  Política de privacidad
                </Link>
              </li>
              <li>
                <Link className="text-[var(--nv-accent)] hover:underline" href="/cookies">
                  Política de cookies
                </Link>
              </li>
              <li>
                <Link className="text-[var(--nv-accent)] hover:underline" href="/terminos">
                  Términos y condiciones
                </Link>
              </li>
              <li>
                <Link className="text-[var(--nv-accent)] hover:underline" href="/legal/dpa">
                  DPA
                </Link>
              </li>
              <li>
                <Link className="text-[var(--nv-accent)] hover:underline" href="/legal/subprocessors">
                  Subprocesadores
                </Link>
              </li>
            </ul>
          </article>
        </Container>
      </section>
    </>
  );
}
