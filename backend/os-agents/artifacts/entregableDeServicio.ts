/**
 * EL ENTREGABLE QUE RECIBE EL CLIENTE.
 *
 * EL PROBLEMA QUE RESUELVE, medido y no supuesto. De los veinticinco servicios
 * que NELVYON vende, ocho terminan produciendo un fichero que el cliente puede
 * abrir —un informe de SEO, un paquete de anuncios, una landing—. Los otros
 * diecisiete terminan en TEXTO: la salida del último paso del agente, en JSON,
 * dentro del resultado de un trabajo.
 *
 * Eso no es un entregable. Es materia prima de un entregable.
 *
 * Un cliente que paga 950 € por «Canales y Comunicaciones Premium» y recibe un
 * objeto JSON con seis campos de texto no ha recibido el servicio: ha recibido
 * las notas de quien iba a hacerlo.
 *
 * QUÉ HACE ESTE MÓDULO. Coge lo que el agente ha producido paso a paso y lo
 * convierte en un documento con estructura: portada con el cliente y el
 * servicio, un apartado por paso con su nombre en cristiano, y el aviso de qué
 * partes están sin verificar. En Markdown y en HTML, empaquetados.
 *
 * LO QUE **NO** HACE, y es lo importante:
 *
 *   · NO INVENTA NADA. Sólo reordena lo que el agente produjo. Si un paso no
 *     produjo nada, el apartado dice que no produjo nada, no lo rellena.
 *   · NO PROMETE que el contenido sea bueno. Un documento bien maquetado con
 *     un contenido flojo sigue siendo flojo, y presentarlo bonito es cómo un
 *     PDF acaba sustituyendo a un resultado.
 *   · NO SUSTITUYE al constructor específico de un servicio. Los ocho que ya
 *     tienen el suyo lo conservan: un informe de SEO con su estructura propia
 *     es mejor que este genérico, y por eso este sólo entra donde no hay otro.
 */

import type { ArtifactFileMap } from "./artifactPublisher";

export interface PasoProducido {
  name: string;
  data: { output?: string };
}

export interface DatosDelEntregable {
  serviceId: string;
  /** Cómo se llama el servicio para una persona. */
  nombreDelServicio?: string;
  cliente?: string;
  jobId: string;
  pasos: readonly PasoProducido[];
  /**
   * Con qué se produjo. Va EN EL DOCUMENTO, no en una nota interna: el cliente
   * tiene derecho a saber si esto lo revisó un modelo o unas reglas.
   */
  modoDeProduccion?: "REAL" | "RULE_BASED" | "MOCK" | "UNAVAILABLE";
  /**
   * Las cuentas que se hicieron, con su resultado.
   *
   * Van en el documento y con la fórmula al lado. Un especialista que suelta
   * una cifra sin enseñar la cuenta no se puede rebatir, y lo que no se puede
   * rebatir tampoco se puede corregir.
   */
  calculos?: ReadonlyArray<{ herramienta: string; que: string; resultado: unknown }>;
}

/** Nombres de paso legibles. Los internos son para el registro, no para el cliente. */
const NOMBRE_DE_PASO: Readonly<Record<string, string>> = {
  seo_audit: "Auditoría",
  keyword_research: "Palabras clave",
  content_strategy: "Estrategia de contenido",
  technical_seo: "Trabajo técnico",
  link_building: "Autoridad y enlaces",
  delivery_report: "Resumen de entrega",
  analysis: "Análisis",
  strategy: "Estrategia",
  brief_analysis: "Análisis del encargo",
  design_proposal: "Propuesta de diseño",
  content_generation: "Contenidos",
  qa_checklist: "Comprobaciones",
  seo_setup: "Preparación para buscadores",
  implementation: "Puesta en marcha",
  measurement: "Medición",
  optimization: "Optimización",
};

