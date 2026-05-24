"use client";

import Link from "next/link";

import { LegalDocLayout } from "./LegalDocLayout";

export function NelvyonCookiesPage() {
  return (
    <LegalDocLayout title="Política de Cookies">
      <p className="lead text-zinc-400">Última actualización: mayo 2026.</p>

      <h2>1. ¿Qué son las cookies?</h2>
      <p>
        Las cookies son pequeños archivos que se almacenan en tu dispositivo al visitar nelvyon.com. También usamos
        tecnologías similares (localStorage) para preferencias de consentimiento.
      </p>

      <h2>2. Tipos de cookies que utilizamos</h2>
      <h3>Necesarias</h3>
      <p>Imprescindibles para autenticación, seguridad y funcionamiento de la sesión. No requieren consentimiento.</p>
      <h3>Analíticas</h3>
      <p>
        Nos ayudan a medir uso y rendimiento (p. ej. PostHog). Solo se activan si aceptas en el banner de cookies.
      </p>
      <h3>Marketing</h3>
      <p>Permiten personalizar comunicaciones y medir campañas. Requieren consentimiento explícito.</p>

      <h2>3. Gestión del consentimiento</h2>
      <p>
        Al entrar en la web verás un banner donde puedes aceptar todas, rechazar las no necesarias o personalizar. Puedes
        cambiar tu elección en cualquier momento desde el enlace «Cookies» en el pie de página o usando el botón de
        preferencias si está disponible.
      </p>

      <h2>4. Cookies de terceros</h2>
      <p>Google OAuth (login), proveedores de analytics y CDN pueden instalar cookies propias sujetas a sus políticas.</p>

      <h2>5. Más información</h2>
      <p>
        Consulta nuestra <Link href="/privacidad">Política de Privacidad</Link> o escribe a legal@nelvyon.com.
      </p>
    </LegalDocLayout>
  );
}
