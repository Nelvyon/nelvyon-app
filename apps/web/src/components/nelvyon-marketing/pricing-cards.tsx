import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: "97",
    features: ["CRM y Pipeline", "Email marketing", "3 agentes expertos", "Soporte por email"],
    popular: false,
  },
  {
    name: "Growth",
    price: "297",
    features: [
      "Todo lo de Starter",
      "15 agentes expertos",
      "Meta / Google / TikTok",
      "Funnels ilimitados",
    ],
    popular: true,
  },
  {
    name: "Elite",
    price: "797",
    features: [
      "Todo lo de Growth",
      "Agentes ilimitados",
      "White-label completo",
      "Manager dedicado",
    ],
    popular: false,
  },
];

export function NelvyonPricingCards() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {plans.map((plan) => (
        <article
          key={plan.name}
          className={`relative rounded-2xl border bg-white p-6 shadow-sm ${
            plan.popular ? "border-[#1a7fc4] shadow-lg ring-2 ring-[#1a7fc4]/20" : "border-[#e8eef8]"
          }`}
        >
          {plan.popular && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#1a7fc4] px-3 py-1 text-xs font-semibold text-white">
              Más popular
            </span>
          )}
          <h3 className="text-lg font-bold text-[#07122a]">{plan.name}</h3>
          <p className="mt-2">
            <span className="text-4xl font-extrabold text-[#07122a]">{plan.price}€</span>
            <span className="text-[#07122a]/50">/mes</span>
          </p>
          <ul className="mt-6 space-y-2 text-sm text-[#07122a]/75">
            {plan.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-[#1a7fc4]">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/registro"
            className={`mt-8 block rounded-lg py-3 text-center text-sm font-semibold transition ${
              plan.popular
                ? "bg-[#1a7fc4] text-white hover:bg-[#1569a8]"
                : "border border-[#1a7fc4] text-[#1a7fc4] hover:bg-[#f8faff]"
            }`}
          >
            Empieza gratis 14 días
          </Link>
        </article>
      ))}
    </div>
  );
}
