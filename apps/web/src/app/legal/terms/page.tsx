import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL_META } from "@/lib/legal/legalMeta";

export const metadata: Metadata = {
  title: "Términos de servicio",
  description:
    "Condiciones de uso de la plataforma NELVYON: software propietario, titularidad, datos del cliente y limitación de responsabilidad.",
};

export default function TermsOfServicePage() {
  const m = LEGAL_META;
  return (
    <LegalPage title="Términos de servicio" lastUpdated={m.effectiveDate}>
      <p>
        <strong>Fecha de entrada en vigor:</strong> {m.effectiveDate}
      </p>
      <p>
        Estos Términos de Servicio («Términos») regulan el acceso y uso de la plataforma{" "}
        <strong>{m.productName}</strong> («la Plataforma»), operada por <strong>{m.companyLegalName}</strong> («
        {m.productName}», «nosotros» o «la Empresa»). Al registrarte, contratar un plan o utilizar la Plataforma, aceptas
        estos Términos en su totalidad.
      </p>

      <h2>1. Naturaleza del servicio y software propietario</h2>
      <p>
        {m.productName} es una <strong>plataforma de software propietario</strong> (SaaS) para marketing digital,
        automatización y gestión de packs de servicios. El código fuente, la arquitectura, los agentes, plantillas,
        diseños, marcas, documentación y demás elementos de la Plataforma son propiedad exclusiva de la Empresa o de
        sus licenciantes.
      </p>
      <p>
        Se te concede una <strong>licencia limitada, no exclusiva, intransferible y revocable</strong> para usar la
        Plataforma conforme a tu plan y a estos Términos. No adquieres ningún derecho de propiedad sobre el software ni
        sobre los componentes internos de {m.productName}.
      </p>
      <p>Queda prohibido, salvo autorización escrita expresa:</p>
      <ul>
        <li>Copiar, descompilar, realizar ingeniería inversa o extraer el código fuente de la Plataforma.</li>
        <li>Revender, sublicenciar, alquilar o poner la Plataforma a disposición de terceros fuera de tu cuenta.</li>
        <li>Eliminar avisos de propiedad intelectual o marcas de {m.productName}.</li>
        <li>Usar la Plataforma para desarrollar un producto competidor sustancialmente similar.</li>
      </ul>

      <h2>2. Titularidad de los datos y contenidos del cliente</h2>
      <p>
        <strong>Tú conservas la titularidad</strong> de los datos, textos, imágenes, briefs, listas de contactos,
        campañas, informes exportados y cualquier otro contenido que tú o tus usuarios introduzcáis en la Plataforma («
        <strong>Contenido del Cliente</strong>»).
      </p>
      <p>
        Otorgas a {m.productName} una licencia <strong>limitada al tiempo de la relación contractual</strong> para
        alojar, procesar, transmitir y mostrar el Contenido del Cliente <strong>únicamente</strong> con el fin de
        prestar, mantener, asegurar y mejorar el servicio contratado (incluida la ejecución de packs, informes,
        automatizaciones e integraciones que actives).
      </p>
      <p>
        No utilizamos el Contenido del Cliente para entrenar modelos de terceros ni para fines publicitarios ajenos al
        servicio, salvo que lo autorices expresamente o la ley lo exija. Consulta la{" "}
        <Link href="/legal/privacy">Política de privacidad</Link> para el detalle del tratamiento de datos personales.
      </p>

      <h2>3. Cuentas, planes y facturación</h2>
      <p>
        Eres responsable de la confidencialidad de tus credenciales y de toda actividad bajo tu cuenta. Debes
        proporcionar información veraz y mantenerla actualizada. Los precios, límites de uso y funcionalidades dependen
        del plan contratado; los cambios de precio se comunicarán con el preaviso indicado en tu contrato o en la
        interfaz de facturación.
      </p>

      <h2>4. Uso aceptable</h2>
      <p>
        Debes utilizar la Plataforma de forma lícita y conforme a estos Términos y a la{" "}
        <Link href="/legal/acceptable-use">Política de uso aceptable (AUP)</Link>. En particular, no debes:
      </p>
      <ul>
        <li>Enviar spam, phishing, malware o contenido ilegal, difamatorio o que vulnere derechos de terceros.</li>
        <li>Intentar eludir límites técnicos, medidas de seguridad o controles de acceso.</li>
        <li>Realizar scraping masivo no autorizado ni sobrecargar la infraestructura de forma abusiva.</li>
        <li>Usar la Plataforma para actividades fraudulentas, suplantación de identidad o incumplimiento normativo.</li>
      </ul>
      <p>
        El incumplimiento puede conllevar suspensión o terminación inmediata de la cuenta, sin perjuicio de otras
        acciones.
      </p>

      <h2>5. Resultados generados por IA y packs</h2>
      <p>
        La Plataforma puede generar borradores, informes, landings, emails u otros materiales mediante automatización e
        IA. <strong>Tú eres responsable</strong> de revisar, validar y aprobar todo material antes de publicarlo o
        enviarlo a tus clientes finales. {m.productName} no garantiza resultados comerciales concretos (ventas, leads,
        posicionamiento, ROAS, etc.).
      </p>

      <h2>6. Limitación de responsabilidad</h2>
      <p>
        En la máxima medida permitida por la ley aplicable, la Plataforma se proporciona «<strong>tal cual</strong>» y «
        <strong>según disponibilidad</strong>». {m.productName} no será responsable de:
      </p>
      <ul>
        <li>Daños indirectos, lucro cesante, pérdida de datos o de oportunidades de negocio.</li>
        <li>Fallos de terceros (Google, Meta, proveedores de email, hosting, pasarelas de pago).</li>
        <li>Contenido generado o publicado por ti o por tus usuarios finales.</li>
        <li>Interrupciones por mantenimiento, fuerza mayor o causas fuera de nuestro control razonable.</li>
      </ul>
      <p>
        La responsabilidad total acumulada de {m.productName} por cualquier reclamación relacionada con el servicio se
        limitará, como máximo, al importe que hayas pagado por el servicio en los{" "}
        <strong>doce (12) meses anteriores</strong> al hecho que origine la reclamación, salvo que la ley imperativa
        disponga otra cosa (p. ej. derechos irrenunciables de consumidores).
      </p>

      <h2>7. Suspensión y terminación</h2>
      <p>
        Puedes dejar de usar el servicio según las condiciones de tu plan. Podemos suspender o terminar el acceso por
        incumplimiento grave, riesgo de seguridad o impago, con o sin previo aviso cuando sea necesario para proteger la
        Plataforma o a otros usuarios. Tras la terminación, podrás solicitar exportación de tu Contenido del Cliente
        durante un plazo razonable, salvo obligación legal de conservación o bloqueo.
      </p>

      <h2>8. Modificaciones</h2>
      <p>
        Podemos actualizar estos Términos. Los cambios materiales se notificarán por email o en la Plataforma con
        antelación razonable. El uso continuado tras la entrada en vigor implica aceptación, salvo que la ley exija
        consentimiento expreso.
      </p>

      <h2>9. Ley aplicable y jurisdicción</h2>
      <p>
        Estos Términos se rigen por la legislación de <strong>{m.jurisdiction}</strong>. Salvo norma imperativa en
        contrario, las partes se someten a la jurisdicción de <strong>{m.courts}</strong>.
      </p>

      <h2>10. Contacto</h2>
      <p>
        Para consultas legales: <a href={`mailto:${m.contactEmail}`}>{m.contactEmail}</a>. Soporte general:{" "}
        <a href={`mailto:${m.supportEmail}`}>{m.supportEmail}</a>.
      </p>
    </LegalPage>
  );
}
