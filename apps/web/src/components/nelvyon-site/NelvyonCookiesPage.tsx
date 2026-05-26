"use client";

import Link from "next/link";

import { LegalDocLayout } from "./LegalDocLayout";

export function NelvyonCookiesPage() {
  return (
    <LegalDocLayout title="Política de Cookies">
      <p className="lead text-zinc-500">Última actualización: mayo 2026</p>

      <h2>1. ¿Qué son las cookies?</h2>
      <p>
        Las cookies son pequeños archivos que se almacenan en tu dispositivo al visitar una web. También
        podemos usar tecnologías similares (localStorage) para recordar preferencias, como el consentimiento
        de cookies.
      </p>

      <h2>2. Cookies que utilizamos</h2>
      <h3>Técnicas (necesarias)</h3>
      <p>
        Imprescindibles para la seguridad, la sesión y el funcionamiento básico del sitio. No requieren
        consentimiento.
      </p>
      <h3>Analíticas</h3>
      <p>
        Nos permiten medir el uso del sitio (por ejemplo PostHog). Solo se activan si aceptas en el banner de
        cookies.
      </p>

      <h2>3. Cómo desactivarlas</h2>
      <p>
        Puedes configurar tu navegador para bloquear o eliminar cookies. Ten en cuenta que algunas funciones
        del sitio podrían dejar de estar disponibles.
      </p>

      <h2>4. Banner de consentimiento</h2>
      <p>
        Al entrar en nelvyon.com verás un aviso donde puedes aceptar, rechazar o personalizar las cookies no
        esenciales. Puedes cambiar tu elección en cualquier momento desde el enlace «Cookies» en el pie de
        página.
      </p>

      <h2>5. Más información</h2>
      <p>
        Consulta nuestra <Link href="/privacidad">Política de Privacidad</Link> o escribe a{" "}
        <a href="mailto:hola@nelvyon.com">hola@nelvyon.com</a>.
      </p>
    </LegalDocLayout>
  );
}
