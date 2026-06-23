import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL_META } from "@/lib/legal/legalMeta";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Cómo NELVYON trata los datos personales: titularidad del cliente, finalidades, conservación y derechos RGPD.",
};

export default function PrivacyPolicyPage() {
  const m = LEGAL_META;
  return (
    <LegalPage title="Política de privacidad" lastUpdated={m.effectiveDate}>
      <p>
        <strong>Fecha de entrada en vigor:</strong> {m.effectiveDate}
      </p>
      <p>
        Esta Política de Privacidad describe cómo <strong>{m.companyLegalName}</strong> («{m.productName}», «nosotros»)
        trata los datos personales en relación con la plataforma <strong>{m.productName}</strong> y los servicios
        asociados. Complementa los <Link href="/legal/terms">Términos de servicio</Link>.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        Responsable: <strong>{m.companyLegalName}</strong>. Contacto de privacidad:{" "}
        <a href={`mailto:${m.privacyEmail}`}>{m.privacyEmail}</a>.
      </p>
      <p>
        Si actúas como agencia o empresa que introduce datos de <em>tus</em> clientes finales en la Plataforma, puedes
        ser responsable o encargado del tratamiento respecto de esos terceros. En ese caso, aplica también el{" "}
        <Link href="/legal/dpa">Acuerdo de tratamiento de datos (DPA)</Link> cuando corresponda.
      </p>

      <h2>2. Titularidad: tus datos y contenidos</h2>
      <p>
        <strong>Tú eres el titular</strong> de los datos de negocio y contenidos que cargas (contactos CRM, campañas,
        creatividades, briefs, dominios, etc.). {m.productName} actúa como responsable del tratamiento de los datos de
        cuenta y operación de la Plataforma, y en muchos casos como <strong>encargado del tratamiento</strong> respecto
        de los datos que tú introduces sobre tus clientes, limitándose a tratarlos según tus instrucciones y para
        prestar el servicio.
      </p>
      <p>
        No vendemos datos personales. No usamos el Contenido del Cliente para publicidad ajena al servicio contratado.
      </p>

      <h2>3. Datos que recopilamos</h2>
      <ul>
        <li>
          <strong>Cuenta y facturación:</strong> nombre, email, empresa, teléfono, plan, historial de pagos (vía
          procesador de pagos).
        </li>
        <li>
          <strong>Uso de la Plataforma:</strong> logs técnicos, dirección IP, identificadores de sesión, métricas de
          uso, errores y auditoría de seguridad.
        </li>
        <li>
          <strong>Contenido del Cliente:</strong> datos que tú o tus usuarios introducís al usar packs, CRM, campañas,
          portal, chatbots o integraciones.
        </li>
        <li>
          <strong>Integraciones:</strong> tokens OAuth y métricas agregadas cuando conectas GA4, Meta, email u otros
          conectores (solo con tu acción explícita).
        </li>
        <li>
          <strong>Comunicaciones:</strong> mensajes de soporte y emails transaccionales.
        </li>
      </ul>

      <h2>4. Finalidades y bases jurídicas</h2>
      <ul>
        <li>
          <strong>Prestación del servicio</strong> (ejecución contractual): operar la cuenta, packs, informes, portal
          y automatizaciones.
        </li>
        <li>
          <strong>Seguridad y fraude</strong> (interés legítimo): proteger la Plataforma, detectar abusos y cumplir la{" "}
          <Link href="/legal/acceptable-use">AUP</Link>.
        </li>
        <li>
          <strong>Facturación y obligaciones legales</strong> (obligación legal): contabilidad, fiscalidad y
          requerimientos regulatorios.
        </li>
        <li>
          <strong>Comunicaciones comerciales</strong> (consentimiento o interés legítimo B2B, según aplique): novedades
          del producto, siempre con opción de baja.
        </li>
        <li>
          <strong>Mejora del producto</strong> (interés legítimo): estadísticas agregadas y anónimas de rendimiento,
          sin perfilar a titulares de forma invasiva.
        </li>
      </ul>

      <h2>5. Conservación</h2>
      <p>
        Conservamos los datos mientras dure la relación contractual y el plazo necesario para obligaciones legales,
        reclamaciones y copias de seguridad. Tras la baja, los datos de cuenta se eliminan o anonimizan en un plazo
        razonable, salvo bloqueo legal. Puedes solicitar exportación antes del cierre.
      </p>

      <h2>6. Encargados y transferencias</h2>
      <p>
        Utilizamos proveedores de infraestructura (hosting, base de datos, email, analítica técnica, pagos) que actúan
        como encargados con contratos adecuados. Algunos pueden estar fuera del EEE; en ese caso aplicamos cláusulas
        contractuales tipo u otras garantías reconocidas por el RGPD.
      </p>

      <h2>7. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas razonables (cifrado en tránsito, control de acceso, segregación por
        workspace, copias de seguridad). Ningún sistema es 100 % seguro; debes usar contraseñas robustas y limitar
        accesos en tu organización.
      </p>

      <h2>8. Tus derechos</h2>
      <p>
        Si tus datos personales están sujetos al RGPD, puedes ejercer acceso, rectificación, supresión, limitación,
        oposición, portabilidad y retirar el consentimiento cuando aplique, escribiendo a{" "}
        <a href={`mailto:${m.privacyEmail}`}>{m.privacyEmail}</a>. También puedes reclamar ante la autoridad de
        control competente.
      </p>

      <h2>9. Menores</h2>
      <p>
        La Plataforma no está dirigida a menores de 16 años. No recopilamos conscientemente datos de menores.
      </p>

      <h2>10. Cambios</h2>
      <p>
        Podemos actualizar esta política. Publicaremos la versión vigente en{" "}
        <Link href="/legal/privacy">/legal/privacy</Link> y, si el cambio es relevante, te lo comunicaremos por medios
        apropiados.
      </p>
    </LegalPage>
  );
}
