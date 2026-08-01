import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";
import { integrationItems, siteBrand } from "@/features/public-web";

export const metadata: Metadata = {
  title: "Subprocesadores | NELVYON",
  description:
    "Listado de subprocesadores y categorías de tratamiento asociadas a los servicios NELVYON.",
  alternates: { canonical: "/legal/subprocessors" },
};

const EFFECTIVE_DATE = "1 de agosto de 2026";

export default function SubprocessorsPage() {
  return (
    <LegalPage title="Subprocesadores" lastUpdated={EFFECTIVE_DATE}>
      <p>
        <strong>Fecha de entrada en vigor:</strong> {EFFECTIVE_DATE}
      </p>
      <p>
        Esta página describe los subprocesadores (subencargados del tratamiento) que {siteBrand.name} puede utilizar
        para prestar la plataforma SaaS, el envío de comunicaciones y servicios asociados. Complementa el{" "}
        <a href="/legal/dpa">Acuerdo de tratamiento de datos (DPA)</a>.
      </p>

      <h2>1. Criterio de publicación</h2>
      <p>
        Solo se listan proveedores con rol relevante en el tratamiento o en la infraestructura de producción
        documentada. La conectividad de producto (nativo, API, webhook o infraestructura) se detalla también en{" "}
        <a href="/integraciones">Integraciones</a>.
      </p>

      <h2>2. Subprocesadores principales</h2>
      <ul>
        <li>
          <strong>Railway</strong> — hosting e infraestructura de aplicación (runtime de producción).
        </li>
        <li>
          <strong>PostgreSQL en infraestructura gestionada</strong> — almacenamiento persistente de datos de producto
          (Postgres 16 en el target documentado).
        </li>
        <li>
          <strong>Amazon SES</strong> — correo transaccional y campañas cuando SES está configurado.
        </li>
        <li>
          <strong>Stripe</strong> — pagos y facturación de planes SaaS.
        </li>
        <li>
          <strong>Upstash</strong> — caché y rate limiting en entornos donde esté habilitado.
        </li>
        <li>
          <strong>Twilio / WhatsApp Business</strong> — comunicaciones cuando el cliente activa esos canales.
        </li>
        <li>
          <strong>Proveedores de modelos de IA</strong> — procesamiento de IA según configuración del entorno
          (incluyendo rutas de IA privada/local cuando apliquen). No se habilitan por defecto en producción sin
          controles de canary/documentación.
        </li>
      </ul>

      <h2>3. Categorías y notas de producto</h2>
      <ul>
        {integrationItems.map((item) => (
          <li key={item.id}>
            <strong>{item.name}</strong> ({item.connectivity}) — {item.summary} {item.statusNote}
          </li>
        ))}
      </ul>

      <h2>4. Cambios</h2>
      <p>
        {siteBrand.name} actualizará esta página ante cambios materiales de subprocesadores. Para consultas:{" "}
        <a href={`mailto:${siteBrand.contactEmail}`}>{siteBrand.contactEmail}</a>.
      </p>
    </LegalPage>
  );
}
