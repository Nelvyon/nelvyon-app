"use client";

import { LegalDocLayout } from "./LegalDocLayout";

export function NelvyonTerminosPage() {
  return (
    <LegalDocLayout title="Términos y Condiciones">
      <p className="lead text-zinc-500">Última actualización: mayo 2026</p>

      <h2>1. Objeto del contrato</h2>
      <p>
        Estos términos regulan el acceso y uso del sitio web nelvyon.com, los servicios de agencia de marketing
        digital y la plataforma SaaS NELVYON.
      </p>

      <h2>2. Descripción del servicio</h2>
      <p>
        NELVYON ofrece herramientas y servicios de marketing digital: gestión de campañas, automatización,
        CRM, comunicación y creación de contenido, según el plan o encargo contratado.
      </p>

      <h2>3. Precios y forma de pago</h2>
      <p>
        Los precios vigentes se publican en la web o en la propuesta comercial aceptada. Los pagos recurrentes
        del software se procesan mediante Stripe u otros medios indicados en el checkout.
      </p>

      <h2>4. Política de cancelación</h2>
      <p>
        Sin permanencia: puedes cancelar tu suscripción o servicio cuando lo desees, según las condiciones del
        plan contratado. La cancelación surte efecto al final del periodo de facturación en curso, salvo
        pacto distinto por escrito.
      </p>

      <h2>5. Limitación de responsabilidad</h2>
      <p>
        Los resultados de marketing (ventas, leads, posicionamiento, etc.) dependen de múltiples factores
        externos. NELVYON no garantiza resultados concretos ni porcentajes de mejora. El servicio se presta con
        diligencia profesional en la medida permitida por la ley aplicable.
      </p>

      <h2>6. Propiedad intelectual</h2>
      <p>
        NELVYON conserva los derechos sobre la plataforma, marca y software. El contenido que aportes o
        generes sigue siendo tuyo; nos concedes una licencia limitada para alojarlo y procesarlo con fines de
        prestación del servicio.
      </p>

      <h2>7. Legislación aplicable y jurisdicción</h2>
      <p>
        Estos términos se rigen por la legislación española. Para cualquier controversia, las partes se
        someten a los Juzgados y Tribunales de Madrid, salvo norma imperativa en contrario.
      </p>

      <h2>8. Contacto</h2>
      <p>
        <a href="mailto:hola@nelvyon.com">hola@nelvyon.com</a>
      </p>
    </LegalDocLayout>
  );
}
