import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Términos de servicio | NELVYON",
  description:
    "Términos y condiciones de uso de NELVYON. Lee las condiciones antes de contratar nuestros planes SaaS.",
};

const EFFECTIVE_DATE = "22 de junio de 2026";

export default function TermsPage() {
  return (
    <LegalPage title="Términos de servicio" lastUpdated={EFFECTIVE_DATE}>
      <p>
        <strong>Fecha de entrada en vigor:</strong> {EFFECTIVE_DATE}
      </p>
      <p>
        Estos Términos de Servicio («Términos») regulan el acceso y uso de la plataforma SaaS NELVYON operada por
        Daniel Castellano («NELVYON», «nosotros»). Al registrarte o usar el servicio aceptas estos Términos en su
        totalidad.
      </p>

      <h2>1. Descripción del servicio</h2>
      <p>
        NELVYON es una plataforma de marketing digital con inteligencia artificial que incluye CRM, campañas de email,
        workflows de automatización, SEO, gestión de redes sociales, publicidad, analítica y agentes IA por sector.
        El servicio se presta íntegramente online bajo modelo de suscripción.
      </p>

      <h2>2. Registro y cuenta</h2>
      <ul>
        <li>Debes tener al menos 18 años o la mayoría de edad legal en tu jurisdicción.</li>
        <li>La información de registro debe ser verídica y estar actualizada.</li>
        <li>Eres responsable de mantener la confidencialidad de tus credenciales.</li>
        <li>Notifica inmediatamente cualquier uso no autorizado de tu cuenta a danicaste2004@gmail.com.</li>
        <li>Una cuenta puede tener múltiples usuarios según los límites de tu plan.</li>
      </ul>

      <h2>3. Planes y precios</h2>
      <ul>
        <li><strong>Starter:</strong> funcionalidades básicas con límites de contactos, campañas y usuarios.</li>
        <li><strong>Pro:</strong> límites ampliados y funcionalidades avanzadas.</li>
        <li><strong>Agency:</strong> sin límites, acceso completo a todos los módulos.</li>
        <li><strong>Agency Partner:</strong> precio mayorista para agencias que revenden NELVYON.</li>
      </ul>
      <p>
        Los precios vigentes están publicados en <a href="/precios" className="underline hover:text-white">/precios</a>.
        Nos reservamos el derecho a modificar precios con 30 días de preaviso. Los cambios no afectan al ciclo de
        facturación en curso.
      </p>

      <h2>4. Facturación y pago</h2>
      <ul>
        <li>El pago se procesa mediante Stripe. No almacenamos datos de tarjeta.</li>
        <li>La suscripción se renueva automáticamente al inicio de cada periodo salvo cancelación previa.</li>
        <li>En caso de impago se suspenderá el acceso tras 7 días de gracia.</li>
        <li>Los precios incluyen el IVA aplicable según tu país de residencia.</li>
      </ul>

      <h2>5. Política de reembolso</h2>
      <p>
        Consulta nuestra <a href="/legal/refund-policy" className="underline hover:text-white">Política de reembolso</a>{" "}
        para los detalles completos. En resumen: 7 días de prueba con reembolso si el servicio no estuvo disponible
        más de 24 horas consecutivas por causas imputables a NELVYON.
      </p>

      <h2>6. Uso aceptable</h2>
      <p>
        Queda prohibido usar NELVYON para:
      </p>
      <ul>
        <li>Enviar spam, mensajes no solicitados o contenido fraudulento.</li>
        <li>Actividades ilegales, incluyendo phishing, malware o violación de derechos de propiedad intelectual.</li>
        <li>Recoger datos de terceros sin su consentimiento.</li>
        <li>Sobrecargar intencionadamente la infraestructura del servicio.</li>
        <li>Revender o sublicenciar el acceso sin autorización expresa (salvo plan Agency Partner).</li>
        <li>Usar los agentes IA para generar contenido engañoso, difamatorio o ilegal.</li>
      </ul>
      <p>
        El incumplimiento puede resultar en la suspensión inmediata de la cuenta sin derecho a reembolso. Consulta la
        <a href="/legal/acceptable-use" className="underline hover:text-white"> Política de uso aceptable</a> completa.
      </p>

      <h2>7. Propiedad intelectual</h2>
      <ul>
        <li>NELVYON retiene todos los derechos sobre la plataforma, código, diseño y marca.</li>
        <li>Tú eres propietario de los datos y contenidos que introduces en tu workspace.</li>
        <li>Nos concedes una licencia limitada para procesar tus datos con el fin de prestar el servicio.</li>
        <li>No usamos tus datos para entrenar modelos de IA ni los compartimos con terceros salvo subprocesadores.</li>
      </ul>

      <h2>8. Inteligencia artificial</h2>
      <p>
        NELVYON utiliza modelos de IA (OpenAI y otros) para generar contenido, análisis y recomendaciones. Los outputs
        de IA son orientativos. Eres responsable de revisar y aprobar cualquier contenido generado antes de publicarlo.
        Consulta nuestra{" "}
        <a href="/legal/ai-disclosure" className="underline hover:text-white">Divulgación de IA</a> para más detalle.
      </p>

      <h2>9. Disponibilidad del servicio (SLA)</h2>
      <p>
        Nos comprometemos a una disponibilidad objetivo del 99,5% mensual. Excluidas de este cómputo: ventanas de
        mantenimiento programado (avisadas con 24h), incidencias de proveedores externos (Stripe, AWS, Supabase) y
        causas de fuerza mayor.
      </p>

      <h2>10. Limitación de responsabilidad</h2>
      <p>
        En la máxima medida permitida por la ley aplicable, NELVYON no será responsable de daños indirectos, lucro
        cesante, pérdida de datos o interrupción de negocio. La responsabilidad máxima total no superará el importe
        pagado en los últimos 3 meses de suscripción.
      </p>

      <h2>11. Modificación y resolución</h2>
      <ul>
        <li>Puedes cancelar tu suscripción en cualquier momento desde el panel de facturación. El acceso continuará
          hasta el fin del periodo pagado.</li>
        <li>Podemos suspender o resolver tu cuenta con preaviso de 30 días salvo incumplimiento grave, en cuyo caso
          la resolución es inmediata.</li>
        <li>Nos reservamos el derecho a modificar estos Términos con 30 días de preaviso por email.</li>
      </ul>

      <h2>12. Ley aplicable y jurisdicción</h2>
      <p>
        Estos Términos se rigen por la legislación española. Para cualquier controversia, las partes se someten a los
        juzgados y tribunales de España, sin perjuicio de los derechos irrenunciables del consumidor en su país de
        residencia.
      </p>

      <h2>13. Contacto</h2>
      <p>
        Para cualquier consulta sobre estos Términos: <strong>danicaste2004@gmail.com</strong>
      </p>
    </LegalPage>
  );
}
