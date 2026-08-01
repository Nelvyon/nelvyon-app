import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";
import { siteBrand } from "@/features/public-web";

export const metadata: Metadata = {
  title: "Términos y condiciones | NELVYON",
  description: "Términos de uso del sitio y de los servicios NELVYON.",
  alternates: { canonical: "/terminos" },
};

const EFFECTIVE_DATE = "1 de agosto de 2026";

export default function TerminosPage() {
  return (
    <LegalPage title="Términos y condiciones" lastUpdated={EFFECTIVE_DATE}>
      <p>
        Estos términos regulan el uso del sitio público y, junto con el pedido o contrato aplicable, el acceso a
        los servicios de {siteBrand.name}. Contacto:{" "}
        <a href={`mailto:${siteBrand.contactEmail}`}>{siteBrand.contactEmail}</a>.
      </p>
      <h2>1. Aceptación</h2>
      <p>
        Al acceder al sitio o utilizar la plataforma, usted acepta estos términos y la documentación legal
        vinculada (privacidad, cookies, DPA cuando proceda).
      </p>
      <h2>2. Servicios</h2>
      <p>
        {siteBrand.name} ofrece plataforma SaaS B2B, servicios de agencia/packs de marketing operados con IA y
        funcionalidades asociadas según el plan contratado. Las descripciones comerciales del sitio son informativas.
      </p>
      <h2>3. Cuentas y acceso</h2>
      <p>
        El cliente es responsable de la confidencialidad de credenciales, del uso conforme por sus usuarios y de la
        licitud de los datos que introduce en la plataforma.
      </p>
      <h2>4. Planes y pagos</h2>
      <p>
        Los precios publicados (Starter, Growth, Elite) son orientativos de lista. La facturación se gestiona según
        el plan activo del tenant y el proveedor de pagos configurado (Stripe).
      </p>
      <h2>5. Uso aceptable</h2>
      <p>
        Queda prohibido el uso ilícito, abusivo, que comprometa la seguridad o que vulnere derechos de terceros.
        Véase también la política de uso aceptable en <a href="/legal/acceptable-use">/legal/acceptable-use</a> si
        aplica a su cuenta.
      </p>
      <h2>6. Propiedad intelectual</h2>
      <p>
        {siteBrand.name} y sus licenciantes conservan los derechos sobre software, marcas y contenidos propios. El
        cliente conserva derechos sobre sus datos y contenidos.
      </p>
      <h2>7. Limitación de responsabilidad</h2>
      <p>
        En la medida permitida por la ley, la responsabilidad de {siteBrand.name} se limita a lo pactado
        contractualmente para el servicio afectado. El sitio informativo se ofrece «tal cual».
      </p>
      <h2>8. Ley aplicable</h2>
      <p>
        Salvo norma imperativa en contrario, se aplicará la legislación española y los tribunales competentes
        correspondientes al domicilio del titular del servicio.
      </p>
    </LegalPage>
  );
}
