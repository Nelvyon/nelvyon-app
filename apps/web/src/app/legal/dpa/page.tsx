import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Acuerdo de tratamiento de datos (DPA)",
  description:
    "DPA de NELVYON conforme al RGPD art. 28: roles, subencargados, seguridad, transferencias y derechos del interesado.",
};

const EFFECTIVE_DATE = "19 de mayo de 2026";

export default function DpaPage() {
  return (
    <LegalPage title="Acuerdo de tratamiento de datos (DPA)" lastUpdated={EFFECTIVE_DATE}>
      <p>
        <strong>Fecha de entrada en vigor:</strong> {EFFECTIVE_DATE}
      </p>
      <p>
        El presente documento describe el marco de tratamiento de datos personales cuando el cliente utiliza los
        servicios SaaS de NELVYON, en cumplimiento del Reglamento (UE) 2016/679 (RGPD), en particular su artículo 28.
      </p>

      <h2>1. Roles</h2>
      <ul>
        <li>
          <strong>Responsable del tratamiento (Controller):</strong> el cliente que contrata NELVYON y determina las
          finalidades y medios del tratamiento respecto a los datos de sus usuarios finales o empleados.
        </li>
        <li>
          <strong>Encargado del tratamiento (Processor):</strong> NELVYON, que trata datos personales por cuenta del
          cliente y conforme a sus instrucciones documentadas.
        </li>
      </ul>

      <h2>2. Datos y finalidad</h2>
      <p>Datos tratados de forma habitual:</p>
      <ul>
        <li>Nombre y dirección de correo electrónico de usuarios de la cuenta.</li>
        <li>Datos de uso de la plataforma (logs, métricas, configuración de agentes y proyectos).</li>
        <li>Contenido introducido en la plataforma para la prestación del servicio contratado.</li>
      </ul>
      <p>
        <strong>Finalidad:</strong> prestación, mantenimiento, seguridad y mejora del servicio SaaS contratado; soporte
        técnico; facturación cuando aplique.
      </p>

      <h2>3. Subencargados autorizados</h2>
      <p>El cliente autoriza el uso de los siguientes subencargados, sujetos a obligaciones contractuales equivalentes:</p>
      <ul>
        <li>OpenAI — procesamiento de IA y modelos de lenguaje.</li>
        <li>Supabase — base de datos y almacenamiento gestionado.</li>
        <li>Railway — hosting e infraestructura de aplicación.</li>
        <li>Paddle — pagos y facturación como Merchant of Record.</li>
        <li>Amazon SES — envío de correos transaccionales.</li>
        <li>Upstash — caché y rate limiting.</li>
      </ul>
      <p>
        NELVYON notificará cambios materiales en subencargados mediante actualización de esta página o aviso razonable al
        cliente.
      </p>

      <h2>4. Medidas de seguridad</h2>
      <ul>
        <li>Cifrado en tránsito: TLS 1.2 o superior (TLS 1.3 donde esté disponible).</li>
        <li>Cifrado en reposo: AES-256 o estándares equivalentes en proveedores certificados.</li>
        <li>Control de acceso, segregación por tenant y registro de actividad según capacidades del producto.</li>
      </ul>

      <h2>5. Transferencias internacionales</h2>
      <p>
        Cuando los datos se transfieran fuera del Espacio Económico Europeo, NELVYON aplicará las garantías adecuadas,
        incluidas las <strong>cláusulas contractuales tipo (SCC)</strong> de la Comisión Europea u otro mecanismo válido
        conforme al RGPD.
      </p>

      <h2>6. Derechos del interesado</h2>
      <p>
        Las solicitudes de ejercicio de derechos (acceso, rectificación, supresión, limitación, portabilidad, oposición)
        deben dirigirse en primer lugar al cliente como responsable. NELVYON asistirá al cliente en la medida de lo
        técnicamente posible. Contacto de NELVYON:{" "}
        <a href="mailto:legal@nelvyon.com">legal@nelvyon.com</a>.
      </p>

      <h2>7. Retención y supresión</h2>
      <p>
        Tras la baja del servicio, los datos personales del cliente se eliminarán o anonimizarán en un plazo máximo de{" "}
        <strong>30 días</strong>, salvo obligación legal de conservación o copias de seguridad con ciclo de vida
        acotado.
      </p>

      <h2>8. Incidencias de seguridad</h2>
      <p>
        NELVYON notificará al cliente sin dilación indebida las violaciones de seguridad de datos personales que le
        afecten, cuando sea exigible conforme al RGPD, facilitando la información necesaria para cumplir con las
        obligaciones del responsable.
      </p>
    </LegalPage>
  );
}
