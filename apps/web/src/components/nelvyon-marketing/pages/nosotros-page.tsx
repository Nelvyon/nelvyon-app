import { NelvyonMarketingShell } from "../marketing-shell";

export function NelvyonNosotrosPage() {
  return (
    <NelvyonMarketingShell>
      <section className="bg-[#07122a] px-4 py-20 text-center lg:px-6">
        <h1 className="text-4xl font-bold text-white md:text-5xl">Sobre NELVYON</h1>
        <p className="mx-auto mt-4 max-w-2xl text-[#a8dff5] italic">
          Donde nace tu imperio, crece tu marca y se impone tu legado
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 lg:px-6">
        <div className="space-y-12">
          <div>
            <h2 className="text-2xl font-bold text-[#07122a]">Misión</h2>
            <p className="mt-3 text-[#07122a]/75 leading-relaxed">
              Automatizar el 100% de los procesos de marketing para que las agencias escalen sin límite.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#07122a]">Visión</h2>
            <p className="mt-3 text-[#07122a]/75 leading-relaxed">
              Ser la plataforma líder en Europa para agencias de marketing digital en 2027.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#07122a]">Valores</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                "Automatización real",
                "Calidad sin compromiso",
                "Resultados medibles",
                "Soporte humano",
              ].map((v) => (
                <li
                  key={v}
                  className="rounded-xl border border-[#e8eef8] bg-[#f8faff] px-4 py-3 text-sm font-medium text-[#07122a]"
                >
                  {v}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-[#f8faff] px-4 py-16 lg:px-6">
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#e8eef8] bg-white p-6 text-center">
            <p className="text-3xl font-bold text-[#1a7fc4]">2024</p>
            <p className="mt-1 text-sm text-[#07122a]/70">Fundada</p>
          </div>
          <div className="rounded-2xl border border-[#e8eef8] bg-white p-6 text-center">
            <p className="text-3xl font-bold text-[#1a7fc4]">Madrid</p>
            <p className="mt-1 text-sm text-[#07122a]/70">España</p>
          </div>
          <div className="rounded-2xl border border-[#e8eef8] bg-white p-6 text-center">
            <p className="text-3xl font-bold text-[#1a7fc4]">132+</p>
            <p className="mt-1 text-sm text-[#07122a]/70">Clientes</p>
          </div>
          <div className="rounded-2xl border border-[#e8eef8] bg-white p-6 text-center">
            <p className="text-3xl font-bold text-[#1a7fc4]">25</p>
            <p className="mt-1 text-sm text-[#07122a]/70">Integraciones</p>
          </div>
        </div>
      </section>
    </NelvyonMarketingShell>
  );
}
