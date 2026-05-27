const testimonials = [
  {
    name: "María García",
    role: "Directora",
    company: "Agencia MG",
    text: "Pasamos de gestionar 3 herramientas distintas a tenerlo todo en NELVYON. Ahorramos 40h al mes.",
  },
  {
    name: "Carlos Ruiz",
    role: "CEO",
    company: "Digital CR",
    text: "El CRM y las automatizaciones son increíbles. Nuestras ventas subieron un 35% en 2 meses.",
  },
  {
    name: "Ana López",
    role: "Fundadora",
    company: "Marca AL",
    text: "La mejor inversión que hemos hecho. El soporte es excelente y la plataforma no para de mejorar.",
  },
];

function Stars() {
  return (
    <span className="text-amber-400" aria-label="5 estrellas">
      ★★★★★
    </span>
  );
}

export function HomeTestimonials() {
  return (
    <section className="bg-[#f8faff] px-4 py-20 lg:px-6">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-[#07122a] md:text-4xl">Lo que dicen nuestros clientes</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <article key={t.name} className="rounded-2xl border border-[#e8eef8] bg-white p-6 shadow-sm">
              <Stars />
              <p className="mt-4 text-sm leading-relaxed text-[#07122a]/80">&ldquo;{t.text}&rdquo;</p>
              <div className="mt-6 border-t border-[#e8eef8] pt-4">
                <p className="font-semibold text-[#07122a]">{t.name}</p>
                <p className="text-xs text-[#07122a]/60">
                  {t.role}, {t.company}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