function legible(name: string): string {
  if (NOMBRE_DE_PASO[name]) return NOMBRE_DE_PASO[name];
  return name
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * Intenta leer JSON; si no lo es, devuelve el texto tal cual.
 *
 * Los agentes piden JSON al modelo pero un modelo puede devolver prosa. Un
 * entregable que revienta porque la respuesta no era JSON es un entregable que
 * no llega, así que se degrada a texto — y eso NO es fingir que salió bien: el
 * contenido es el mismo, sólo cambia cómo se presenta.
 */
function comoTexto(bruto: string): string {
  const limpio = bruto.trim();
  if (!limpio) return "";
  if (!limpio.startsWith("{") && !limpio.startsWith("[")) return limpio;
  try {
    const o = JSON.parse(limpio);
    if (typeof o === "string") return o;
    if (Array.isArray(o)) return o.map((x) => `- ${typeof x === "string" ? x : JSON.stringify(x)}`).join("\n");
    const partes: string[] = [];
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim()) partes.push(`**${legible(k)}**\n\n${v.trim()}`);
      else if (Array.isArray(v) && v.length > 0) {
        partes.push(
          `**${legible(k)}**\n\n${v.map((x) => `- ${typeof x === "string" ? x : JSON.stringify(x)}`).join("\n")}`,
        );
      }
    }
    return partes.length > 0 ? partes.join("\n\n") : limpio;
  } catch {
    return limpio;
  }
}

const escapar = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * El aviso de con qué se produjo esto.
 *
 * En el documento y arriba, no escondido al final. Un cliente que recibe un
 * plan tiene derecho a saber si lo revisó un modelo real o unas reglas. Es la
 * misma regla que rige el motor de calidad: nunca presentar una cosa como la
 * otra.
 */
function avisoDeModo(modo: DatosDelEntregable["modoDeProduccion"]): string | null {
  switch (modo) {
    case "REAL":
      return null;
    case "RULE_BASED":
      return "Este documento se ha compuesto con reglas deterministas, sin modelo de lenguaje.";
    case "MOCK":
      return "ATENCIÓN: producido en modo simulado. NO es trabajo real y no debe entregarse a un cliente.";
    case "UNAVAILABLE":
      return "Parte de este documento no ha podido revisarse: no había modelo disponible. Lo que sigue está sin verificar.";
    default:
      return null;
  }
}

