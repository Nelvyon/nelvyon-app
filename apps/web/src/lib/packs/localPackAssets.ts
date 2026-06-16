import type { LocalGrowthPackIntake } from "@/lib/packs/types";

export function buildLocalLandingHtml(intake: LocalGrowthPackIntake): string {
  const cta = intake.primary_cta;
  const city = intake.city;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(intake.business_name)} — ${escapeHtml(city)}</title>
  <meta name="description" content="${escapeHtml(intake.value_proposition)}" />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; }
    .wrap { max-width: 960px; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
    .badge { display: inline-block; background: #0f766e; color: #fff; padding: .35rem .75rem; border-radius: 999px; font-size: .8rem; }
    h1 { font-size: clamp(2rem, 5vw, 3rem); margin: 1rem 0 .5rem; line-height: 1.1; }
    p.lead { font-size: 1.15rem; color: #cbd5e1; max-width: 52ch; }
    .cta { display: inline-block; margin-top: 1.5rem; background: #f59e0b; color: #111; font-weight: 700; padding: .9rem 1.4rem; border-radius: .75rem; text-decoration: none; }
    .grid { display: grid; gap: 1rem; margin-top: 2.5rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 1rem; padding: 1.25rem; }
    .map { margin-top: 2rem; border-radius: 1rem; overflow: hidden; border: 1px solid #334155; }
    iframe { width: 100%; height: 280px; border: 0; }
    form { margin-top: 1.5rem; display: grid; gap: .75rem; max-width: 420px; }
    input, textarea { padding: .75rem; border-radius: .5rem; border: 1px solid #475569; background: #0f172a; color: #fff; }
    button { background: #0f766e; color: #fff; border: 0; padding: .85rem; border-radius: .5rem; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <div class="wrap">
    <span class="badge">${escapeHtml(intake.sector)} · ${escapeHtml(city)}</span>
    <h1>${escapeHtml(intake.business_name)}</h1>
    <p class="lead">${escapeHtml(intake.value_proposition)}</p>
    <a class="cta" href="#reserva">${escapeHtml(cta)}</a>
    <div class="grid">
      <div class="card"><strong>Horario</strong><br/>Lun–Sáb 9:00–20:00</div>
      <div class="card"><strong>Ubicación</strong><br/>${escapeHtml(city)}, España</div>
      <div class="card"><strong>Contacto</strong><br/>${escapeHtml(intake.contact_email ?? "info@" + slugify(intake.business_name) + ".es")}</div>
    </div>
    <div class="map">
      <iframe title="Mapa" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
        src="https://www.google.com/maps?q=${encodeURIComponent(city + " España")}&output=embed"></iframe>
    </div>
    <form id="reserva">
      <h2 id="reserva">${escapeHtml(cta)}</h2>
      <input required name="name" placeholder="Tu nombre" />
      <input required type="email" name="email" placeholder="Email" />
      <input required type="tel" name="phone" placeholder="Teléfono" />
      <textarea name="message" rows="3" placeholder="¿En qué podemos ayudarte?"></textarea>
      <button type="submit">Enviar solicitud</button>
    </form>
  </div>
  <script>
    document.getElementById('reserva').addEventListener('submit', function (e) {
      e.preventDefault();
      alert('¡Gracias! Te contactaremos en breve para confirmar tu cita.');
      e.target.reset();
    });
  </script>
</body>
</html>`;
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

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
