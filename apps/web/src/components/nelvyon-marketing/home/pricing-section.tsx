import { NelvyonPricingCards } from "../pricing-cards";

export function HomePricingSection() {
  return (
    <section className="bg-white px-4 py-20 lg:px-6">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-[#07122a] md:text-4xl">Precios claros. Sin sorpresas.</h2>
        <div className="mt-12">
          <NelvyonPricingCards />
        </div>
      </div>
    </section>
  );
}
