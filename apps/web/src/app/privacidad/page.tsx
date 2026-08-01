import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";
import { siteBrand } from "@/features/public-web";

export const metadata: Metadata = {
  title: "Política de privacidad | NELVYON",
  description:
    "Cómo NELVYON recoge, usa y protege datos personales conforme al RGPD.",
  alternates: { canonical: "/privacidad" },
};

const EFFECTIVE_DATE = "1 de agosto de 2026";

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de privacidad" lastUpdated={EFFECTIVE_DATE}>
      <p>
        <strong>Responsable:</strong> {siteBrand.name}. Contacto:{" "}
        <a href={`mailto:${siteBrand.contactEmail}`}>{siteBrand.contactEmail}</a>. Soporte:{" "}
        <a href={`mailto:${siteBrand.supportEmail}`}>{siteBrand.supportEmail}</a>.
      </p>
      <h2>1. Datos que tratamos</h2>
      <p>
        Datos de contacto y formularios (nombre, email, empresa, teléfono, mensaje), datos de cuenta SaaS,
        datos de uso de la plataforma necesarios para prestar el servicio, y datos técnicos de seguridad
        (p. ej. logs y control de acceso).
      </p>
      <h2>2. Finalidades</h2>
      <ul>
        <li>Responder solicitudes comerciales y de soporte.</li>
        <li>Prestar, asegurar y mejorar la plataforma SaaS y servicios asociados.</li>
        <li>Facturación y cumplimiento contractual.</li>
        <li>Cumplir obligaciones legales y de seguridad.</li>
      </ul>
      <h2>3. Base jurídica</h2>
      <p>
        Ejecución de contrato o medidas precontractuales, interés legítimo en seguridad y mejora del servicio,
        cumplimiento legal y, cuando proceda, consentimiento (p. ej. comunicaciones comerciales opcionales).
      </p>
      <h2>4. Conservación</h2>
      <p>
        Conservamos los datos el tiempo necesario para las finalidades indicadas y los plazos legales aplicables.
        Los leads de marketing se gestionan conforme a criterios operativos y solicitudes de supresión.
      </p>
      <h2>5. Encargados y subprocesadores</h2>
      <p>
        Podemos recurrir a encargados del tratamiento. Consulte el <a href="/legal/dpa">DPA</a> y la lista de{" "}
        <a href="/legal/subprocessors">subprocesadores</a>.
      </p>
      <h2>6. Derechos</h2>
      <p>
        Puede ejercer acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a{" "}
        {siteBrand.contactEmail}. También puede reclamar ante la autoridad de control competente.
      </p>
      <h2>7. Cookies</h2>
      <p>
        El uso de cookies se describe en la <a href="/cookies">Política de cookies</a>.
      </p>
      <h2>8. Cambios</h2>
      <p>Actualizaremos esta política cuando cambien prácticas materiales de tratamiento.</p>
    </LegalPage>
  );
}
