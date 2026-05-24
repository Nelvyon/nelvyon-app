"use client";

import Link from "next/link";

import { LegalDocLayout } from "./LegalDocLayout";

export function NelvyonTerminosPage() {
  return (
    <LegalDocLayout title="Términos y Condiciones">
      <p className="lead text-zinc-400">Última actualización: mayo 2026.</p>

      <h2>1. Objeto</h2>
      <p>
        Estos términos regulan el acceso y uso de la plataforma NELVYON (SaaS de marketing autónomo con IA), el sitio web
        nelvyon.com y servicios asociados.
      </p>

      <h2>2. Registro y cuenta</h2>
      <p>
        Debes proporcionar información veraz y mantener la confidencialidad de tus credenciales. Eres responsable de la
        actividad en tu cuenta y workspaces.
      </p>

      <h2>3. Uso aceptable</h2>
      <p>
        Queda prohibido usar NELVYON para actividades ilegales, spam, suplantación, scraping no autorizado, abuso de APIs o
        contenido que vulnere derechos de terceros. Nos reservamos el derecho de suspender cuentas que incumplan estas normas.
      </p>

      <h2>4. Planes y facturación</h2>
      <p>
        Los precios y funcionalidades se describen en /precios. La facturación es recurrente según el plan contratado. Puedes
        cancelar según las condiciones indicadas en el panel de facturación.
      </p>

      <h2>5. Propiedad intelectual</h2>
      <p>
        NELVYON conserva los derechos sobre la plataforma, marca y software. El contenido que generes o subas sigue siendo tuyo;
        nos concedes licencia limitada para alojarlo y procesarlo con fines de prestación del servicio.
      </p>

      <h2>6. IA y resultados</h2>
      <p>
        Los outputs generados por IA son orientativos. Debes revisar contenido legal, publicitario y técnico antes de
        publicarlo. Ver también <Link href="/legal/ai-disclosure">declaración de IA</Link>.
      </p>

      <h2>7. Limitación de responsabilidad</h2>
      <p>
        El servicio se presta «tal cual». En la medida permitida por la ley, NELVYON no será responsable de daños indirectos,
        lucro cesante o pérdida de datos derivados del uso, salvo dolo o negligencia grave.
      </p>

      <h2>8. Ley aplicable</h2>
      <p>
        Estos términos se rigen por la ley española. Para consumidores, los tribunales del domicilio del usuario; para
        empresas, los de Madrid salvo pacto en contrario.
      </p>

      <h2>9. Contacto</h2>
      <p>legal@nelvyon.com</p>
    </LegalDocLayout>
  );
}
