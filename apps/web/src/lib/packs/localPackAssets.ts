import type { LocalGrowthPackIntake } from "@/lib/packs/types";
import {
  buildSeedProvenanceMeta,
  personalizeSeedLanding,
} from "@/lib/template-library/seed-personalizer";
import { LOCAL_GROWTH_PACK_ID } from "@/lib/packs/types";

export function buildLocalLandingHtml(intake: LocalGrowthPackIntake): string {
  const result = personalizeSeedLanding({
    pack_id: LOCAL_GROWTH_PACK_ID,
    sector: intake.sector,
    business_name: intake.business_name,
    city: intake.city,
    value_proposition: intake.value_proposition,
    primary_cta: intake.primary_cta,
    contact_email: intake.contact_email,
    varietyKey: intake.business_name,
  });
  return result.html;
}

export function buildLocalLandingProvenance(intake: LocalGrowthPackIntake): Record<string, unknown> {
  const result = personalizeSeedLanding({
    pack_id: LOCAL_GROWTH_PACK_ID,
    sector: intake.sector,
    business_name: intake.business_name,
    city: intake.city,
    value_proposition: intake.value_proposition,
    primary_cta: intake.primary_cta,
    contact_email: intake.contact_email,
    varietyKey: intake.business_name,
  });
  return buildSeedProvenanceMeta(result);
}

export function buildLocalBotHtml(intake: LocalGrowthPackIntake): string {
  const faqs = [
    ["¿Cuál es el horario?", "Atendemos de lunes a sábado. Reserva online cuando quieras."],
    ["¿Cómo reservo?", `Pulsa "${intake.primary_cta}" o completa el formulario de cita.`],
    ["¿Dónde estáis?", `En ${intake.city}. Te enviamos la dirección exacta al confirmar.`],
  ];
  const faqHtml = faqs
    .map(
      ([q, a]) =>
        `<details class="faq"><summary>${escapeHtml(q)}</summary><p>${escapeHtml(a)}</p></details>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Chatbot citas — ${escapeHtml(intake.business_name)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; background: #f1f5f9; color: #0f172a; }
    .shell { max-width: 520px; margin: 2rem auto; background: #fff; border-radius: 1rem; box-shadow: 0 10px 30px rgba(15,23,42,.12); overflow: hidden; }
    header { background: #0f766e; color: #fff; padding: 1rem 1.25rem; }
    .body { padding: 1.25rem; }
    .faq { border: 1px solid #e2e8f0; border-radius: .75rem; padding: .75rem 1rem; margin-bottom: .75rem; }
    .faq summary { cursor: pointer; font-weight: 600; }
    form { display: grid; gap: .65rem; margin-top: 1rem; }
    input, select { padding: .7rem; border: 1px solid #cbd5e1; border-radius: .5rem; }
    button { background: #0f766e; color: #fff; border: 0; padding: .8rem; border-radius: .5rem; font-weight: 600; cursor: pointer; }
    .ok { display: none; margin-top: 1rem; padding: .75rem; background: #ecfdf5; color: #065f46; border-radius: .5rem; }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <strong>Asistente ${escapeHtml(intake.business_name)}</strong>
      <div style="font-size:.85rem;opacity:.9">Reserva citas 24/7 · ${escapeHtml(intake.city)}</div>
    </header>
    <div class="body">
      <p>Hola, soy tu asistente virtual. Puedo ayudarte a <strong>${escapeHtml(intake.primary_cta.toLowerCase())}</strong>.</p>
      ${faqHtml}
      <form id="booking">
        <strong>Reservar cita</strong>
        <input required name="name" placeholder="Nombre" />
        <input required type="email" name="email" placeholder="Email" />
        <input required type="date" name="date" />
        <select name="slot"><option>Mañana</option><option>Tarde</option></select>
        <button type="submit">${escapeHtml(intake.primary_cta)}</button>
      </form>
      <div class="ok" id="ok">✓ Cita solicitada. Te confirmamos por email.</div>
    </div>
  </div>
  <script>
    document.getElementById('booking').addEventListener('submit', function (e) {
      e.preventDefault();
      document.getElementById('ok').style.display = 'block';
      e.target.reset();
    });
  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