/** El documento en Markdown y en HTML, listos para empaquetar. */
export function construirEntregable(d: DatosDelEntregable): ArtifactFileMap {
  const titulo = d.nombreDelServicio ?? d.serviceId.replace(/_/g, " ");
  const cliente = d.cliente?.trim() || "Cliente";
  const fecha = new Date().toISOString().slice(0, 10);
  const aviso = avisoDeModo(d.modoDeProduccion);

  const conContenido = d.pasos
    .map((p) => ({ nombre: legible(p.name), cuerpo: comoTexto(p.data?.output ?? "") }))
    .filter((p) => p.cuerpo.length > 0);

  const vacios = d.pasos.length - conContenido.length;

  // Las cuentas, con su fórmula. Sólo las que llegaron a calcularse: una que
  // no pudo se dice aparte, con lo que le faltó, porque saber qué dato falta
  // es la mitad del valor.
  const calculados: Array<{ que: string; significa: string; formula: string }> = [];
  const sinCalcular: Array<{ que: string; falta: string }> = [];
  for (const c of d.calculos ?? []) {
    const r = c.resultado as {
      estado?: string; queSignifica?: string; comoSeCalcula?: string; falta?: string[];
    };
    if (r?.estado === "CALCULADO") {
      calculados.push({
        que: c.que,
        significa: r.queSignifica ?? "",
        formula: r.comoSeCalcula ?? "",
      });
    } else if (r?.estado === "NO_SE_PUEDE_CALCULAR") {
      sinCalcular.push({ que: c.que, falta: (r.falta ?? []).join(", ") });
    }
  }

  const md = [
    `# ${titulo}`,
    ``,
    `**Cliente:** ${cliente}`,
    `**Fecha:** ${fecha}`,
    ``,
    aviso ? `> ${aviso}\n` : "",
    `---`,
    ``,
    ...conContenido.flatMap((p) => [`## ${p.nombre}`, ``, p.cuerpo, ``]),
    ...(calculados.length > 0
      ? [
          `## Las cuentas`,
          ``,
          ...calculados.flatMap((c) => [`**${c.que}**`, ``, c.significa, ``, `_${c.formula}_`, ``]),
        ]
      : []),
    ...(sinCalcular.length > 0
      ? [
          `## Lo que no se ha podido calcular`,
          ``,
          `Falta el dato, y sin él una cifra sería inventada.`,
          ``,
          ...sinCalcular.map((c) => `- **${c.que}** — falta: ${c.falta}`),
          ``,
        ]
      : []),
    // LOS PASOS SIN CONTENIDO SE DICEN. Omitirlos en silencio haría que un
    // documento incompleto pareciera completo.
    vacios > 0
      ? `---\n\n_${vacios} apartado(s) no produjeron contenido y no aparecen en este documento._\n`
      : "",
    `---`,
    ``,
    `_Preparado por NELVYON._`,
  ]
    .filter((x) => x !== "")
    .join("\n");

  const html = [
    "<!doctype html>",
    '<html lang="es"><head><meta charset="utf-8">',
    `<title>${escapar(titulo)} · ${escapar(cliente)}</title>`,
    "<style>",
    "body{font:16px/1.65 system-ui,-apple-system,Segoe UI,sans-serif;max-width:44rem;margin:3rem auto;padding:0 1.25rem;color:#18181b}",
    "h1{font-size:1.9rem;margin-bottom:.25rem}h2{margin-top:2.5rem;font-size:1.25rem;border-bottom:1px solid #e4e4e7;padding-bottom:.35rem}",
    ".meta{color:#71717a;font-size:.9rem}",
    ".aviso{background:#fef3c7;border-left:4px solid #f59e0b;padding:.85rem 1rem;margin:1.5rem 0;border-radius:.25rem}",
    "pre{white-space:pre-wrap;font:inherit;margin:0}",
    "footer{margin-top:3rem;color:#71717a;font-size:.85rem;border-top:1px solid #e4e4e7;padding-top:1rem}",
    "</style></head><body>",
    `<h1>${escapar(titulo)}</h1>`,
    `<p class="meta">${escapar(cliente)} · ${fecha}</p>`,
    aviso ? `<p class="aviso">${escapar(aviso)}</p>` : "",
    ...conContenido.map(
      (p) => `<h2>${escapar(p.nombre)}</h2><pre>${escapar(p.cuerpo)}</pre>`,
    ),
    calculados.length > 0
      ? `<h2>Las cuentas</h2>${calculados
          .map(
            (c) =>
              `<p><strong>${escapar(c.que)}</strong><br>${escapar(c.significa)}<br>` +
              `<span class="meta">${escapar(c.formula)}</span></p>`,
          )
          .join("")}`
      : "",
    sinCalcular.length > 0
      ? `<h2>Lo que no se ha podido calcular</h2>` +
        `<p class="meta">Falta el dato, y sin él una cifra sería inventada.</p><ul>${sinCalcular
          .map((c) => `<li><strong>${escapar(c.que)}</strong> — falta: ${escapar(c.falta)}</li>`)
          .join("")}</ul>`
      : "",
    vacios > 0
      ? `<p class="meta">${vacios} apartado(s) no produjeron contenido y no aparecen aquí.</p>`
      : "",
    "<footer>Preparado por NELVYON.</footer>",
    "</body></html>",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    "informe.md": md,
    "informe.html": html,
  };
}

/**
 * ¿Este resultado ya trae un entregable propio?
 *
 * Los ocho servicios con constructor específico publican su artefacto en un
 * paso y dejan la referencia en la salida. Volver a envolverlo en un documento
 * genérico le daría al cliente dos ficheros que dicen lo mismo, y el peor de
 * los dos primero.
 */
export function yaTieneEntregable(pasos: readonly PasoProducido[]): boolean {
  return pasos.some((p) => {
    const s = p.data?.output ?? "";
    return s.includes("downloadUrl") || s.includes("assetId");
  });
}
