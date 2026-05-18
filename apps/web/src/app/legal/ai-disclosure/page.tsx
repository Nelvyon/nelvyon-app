import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Divulgación de inteligencia artificial",
  description:
    "Transparencia sobre el uso de IA en NELVYON conforme al EU AI Act: naturaleza del sistema, limitaciones y supervisión humana.",
};

const LAST_REVIEWED = "19 de mayo de 2026";

export default function AiDisclosurePage() {
  return (
    <LegalPage title="Divulgación de inteligencia artificial (EU AI Act)" lastUpdated={LAST_REVIEWED}>
      <p>
        <strong>Última revisión:</strong> {LAST_REVIEWED}
      </p>
      <p>
        Esta página cumple con los requisitos de transparencia del Reglamento (UE) 2024/1689 (<em>EU AI Act</em>),
        en particular los artículos 13, 50 y 52, para sistemas de IA de riesgo limitado (
        <em>limited-risk AI systems</em>).
      </p>

      <h2>1. Uso de inteligencia artificial</h2>
      <p>
        NELVYON utiliza sistemas de inteligencia artificial generativa para producir textos, análisis, estrategias y
        recomendaciones de marketing. Los resultados se generan de forma automatizada a partir de las instrucciones y
        datos que introduces en la plataforma.
      </p>

      <h2>2. Limitaciones y exactitud</h2>
      <ul>
        <li>Los outputs son generados por IA y pueden contener errores, omisiones o información desactualizada.</li>
        <li>
          NELVYON no garantiza la exactitud, completitud ni idoneidad de ningún contenido para un fin concreto.
        </li>
        <li>
          Los resultados <strong>no constituyen asesoramiento profesional</strong> legal, financiero, fiscal, médico ni
          de otro tipo regulado.
        </li>
        <li>
          Eres el único responsable de revisar, validar y decidir si utilizas cualquier contenido generado antes de
          publicarlo o tomar decisiones con base en él.
        </li>
      </ul>

      <h2>3. Clasificación de riesgo</h2>
      <p>
        Conforme al EU AI Act, el sistema se considera de <strong>riesgo limitado</strong> (<em>limited risk</em>): está
        sujeto a obligaciones de transparencia hacia el usuario, sin constituir un sistema de alto riesgo en los
        sentidos del Reglamento para los usos previstos de la plataforma.
      </p>

      <h2>4. Proveedor del modelo</h2>
      <p>
        El modelo de lenguaje subyacente es proporcionado por <strong>OpenAI</strong> (familia GPT-4 / GPT-4o u
        equivalentes comercialmente disponibles en el momento de la ejecución). NELVYON integra dicho modelo como
        componente técnico; los términos del proveedor pueden aplicarse adicionalmente.
      </p>

      <h2>5. Supervisión humana</h2>
      <p>
        Dispones de capacidad de supervisión humana en todo momento: puedes rechazar, editar, ignorar o no utilizar
        cualquier output. No se toman decisiones autónomas con efectos legales o financieros vinculantes en tu nombre sin
        tu intervención.
      </p>

      <h2>¿Qué hace la IA en NELVYON?</h2>
      <ul>
        <li>Genera estrategias de marketing, copys publicitarios, análisis de datos y recomendaciones operativas.</li>
        <li>No ejecuta por sí sola contratos, pagos, campañas publicadas ni actos con consecuencias legales directas.</li>
        <li>Cada agente se activa manualmente por el usuario; no hay automatización opaca sin intervención humana.</li>
        <li>Los resultados se entregan como texto o datos estructurados; tú decides si los aplicas en tu negocio.</li>
      </ul>

      <h2>6. Reclamaciones</h2>
      <p>
        Para consultas o reclamaciones relacionadas con el uso de IA en NELVYON, contacta con{" "}
        <a href="mailto:legal@nelvyon.com">legal@nelvyon.com</a>.
      </p>
    </LegalPage>
  );
}
