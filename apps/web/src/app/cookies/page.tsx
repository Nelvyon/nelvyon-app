import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";
import { siteBrand } from "@/features/public-web";

export const metadata: Metadata = {
  title: "Política de cookies | NELVYON",
  description: "Información sobre cookies y tecnologías similares en NELVYON.",
  alternates: { canonical: "/cookies" },
};

const EFFECTIVE_DATE = "1 de agosto de 2026";

export default function CookiesPage() {
  return (
    <LegalPage title="Política de cookies" lastUpdated={EFFECTIVE_DATE}>
      <p>
        Esta política describe el uso de cookies y tecnologías similares en los sitios y aplicaciones de{" "}
        {siteBrand.name}. Contacto:{" "}
        <a href={`mailto:${siteBrand.contactEmail}`}>{siteBrand.contactEmail}</a>.
      </p>
      <h2>1. Qué son las cookies</h2>
      <p>
        Las cookies son pequeños archivos que el navegador almacena para recordar preferencias, mantener sesión o
        medir uso agregado del sitio.
      </p>
      <h2>2. Tipos que podemos utilizar</h2>
      <ul>
        <li>
          <strong>Necesarias:</strong> autenticación, seguridad, preferencias esenciales y equilibrio de carga.
        </li>
        <li>
          <strong>Preferencias:</strong> idioma u opciones de interfaz cuando estén habilitadas.
        </li>
        <li>
          <strong>Analítica:</strong> medición agregada de uso (p. ej. herramientas de producto analytics) cuando
          estén configuradas y, si aplica, con base de consentimiento.
        </li>
      </ul>
      <h2>3. Gestión</h2>
      <p>
        Puede configurar su navegador para bloquear o eliminar cookies. Algunas funciones (como mantener sesión)
        pueden dejar de operar correctamente si bloquea cookies necesarias.
      </p>
      <h2>4. Más información</h2>
      <p>
        Consulte la <a href="/privacidad">Política de privacidad</a> para el marco de tratamiento de datos
        personales.
      </p>
    </LegalPage>
  );
}
