"use client";

import { useState } from "react";

import { NelvyonMarketingShell } from "../marketing-shell";

export function NelvyonContactoPage() {
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <NelvyonMarketingShell>
      <section className="bg-[#f8faff] px-4 py-16 lg:px-6">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl font-bold text-[#07122a]">Contacto</h1>
            <p className="mt-4 text-[#07122a]/70">Cuéntanos tu proyecto. Respondemos en menos de 24 horas.</p>

            <ul className="mt-8 space-y-4 text-sm text-[#07122a]/80">
              <li>
                <strong className="text-[#07122a]">Email:</strong>{" "}
                <a href="mailto:soporte@nelvyon.com" className="text-[#0084fc] hover:underline">
                  soporte@nelvyon.com
                </a>
              </li>
              <li>
                <strong className="text-[#07122a]">Ubicación:</strong> Madrid, España
              </li>
              <li>
                <strong className="text-[#07122a]">Respuesta:</strong> Menos de 24h laborables
              </li>
            </ul>

            <div className="mt-8 rounded-2xl border border-[#e8eef8] bg-white p-6">
              <h2 className="font-semibold text-[#07122a]">Horario de atención</h2>
              <p className="mt-2 text-sm text-[#07122a]/70">Lunes – Viernes: 9:00 – 18:00 (CET)</p>
              <div className="mt-4 h-32 rounded-xl bg-gradient-to-br from-[#07122a] to-[#0084fc] flex items-center justify-center text-white/80 text-sm">
                Madrid, España
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[#e8eef8] bg-white p-8 shadow-sm"
          >
            {sent ? (
              <p className="text-center text-[#0084fc] font-medium">Mensaje enviado. Te contactaremos pronto.</p>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="nombre" className="block text-sm font-medium text-[#07122a]">
                      Nombre
                    </label>
                    <input
                      id="nombre"
                      name="nombre"
                      required
                      className="mt-1 w-full rounded-lg border border-[#e8eef8] px-4 py-2.5 text-sm focus:border-[#0084fc] focus:outline-none focus:ring-1 focus:ring-[#0084fc]"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[#07122a]">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="mt-1 w-full rounded-lg border border-[#e8eef8] px-4 py-2.5 text-sm focus:border-[#0084fc] focus:outline-none focus:ring-1 focus:ring-[#0084fc]"
                    />
                  </div>
                  <div>
                    <label htmlFor="empresa" className="block text-sm font-medium text-[#07122a]">
                      Empresa
                    </label>
                    <input
                      id="empresa"
                      name="empresa"
                      className="mt-1 w-full rounded-lg border border-[#e8eef8] px-4 py-2.5 text-sm focus:border-[#0084fc] focus:outline-none focus:ring-1 focus:ring-[#0084fc]"
                    />
                  </div>
                  <div>
                    <label htmlFor="telefono" className="block text-sm font-medium text-[#07122a]">
                      Teléfono
                    </label>
                    <input
                      id="telefono"
                      name="telefono"
                      type="tel"
                      className="mt-1 w-full rounded-lg border border-[#e8eef8] px-4 py-2.5 text-sm focus:border-[#0084fc] focus:outline-none focus:ring-1 focus:ring-[#0084fc]"
                    />
                  </div>
                  <div>
                    <label htmlFor="mensaje" className="block text-sm font-medium text-[#07122a]">
                      Mensaje
                    </label>
                    <textarea
                      id="mensaje"
                      name="mensaje"
                      required
                      rows={4}
                      className="mt-1 w-full rounded-lg border border-[#e8eef8] px-4 py-2.5 text-sm focus:border-[#0084fc] focus:outline-none focus:ring-1 focus:ring-[#0084fc]"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="mt-6 w-full rounded-lg bg-[#0084fc] py-3 text-sm font-semibold text-white hover:bg-[#1569a8]"
                >
                  Enviar mensaje
                </button>
              </>
            )}
          </form>
        </div>
      </section>
    </NelvyonMarketingShell>
  );
}
