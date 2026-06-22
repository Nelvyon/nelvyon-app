import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Política de privacidad | NELVYON",
  description:
    "Política de privacidad de NELVYON. Cómo recogemos, usamos y protegemos tus datos personales conforme al RGPD.",
};

const EFFECTIVE_DATE = "22 de junio de 2026";

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Política de privacidad" lastUpdated={EFFECTIVE_DATE}>
      <p>
        <strong>Responsable del tratamiento:</strong> NELVYON (danicaste2004@gmail.com)
      </p>

      <h2>1. Datos que recogemos</h2>
      <p>Recogemos los siguientes datos cuando usas NELVYON:</p>
      <ul>
        <li>Datos de registro: nombre, dirección de correo electrónico y contraseña cifrada.</li>
        <li>Datos de facturación: gestionados directamente por Stripe. NELVYON no almacena datos de tarjeta.</li>
        <li>Datos de uso: páginas visitadas, funciones utilizadas, errores producidos.</li>
        <li>Datos técnicos: dirección IP, tipo de navegador, sistema operativo.</li>
        <li>Contenidos que introduces: contactos, campañas, workflows y demás datos de tu workspace.</li>
      </ul>

      <h2>2. Base legal del tratamiento</h2>
      <ul>
        <li>Ejecución del contrato (art. 6.1.b RGPD): para prestarte el servicio contratado.</li>
        <li>Interés legítimo (art. 6.1.f RGPD): para mejorar el servicio y prevenir fraudes.</li>
        <li>Consentimiento (art. 6.1.a RGPD): para comunicaciones de marketing opcionales.</li>
        <li>Obligación legal (art. 6.1.c RGPD): para conservar facturas y registros fiscales.</li>
      </ul>

      <h2>3. Finalidades del tratamiento</h2>
      <ul>
        <li>Prestar y mantener el servicio SaaS de NELVYON.</li>
        <li>Gestionar tu suscripción y facturación mediante Stripe.</li>
        <li>Enviarte correos transaccionales (confirmaciones, alertas del servicio).</li>
        <li>Detectar y prevenir fraudes y abusos.</li>
        <li>Cumplir obligaciones legales y fiscales.</li>
        <li>Mejorar la plataforma mediante análisis de uso agregado y anonimizado.</li>
      </ul>

      <h2>4. Encargados del tratamiento (subprocesadores)</h2>
      <p>Utilizamos los siguientes proveedores que actúan como encargados del tratamiento:</p>
      <ul>
        <li><strong>Supabase</strong> — base de datos y autenticación (UE/EEE).</li>
        <li><strong>Railway</strong> — infraestructura de servidores (EEUU, bajo SCCs UE).</li>
        <li><strong>Stripe</strong> — procesamiento de pagos (EEUU, bajo SCCs UE).</li>
        <li><strong>Amazon Web Services (SES)</strong> — envío de correo electrónico (EEUU, bajo SCCs UE).</li>
        <li><strong>OpenAI</strong> — procesamiento de IA (EEUU, bajo SCCs UE). Los datos de IA no se usan para entrenar modelos.</li>
        <li><strong>Sentry</strong> — monitorización de errores (EEUU, bajo SCCs UE).</li>
      </ul>

      <h2>5. Transferencias internacionales</h2>
      <p>
        Algunos proveedores están en EEUU. Las transferencias se realizan bajo las Cláusulas Contractuales Tipo (SCCs)
        aprobadas por la Comisión Europea o mediante el marco EU-US Data Privacy Framework.
      </p>

      <h2>6. Conservación de datos</h2>
      <ul>
        <li>Datos de cuenta: mientras tu cuenta esté activa + 3 años tras la baja.</li>
        <li>Datos de facturación: 7 años por obligación fiscal.</li>
        <li>Logs de seguridad: 12 meses.</li>
        <li>Datos de uso anonimizados: indefinidamente.</li>
      </ul>

      <h2>7. Tus derechos</h2>
      <p>Conforme al RGPD tienes derecho a:</p>
      <ul>
        <li><strong>Acceso:</strong> obtener copia de tus datos personales.</li>
        <li><strong>Rectificación:</strong> corregir datos inexactos.</li>
        <li><strong>Supresión:</strong> solicitar el borrado de tus datos («derecho al olvido»).</li>
        <li><strong>Limitación:</strong> restringir el tratamiento en determinados supuestos.</li>
        <li><strong>Portabilidad:</strong> recibir tus datos en formato estructurado y legible.</li>
        <li><strong>Oposición:</strong> oponerte al tratamiento basado en interés legítimo.</li>
        <li><strong>No ser objeto de decisiones automatizadas:</strong> si alguna decisión te afecta significativamente.</li>
      </ul>
      <p>
        Para ejercer cualquier derecho escribe a <strong>danicaste2004@gmail.com</strong>. Responderemos en un plazo
        máximo de 30 días. También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).
      </p>

      <h2>8. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas adecuadas: cifrado TLS en tránsito, cifrado en reposo en base de
        datos, control de acceso por roles, autenticación con tokens firmados, y monitorización de errores en tiempo real.
        Ningún sistema es 100% seguro; en caso de brecha te notificaremos conforme a lo exigido por el RGPD.
      </p>

      <h2>9. Cookies</h2>
      <p>
        Usamos cookies técnicas necesarias para el funcionamiento del servicio y cookies analíticas opcionales. Consulta
        nuestra <a href="/cookies" className="underline hover:text-white">Política de cookies</a> para más detalle.
      </p>

      <h2>10. Menores</h2>
      <p>
        NELVYON no está dirigido a menores de 16 años. Si detectamos que hemos recogido datos de un menor sin
        consentimiento parental los eliminaremos de inmediato.
      </p>

      <h2>11. Cambios en esta política</h2>
      <p>
        Notificaremos cambios materiales por correo electrónico con al menos 15 días de antelación. El uso continuado
        del servicio tras ese plazo implica la aceptación de la política actualizada.
      </p>

      <h2>12. Contacto</h2>
      <p>
        Para cualquier consulta sobre privacidad: <strong>danicaste2004@gmail.com</strong>
      </p>
    </LegalPage>
  );
}
