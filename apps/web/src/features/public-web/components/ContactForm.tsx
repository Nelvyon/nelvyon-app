"use client";

import { useState, type FormEvent } from "react";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      company: String(fd.get("company") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      plan: String(fd.get("plan") || "").trim(),
      message: String(fd.get("message") || "").trim(),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "No se pudo enviar el mensaje");
      }
      setStatus("ok");
      e.currentTarget.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  return (
    <form onSubmit={onSubmit} className="nv-public-panel space-y-4 p-6 md:p-8" noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block text-[var(--nv-muted)]">Nombre *</span>
          <input
            name="name"
            required
            autoComplete="name"
            className="w-full rounded-xl border border-[var(--nv-border)] bg-[#05070D] px-4 py-3 text-[var(--nv-fg-strong)] outline-none focus:border-[var(--nv-accent)]"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-[var(--nv-muted)]">Email *</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-xl border border-[var(--nv-border)] bg-[#05070D] px-4 py-3 text-[var(--nv-fg-strong)] outline-none focus:border-[var(--nv-accent)]"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-[var(--nv-muted)]">Empresa</span>
          <input
            name="company"
            autoComplete="organization"
            className="w-full rounded-xl border border-[var(--nv-border)] bg-[#05070D] px-4 py-3 text-[var(--nv-fg-strong)] outline-none focus:border-[var(--nv-accent)]"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-[var(--nv-muted)]">Teléfono</span>
          <input
            name="phone"
            autoComplete="tel"
            className="w-full rounded-xl border border-[var(--nv-border)] bg-[#05070D] px-4 py-3 text-[var(--nv-fg-strong)] outline-none focus:border-[var(--nv-accent)]"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1.5 block text-[var(--nv-muted)]">Interés</span>
        <select
          name="plan"
          className="w-full rounded-xl border border-[var(--nv-border)] bg-[#05070D] px-4 py-3 text-[var(--nv-fg-strong)] outline-none focus:border-[var(--nv-accent)]"
          defaultValue=""
        >
          <option value="">Seleccione una opción</option>
          <option value="demo">Demo del SaaS</option>
          <option value="starter">Plan Starter</option>
          <option value="growth">Plan Growth</option>
          <option value="elite">Plan Elite / Enterprise</option>
          <option value="agencia">Servicios de agencia / packs</option>
          <option value="otro">Otro</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-[var(--nv-muted)]">Mensaje *</span>
        <textarea
          name="message"
          required
          rows={5}
          className="w-full rounded-xl border border-[var(--nv-border)] bg-[#05070D] px-4 py-3 text-[var(--nv-fg-strong)] outline-none focus:border-[var(--nv-accent)]"
          placeholder="Cuéntenos su operación, stack y objetivo prioritario."
        />
      </label>
      <button
        type="submit"
        disabled={status === "loading"}
        className="nv-public-btn nv-public-btn-primary w-full disabled:opacity-60"
      >
        {status === "loading" ? "Enviando…" : "Enviar mensaje"}
      </button>
      {status === "ok" ? (
        <p className="text-sm text-[var(--nv-success)]" role="status">
          Mensaje recibido. Le responderemos lo antes posible.
        </p>
      ) : null}
      {status === "error" && error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
