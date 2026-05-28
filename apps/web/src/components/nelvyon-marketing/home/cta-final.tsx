import Link from "next/link";

export function HomeCtaFinal() {
  return (
    <section
      className="px-4 py-20 text-center lg:px-6"
      style={{ background: "linear-gradient(135deg, #07122a 0%, #0084fc 50%, #00d6fe 100%)" }}
    >
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">¿Listo para escalar tu agencia?</h2>
        <p className="mt-4 text-lg text-white/70">Únete a más de 132 agencias que ya automatizan con NELVYON</p>
        <Link
          href="/registro"
          className="mt-8 inline-block rounded-xl bg-white px-8 py-4 text-base font-bold text-[#07122a] transition hover:bg-white/90"
        >
          Empieza gratis 14 días →
        </Link>
      </div>
    </section>
  );
}
