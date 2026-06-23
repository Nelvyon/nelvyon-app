import type { SaasB2bGrowthPackIntake } from "@/lib/packs/types";
import { SAAS_B2B_GROWTH_PACK_ID } from "@/lib/packs/types";
import {
  buildSeedProvenanceMeta,
  personalizeSeedLanding,
} from "@/lib/template-library/seed-personalizer";

export function buildSaasB2bLandingHtml(intake: SaasB2bGrowthPackIntake): string {
  const result = personalizeSeedLanding({
    pack_id: SAAS_B2B_GROWTH_PACK_ID,
    sector: intake.sector,
    business_name: intake.business_name,
    city: intake.city,
    value_proposition: intake.value_proposition,
    primary_cta: intake.primary_cta,
    contact_email: intake.contact_email,
    icp_title: intake.icp_title,
    sales_motion: intake.sales_motion,
    pricing_model: intake.pricing_model,
    varietyKey: intake.business_name,
  });
  return result.html;
}

export function buildSaasB2bLandingProvenance(intake: SaasB2bGrowthPackIntake): Record<string, unknown> {
  const result = personalizeSeedLanding({
    pack_id: SAAS_B2B_GROWTH_PACK_ID,
    sector: intake.sector,
    business_name: intake.business_name,
    city: intake.city,
    value_proposition: intake.value_proposition,
    primary_cta: intake.primary_cta,
    contact_email: intake.contact_email,
    icp_title: intake.icp_title,
    sales_motion: intake.sales_motion,
    pricing_model: intake.pricing_model,
    varietyKey: intake.business_name,
  });
  return buildSeedProvenanceMeta(result);
}

export function buildSaasB2bBotHtml(intake: SaasB2bGrowthPackIntake): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Demo Bot — ${escapeHtml(intake.business_name)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
    .shell { max-width: 520px; margin: 2rem auto; background: #fff; border-radius: 1rem; box-shadow: 0 10px 30px rgba(15,23,42,.12); overflow: hidden; }
    header { background: #0284c7; color: #fff; padding: 1rem 1.25rem; }
    .body { padding: 1.25rem; }
    form { display: grid; gap: .65rem; margin-top: 1rem; }
    input, select { padding: .7rem; border: 1px solid #cbd5e1; border-radius: .5rem; }
    button { background: #0284c7; color: #fff; border: 0; padding: .8rem; border-radius: .5rem; font-weight: 600; cursor: pointer; }
    .ok { display: none; margin-top: 1rem; padding: .75rem; background: #e0f2fe; color: #075985; border-radius: .5rem; }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <strong>Demo Bot — ${escapeHtml(intake.business_name)}</strong>
      <div style="font-size:.85rem;opacity:.9">Calificación ICP · ${escapeHtml(intake.icp_title)}</div>
    </header>
    <div class="body">
      <p>Califico si encajas con nuestro ICP y te ayudo a <strong>${escapeHtml(intake.primary_cta.toLowerCase())}</strong>.</p>
      <form id="qualify">
        <input required name="name" placeholder="Nombre" />
        <input required type="email" name="email" placeholder="Email corporativo" />
        <input required name="company" placeholder="Empresa" />
        <select name="size"><option>1-50</option><option>51-200</option><option>200+</option></select>
        <button type="submit">${escapeHtml(intake.primary_cta)}</button>
      </form>
      <div class="ok" id="ok">✓ Solicitud registrada. Te contactamos para la demo.</div>
    </div>
  </div>
  <script>
    document.getElementById('qualify').addEventListener('submit', function (e) {
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
