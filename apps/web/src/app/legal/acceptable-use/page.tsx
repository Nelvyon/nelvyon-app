import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Política de uso aceptable",
  description:
    "Usos permitidos y prohibidos de la plataforma NELVYON. Consecuencias por abuso y canal de reporte.",
};

const EFFECTIVE_DATE = "19 de mayo de 2026";

export default function AcceptableUsePage() {
  return (
    <LegalPage title="Política de uso aceptable (AUP)" lastUpdated={EFFECTIVE_DATE}>
      <p>
        <strong>Fecha de entrada en vigor:</strong> {EFFECTIVE_DATE}
      </p>
      <p>
        Esta política complementa los términos de servicio de NELVYON. El uso de la plataforma implica su aceptación
        íntegra.
      </p>

      <h2>1. Usos prohibidos</h2>
      <p>Queda expresamente prohibido utilizar NELVYON, sus agentes o APIs para:</p>
      <ul>
        <li>Envío de spam, phishing, malware o cualquier contenido ilegal o fraudulento.</li>
        <li>Scraping masivo o extracción automatizada de datos de terceros sin autorización legal.</li>
        <li>Eludir, desactivar o interferir con sistemas de seguridad, autenticación o límites técnicos.</li>
        <li>Reventa, sublicencia o acceso compartido no autorizado sin acuerdo escrito con NELVYON.</li>
        <li>Generar o distribuir contenido que infrinja derechos de autor, marcas, privacidad u otras normas.</li>
        <li>Acceso automatizado que exceda los límites de tu plan (rate limits, cuotas de API o uso justo).</li>
        <li>Cualquier actividad que vulnere la legislación aplicable en tu jurisdicción o en la del usuario final.</li>
      </ul>

      <h2>2. Responsabilidad del usuario</h2>
      <p>
        El usuario es el <strong>único responsable</strong> del contenido, prompts, datos de entrada y salidas
        generadas mediante los agentes de IA. NELVYON no revisa de forma previa cada resultado y no asume responsabilidad
        por el uso que el cliente haga de dichos materiales.
      </p>

      <h2>3. Consecuencias</h2>
      <p>
        El incumplimiento de esta política puede conllevar la <strong>suspensión inmediata</strong> de la cuenta, la
        terminación del acceso y la denegación de reembolsos, sin perjuicio de otras acciones legales que correspondan.
      </p>

      <h2>4. Terminación de cuentas</h2>
      <p>
        NELVYON se reserva el derecho de suspender o terminar cuentas, con o sin previo aviso, cuando existan indicios
        razonables de abuso, riesgo para la infraestructura, otros usuarios o terceros.
      </p>

      <h2>5. Reporte de abuso</h2>
      <p>
        Para reportar usos indebidos de la plataforma o de dominios asociados a NELVYON, escribe a{" "}
        <a href="mailto:abuse@nelvyon.com">abuse@nelvyon.com</a> con la mayor información posible (URLs, capturas,
        timestamps, identificadores de cuenta si los conoces).
      </p>
    </LegalPage>
  );
}
