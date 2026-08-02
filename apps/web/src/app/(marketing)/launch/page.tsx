"use client";

import Link from "next/link";
import { useState } from "react";

import { AiorSection, AiorTitle } from "@/features/public-web/components/AiorBlocks";
import { AiorCtaBand, AiorPageHero } from "@/features/public-web/components/AiorPageHero";

/** Página de interés / waitlist — sin countdown de lanzamiento inventado. */
export default function LaunchPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email) return;
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("No se pudo registrar el email");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  return (
    <>
      <AiorPageHero
        eyebrow="Novedades"
        title="Manténgase al día con NELVYON"
        description="Deje su email para novedades de producto y activación. El SaaS y la agencia ya están documentados en el sitio público."
        primaryCta={{ label: "Explorar el SaaS", href: "/producto" }}
        secondaryCta={{ label: "Ver precios", href: "/precios" }}
      />

      <AiorSection soft>
        <AiorTitle eyebrow="Lista" title="Registro de interés" center />
        <div style={{ maxWidth: 480, margin: "0 auto", padding: 28, borderRadius: 16, border: "1px solid #E0E0E0", background: "#fff" }}>
          {submitted ? (
            <p className="mb-0 text-center">Gracias. Hemos registrado su interés.</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <label htmlFor="launch-email" className="d-block mb-2">
                Email
              </label>
              <input
                id="launch-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control mb-3"
                placeholder="nombre@empresa.com"
              />
              {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
              <button type="submit" className="th-btn2 btn-gradient2 w-100">
                Quiero novedades
              </button>
            </form>
          )}
          <p className="mt-3 mb-0 text-center" style={{ fontSize: 13, color: "#6b7c93" }}>
            También puede{" "}
            <Link href="/contacto" style={{ color: "#0084FF" }}>
              solicitar una demo
            </Link>
            .
          </p>
        </div>
      </AiorSection>

      <AiorCtaBand
        title="¿Prefiere hablar ahora?"
        body="Demo del producto real o presupuesto de agencia."
        primaryCta={{ label: "Contactar", href: "/contacto" }}
        secondaryCta={{ label: "FAQ", href: "/faq" }}
      />
    </>
  );
}
