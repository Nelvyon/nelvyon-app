const rows = [
  { feature: "CRM integrado", trad: "Herramienta aparte", price: "€50-150/mes", nelvyon: true },
  { feature: "Email automation", trad: "Mailchimp/ActiveCampaign", price: "€80-200/mes", nelvyon: true },
  { feature: "Gestión de pagos", trad: "Stripe + facturación", price: "€30-80/mes", nelvyon: true },
  { feature: "Funnels y webs", trad: "ClickFunnels/WordPress", price: "€97-297/mes", nelvyon: true },
  { feature: "Analíticas", trad: "Google Analytics + BI", price: "€40-120/mes", nelvyon: true },
  { feature: "Automatizaciones", trad: "Zapier/Make", price: "€50-150/mes", nelvyon: true },
  { feature: "Soporte", trad: "Varios proveedores", price: "Variable", nelvyon: true },
  { feature: "Sin límite contactos", trad: "Límites por plan", price: "Coste extra", nelvyon: true },
];

export function HomeComparison() {
  return (
    <section className="bg-[#f8faff] px-4 py-20 lg:px-6">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-[#07122a] md:text-4xl">Nelvyon vs el resto</h2>
        <div className="mx-auto mt-10 max-w-[960px] overflow-x-auto rounded-[20px] bg-[#07122a] p-6 md:p-10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/60">
                <th className="pb-4 pr-4 font-medium">Funcionalidad</th>
                <th className="pb-4 pr-4 font-medium">Agencias tradicionales</th>
                <th className="pb-4 pr-4 font-medium">Precio aprox.</th>
                <th className="pb-4 font-medium text-[#00d6fe]">NELVYON ✓</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.feature} className="border-b border-white/5">
                  <td className="py-3 pr-4 font-medium text-white">{row.feature}</td>
                  <td className="py-3 pr-4 text-white/50">{row.trad}</td>
                  <td className="py-3 pr-4 text-white/40">{row.price}</td>
                  <td className="py-3 text-[#00d6fe]">
                    <span className="text-green-400">✓</span>{" "}
                    {row.feature === "CRM integrado" && (
                      <span className="text-xs text-green-400">desde €97/mes</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
