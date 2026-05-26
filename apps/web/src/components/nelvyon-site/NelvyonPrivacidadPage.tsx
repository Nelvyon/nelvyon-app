"use client";

import { LegalDocLayout } from "./LegalDocLayout";

export function NelvyonPrivacidadPage() {
  return (
    <LegalDocLayout title="Política de Privacidad">
      <p className="lead text-zinc-500">Última actualización: mayo 2026</p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        NELVYON es el responsable del tratamiento de los datos personales recogidos a través de nelvyon.com y
        la plataforma asociada, conforme al Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018
        (LOPDGDD).
      </p>
      <p>
        Contacto del responsable: <a href="mailto:hola@nelvyon.com">hola@nelvyon.com</a>
      </p>

      <h2>2. Datos que recogemos</h2>
      <ul>
        <li>Datos identificativos: nombre, apellidos, correo electrónico, empresa.</li>
        <li>Datos de cuenta y uso de la plataforma.</li>
        <li>Datos de facturación cuando contrates un plan de pago.</li>
        <li>Datos técnicos: dirección IP, cookies, logs y dispositivo.</li>
      </ul>

      <h2>3. Finalidad del tratamiento</h2>
      <ul>
        <li>Gestión comercial y atención de solicitudes de información.</li>
        <li>Prestación del servicio contratado y soporte técnico.</li>
        <li>Facturación y cumplimiento de obligaciones legales.</li>
        <li>Mejora del producto y analítica, cuando exista consentimiento.</li>
      </ul>

      <h2>4. Base legal</h2>
      <p>
        Consentimiento del interesado, ejecución de contrato y obligación legal, según corresponda en cada
        tratamiento.
      </p>

      <h2>5. Destinatarios</h2>
      <p>
        No cedemos tus datos a terceros con fines comerciales. Utilizamos proveedores técnicos que actúan como
        encargados del tratamiento, entre otros: Railway (hosting), Supabase (base de datos), Stripe
        (pagos) y proveedores de correo o analítica necesarios para el servicio.
      </p>

      <h2>6. Plazo de conservación</h2>
      <p>
        Conservamos los datos mientras mantengas relación contractual o comercial con NELVYON y, después,
        durante los plazos legales aplicables.
      </p>

      <h2>7. Derechos ARCO y contacto</h2>
      <p>
        Puedes ejercer los derechos de acceso, rectificación, supresión, limitación, oposición y
        portabilidad escribiendo a <a href="mailto:hola@nelvyon.com">hola@nelvyon.com</a>. También puedes
        reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).
      </p>

      <h2>8. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas razonables, incluyendo cifrado en tránsito (TLS) y control
        de accesos.
      </p>
    </LegalDocLayout>
  );
}
