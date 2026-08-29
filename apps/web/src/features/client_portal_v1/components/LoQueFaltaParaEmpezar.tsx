"use client";

/**
 * LO QUE FALTA PARA EMPEZAR.
 *
 * EL PROBLEMA QUE RESUELVE, medido y no supuesto. En producción hay doce
 * trabajos encolados desde junio que nunca se ejecutaron, y cinco mil
 * entregables aprobados. El sistema producía; lo que se atascaba era el
 * arranque. Y el cliente no tenía forma de saber que se había atascado por él:
 * el portal le enseñaba proyectos y entregables, nunca «faltan tus datos».
 *
 * Por eso este bloque va ARRIBA DEL TODO y sólo aparece cuando hay algo
 * pendiente. Un aviso permanente se convierte en parte del decorado a los tres
 * días; uno que sólo sale cuando hace falta se lee.
 *
 * DOS DECISIONES DE DISEÑO QUE NO SON ESTÉTICAS:
 *
 *   1. LO IMPRESCINDIBLE PRIMERO Y APARTE. Mezclar «falta tu logotipo» con
 *      «falta el acceso a tu cuenta de anuncios» hace que las dos parezcan
 *      igual de urgentes, y entonces ninguna lo parece. Lo que bloquea se dice
 *      que bloquea.
 *
 *   2. CADA PETICIÓN DICE PARA QUÉ. Pedirle a alguien acceso a su cuenta de
 *      publicidad sin explicar para qué es pedirle un acto de fe. `paraQue`
 *      viene del backend justamente para esto, y si algún día llega vacío se
 *      nota aquí en vez de pasar desapercibido.
 */

import type { ConexionPendiente, HuecoDelCliente } from "@/features/client_portal_v1/cicloTypes";

interface Props {
  datos: HuecoDelCliente[];
  conexiones: ConexionPendiente[];
  listoParaOperar: boolean;
}

/** Nombres que una persona reconoce, para proveedores que se llaman en clave. */
const NOMBRE_DE_PROVEEDOR: Readonly<Record<string, string>> = {
  google_ads: "Google Ads",
  meta_ads: "Meta (Facebook e Instagram)",
  google_analytics: "Google Analytics",
  google_business: "Perfil de Empresa de Google",
  search_console: "Google Search Console",
  tiktok_ads: "TikTok Ads",
  linkedin_ads: "LinkedIn Ads",
  mailchimp: "Mailchimp",
};

const nombreDe = (proveedor: string): string =>
  NOMBRE_DE_PROVEEDOR[proveedor] ??
  proveedor.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function LoQueFaltaParaEmpezar({ datos, conexiones, listoParaOperar }: Props) {
  const bloqueantes = datos.filter((d) => d.imprescindible);
  const mejoras = datos.filter((d) => !d.imprescindible);
  const hayAlgo = datos.length > 0 || conexiones.length > 0;

  // Nada pendiente y se puede trabajar: no se dice nada. Un panel que celebra
  // que todo está bien ocupa el sitio de lo que sí importa.
  if (!hayAlgo && listoParaOperar) return null;

  return (
    <section
      aria-labelledby="lo-que-falta"
      className={
        listoParaOperar
          ? "rounded-lg border border-border bg-card p-5 shadow-card"
          : "rounded-lg border border-amber-300 bg-amber-50 p-5 shadow-card dark:border-amber-800 dark:bg-amber-950/40"
      }
    >
      <h2 id="lo-que-falta" className="text-base font-semibold">
        {listoParaOperar
          ? "Podemos trabajar, pero hay cosas que nos ayudarían"
          : "Necesitamos esto para poder empezar"}
      </h2>

      {!listoParaOperar ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Mientras falte algo de esta lista, tu trabajo está parado. No es un trámite:
          sin estos datos lo que hagamos sería una suposición.
        </p>
      ) : null}

      {bloqueantes.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-amber-900 dark:text-amber-200">
            Imprescindible
          </h3>
          <ul className="mt-2 space-y-2">
            {bloqueantes.map((d) => (
              <li
                key={d.dimension}
                className="rounded-md border border-amber-200 bg-white/70 p-3 text-sm dark:border-amber-900 dark:bg-black/20"
              >
                <p className="font-medium">{d.pregunta}</p>
                {d.motivo === "caducada" ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Nos lo dijiste hace tiempo y puede haber cambiado. Confírmalo y seguimos.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {conexiones.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-amber-900 dark:text-amber-200">
            Accesos que necesitamos
          </h3>
          <ul className="mt-2 space-y-2">
            {conexiones.map((c) => (
              <li
                key={c.proveedor}
                className="rounded-md border border-amber-200 bg-white/70 p-3 text-sm dark:border-amber-900 dark:bg-black/20"
              >
                <p className="font-medium">{nombreDe(c.proveedor)}</p>
                {/* Para qué. Pedir un acceso sin decir para qué es pedir fe. */}
                <p className="mt-1 text-xs text-muted-foreground">{c.paraQue}</p>
                {c.estado === "caducada" ? (
                  <p className="mt-1 text-xs font-medium text-amber-800 dark:text-amber-300">
                    El acceso que nos diste ha caducado y hemos dejado de recibir datos.
                  </p>
                ) : null}
                {c.servicios.length > 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Lo usamos para: {c.servicios.join(", ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {mejoras.length > 0 ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Nos ayudaría saber ({mejoras.length})
          </summary>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {mejoras.map((d) => (
              <li key={d.dimension}>· {d.pregunta}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
