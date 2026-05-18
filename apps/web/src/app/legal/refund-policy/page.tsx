import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Política de reembolso",
  description:
    "Condiciones de reembolso de NELVYON: periodo de prueba de 7 días, disponibilidad del servicio y proceso vía Paddle.",
};

const EFFECTIVE_DATE = "19 de mayo de 2026";

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Política de reembolso" lastUpdated={EFFECTIVE_DATE}>
      <p>
        <strong>Fecha de entrada en vigor:</strong> {EFFECTIVE_DATE}
      </p>

      <h2>1. Naturaleza del servicio</h2>
      <p>
        NELVYON es un servicio de software SaaS de marketing con inteligencia artificial. La entrega es digital e
        inmediata tras la activación del plan contratado. No se envían productos físicos.
      </p>

      <h2>2. Periodo de prueba</h2>
      <p>
        Dispones de un periodo de prueba de <strong>7 días naturales</strong> desde la activación del plan de pago. Durante
        este periodo puedes evaluar el servicio conforme a los límites de tu plan.
      </p>

      <h2>3. Derecho a reembolso</h2>
      <p>
        Solo procederá el reembolso si el servicio no estuvo disponible de forma continuada durante más de{" "}
        <strong>24 horas</strong> dentro de esos 7 días de prueba, por causas imputables a NELVYON (no por fallos de red
        del usuario, proveedores externos fuera de nuestro control o fuerza mayor).
      </p>

      <h2>4. Casos sin reembolso</h2>
      <p>No se concederá reembolso en los siguientes supuestos, entre otros:</p>
      <ul>
        <li>«No era lo que esperaba» o cambio de opinión tras el uso del producto.</li>
        <li>Falta de uso, abandono de la cuenta o no haber configurado la plataforma.</li>
        <li>Incumplimiento de la política de uso aceptable o de los términos de servicio.</li>
        <li>Problemas derivados de integraciones o herramientas de terceros no gestionadas por NELVYON.</li>
      </ul>

      <h2>5. Proceso de solicitud</h2>
      <p>
        Para solicitar un reembolso dentro del plazo aplicable, envía un correo a{" "}
        <a href="mailto:legal@nelvyon.com">legal@nelvyon.com</a> indicando:
      </p>
      <ul>
        <li>Email de la cuenta NELVYON.</li>
        <li>Número de pedido o transacción de Paddle.</li>
        <li>Fechas y descripción del periodo de indisponibilidad reclamado.</li>
      </ul>

      <h2>6. Pagos y plazos</h2>
      <p>
        Los pagos los procesa <strong>Paddle</strong> como Merchant of Record. Los reembolsos aprobados se tramitan a
        través de Paddle y suelen reflejarse en el método de pago original en un plazo de <strong>5 a 10 días
        hábiles</strong>, según la entidad emisora.
      </p>

      <h2>7. Cancelación de suscripción</h2>
      <p>
        Puedes cancelar tu suscripción en cualquier momento. La cancelación surte efecto al final del periodo de
        facturación en curso. No se realizan reembolsos prorrateados por el tiempo no consumido del ciclo ya pagado,
        salvo lo expresamente previsto en esta política.
      </p>

      <section lang="en" className="mt-12 border-t border-zinc-800 pt-10">
        <h2>Refund Policy (English summary)</h2>
        <p>
          <strong>Effective date:</strong> May 19, 2026. NELVYON is a SaaS product with immediate digital delivery. A
          7-day trial applies from plan activation. Refunds are only available if the service was unavailable for more
          than 24 consecutive hours during the trial due to NELVYON&apos;s fault. No refunds for change of mind, lack of
          use, or policy violations. Contact <a href="mailto:legal@nelvyon.com">legal@nelvyon.com</a> with your Paddle
          order ID. Paddle processes approved refunds within 5–10 business days. Cancellations take effect at the end of
          the current billing period without proration.
        </p>
      </section>
    </LegalPage>
  );
}
