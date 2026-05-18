"use client";

import { useEffect, useState } from "react";

const LAUNCH_DATE = new Date("2026-05-19T15:00:00+02:00");

function getTimeLeft() {
  const diff = LAUNCH_DATE.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

export default function LaunchPage() {
  const [time, setTime] = useState(getTimeLeft);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email }),
    });
    setSubmitted(true);
  }

  const units = [
    { label: "Días", value: time.days },
    { label: "Horas", value: time.hours },
    { label: "Minutos", value: time.minutes },
    { label: "Segundos", value: time.seconds },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#080808] px-4 text-center text-zinc-100">
      <div className="mb-6">
        <span className="rounded-full border border-indigo-800 bg-indigo-950 px-3 py-1 text-xs font-semibold text-indigo-300">
          🚀 Lanzamiento oficial
        </span>
      </div>
      <h1 className="mb-4 text-4xl font-black md:text-6xl">
        NELVYON llega el <span className="text-indigo-400">19 de mayo</span>
      </h1>
      <p className="mb-12 max-w-xl text-lg text-zinc-400">
        El equipo de marketing IA que trabaja por ti. 80+ servicios automatizados. Sin equipo. Sin agencia.
      </p>
      <div className="mb-12 flex gap-4 md:gap-8">
        {units.map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 md:h-24 md:w-24">
              <span className="text-2xl font-black tabular-nums md:text-4xl">
                {String(value).padStart(2, "0")}
              </span>
            </div>
            <span className="mt-2 text-xs text-zinc-500">{label}</span>
          </div>
        ))}
      </div>
      {submitted ? (
        <div className="font-semibold text-emerald-400">✓ Estás en la lista. Te avisamos el 19 mayo.</div>
      ) : (
        <form onSubmit={handleSubmit} className="flex w-full max-w-md gap-2">
          <input
            type="email"
            required
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            className="whitespace-nowrap rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Avísame →
          </button>
        </form>
      )}
      <p className="mt-4 text-xs text-zinc-600">Los primeros 100 clientes tienen precio bloqueado para siempre.</p>
    </main>
  );
}
