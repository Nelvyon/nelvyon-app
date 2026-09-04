/**
 * Comprobaciones que funcionan sobre lo que el agente DEVUELVE de verdad.
 *
 * ── POR QUÉ EXISTE ESTE FICHERO ─────────────────────────────────────────────
 *
 * De las 55 comprobaciones del motor que leen alguna clave, ocho no podían
 * dispararse nunca: esperaban una ficha estructurada —`paginas`,
 * `ctasPrincipales`, `camposDelFormulario`, `contrasteTextoFondo`— y el agente
 * devuelve prosa.
 *
 * Añadir más comprobaciones de esa clase habría subido un contador sin proteger
 * de nada. Las de aquí leen el TEXTO, que es lo único que hay garantizado.
 *
 * ── QUÉ SE PUEDE AFIRMAR MIRANDO SÓLO EL TEXTO ──────────────────────────────
 *
 * Menos de lo que parece, y por eso todas son AVISOS y no bloqueantes.
 *
 * Un detector de palabras puede estar seguro de lo que NO aparece —si en todo un
 * plan de web no sale ni una vez el sector del cliente ni su diferencial, no se
 * ha escrito para él— pero no puede estar seguro de lo contrario: un sinónimo,
 * una perífrasis o una manera distinta de decirlo lo despistan.
 *
 * Bloquear con esa certeza sería acusar de más. Avisar es lo honesto: sale a la
 * superficie, alguien lo mira, y si el detector se equivocó no ha costado una
 * entrega.
 *
 * ── Y NINGUNA APLICA SIN CONTEXTO ───────────────────────────────────────────
 *
 * Si no consta el sector del cliente, no se puede juzgar si la pieza habla de
 * él. Eso es «no aplica», no «pasa» ni «falla».
 */
import type { Comprobacion, Pieza } from "./MotorDeCalidad";

/** Todo el texto de la pieza, incluido el anidado. */
function textoDe(pieza: Pieza): string {
  const trozos: string[] = [];
  const recorrer = (v: unknown, prof = 0): void => {
    if (prof > 6) return;
    if (typeof v === "string") trozos.push(v);
    else if (Array.isArray(v)) for (const x of v) recorrer(x, prof + 1);
    else if (v && typeof v === "object") for (const x of Object.values(v)) recorrer(x, prof + 1);
  };
  recorrer(pieza.contenido);
  return trozos.join(" ").toLowerCase();
}

/** Las palabras con peso de una frase: las cortas no distinguen nada. */
function palabrasConPeso(frase: string): string[] {
  return frase
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 4);
}

function textoDelContexto(pieza: Pieza, claves: string[]): string | null {
  for (const c of claves) {
    const v = pieza.contexto?.[c];
    if (typeof v === "string" && v.trim().length > 2) return v;
  }
  return null;
}

/** Longitud mínima para que la ausencia de una palabra signifique algo. */
const MINIMO_PARA_OPINAR = 200;

// ── WEB ─────────────────────────────────────────────────────────────────────

export const SOBRE_LA_PROSA_WEB: readonly Comprobacion[] = [
  {
    id: "la-web-habla-del-negocio-del-cliente",
    descripcion: "El plan menciona a qué se dedica este cliente",
    clase: "rubrica",
    gravedad: "aviso",
    evaluar: (p) => {
      // Si ni el sector ni lo que le hace distinto aparecen NI UNA VEZ en todo
      // el plan, no se ha escrito para él. Es lo único que se puede afirmar con
      // seguridad mirando palabras: la ausencia.
      const sector = textoDelContexto(p, ["sector", "industry"]);
      const diferencial = textoDelContexto(p, ["diferenciacion", "propuestaDeValor"]);
      if (!sector && !diferencial) return undefined;

      const texto = textoDe(p);
      if (texto.length < MINIMO_PARA_OPINAR) return undefined;

      const esperadas = [
        ...palabrasConPeso(sector ?? ""),
        ...palabrasConPeso(diferencial ?? ""),
      ];
      if (esperadas.length === 0) return undefined;

      return esperadas.some((w) => texto.includes(w))
        ? null
        : "el plan no menciona ni una vez el sector del cliente ni lo que le hace distinto";
    },
  },
  {
    id: "el-visitante-sabe-que-hacer",
    descripcion: "La página pide algo, no sólo cuenta cosas",
    clase: "rubrica",
    gravedad: "aviso",
    evaluar: (p) => {
      const texto = textoDe(p);
      if (texto.length < MINIMO_PARA_OPINAR) return undefined;
      // Una web que no le pide nada al visitante es un folleto: se lee, se
      // asiente y se cierra.
      const acciones = /\b(pide|pedir|solicita|solicitar|reserva|reservar|compra|comprar|llama|llamar|descarga|descargar|suscr[íi]b|apúntate|contacta|contactar|agenda|agendar|prueba gratis|empieza|book|buy|call|request|subscribe|get started)\b/;
      return acciones.test(texto)
        ? null
        : "el plan no le pide nada al visitante: una web sin acción es un folleto";
    },
  },
  {
    id: "dice-que-pasa-tras-el-formulario",
    descripcion: "Si hay formulario, se dice qué ocurre después",
    clase: "rubrica",
    gravedad: "aviso",
    evaluar: (p) => {
      const texto = textoDe(p);
      const hayFormulario = /\b(formulario|contacto|solicitud|presupuesto|contact form)\b/.test(texto);
      if (!hayFormulario) return undefined;
      // El silencio tras enviar un formulario es donde se pierde la confianza:
      // el visitante no sabe si ha llegado ni cuándo le contestarán.
      const respuesta = /\b(confirmaci[óo]n|responderemos|te responde|recibir[áa]s|en menos de|plazo de respuesta|acuse|te llamamos|we.ll (get back|reply))\b/.test(texto);
      return respuesta
        ? null
        : "hay formulario y no se dice qué pasa después de enviarlo ni cuándo se responde";
    },
  },
];

// ── ECOMMERCE ───────────────────────────────────────────────────────────────

export const SOBRE_LA_PROSA_ECOMMERCE: readonly Comprobacion[] = [
  {
    id: "el-envio-y-la-devolucion-se-dicen",
    descripcion: "Se habla de envío y devoluciones",
    clase: "rubrica",
    gravedad: "aviso",
    evaluar: (p) => {
      const texto = textoDe(p);
      if (texto.length < MINIMO_PARA_OPINAR) return undefined;
      // Son las dos preguntas que decide un comprador antes de pagar, y las dos
      // razones por las que se abandona un carrito lleno.
      const envio = /\b(env[íi]o|entrega|shipping|delivery|portes)\b/.test(texto);
      const devolucion = /\b(devoluci[óo]n|devolver|reembolso|return|refund|garant[íi]a)\b/.test(texto);
      if (envio && devolucion) return null;
      const falta = [!envio && "el envío", !devolucion && "las devoluciones"].filter(Boolean);
      return `un plan de tienda que no habla de ${falta.join(" ni de ")}: es donde se abandona el carrito`;
    },
  },
];

// ── CRM ─────────────────────────────────────────────────────────────────────

export const SOBRE_LA_PROSA_CRM: readonly Comprobacion[] = [
  {
    id: "el-seguimiento-tiene-dueno-y-momento",
    descripcion: "Se dice quién hace el seguimiento y cuándo",
    clase: "rubrica",
    gravedad: "aviso",
    evaluar: (p) => {
      const texto = textoDe(p);
      if (texto.length < MINIMO_PARA_OPINAR) return undefined;
      // Un seguimiento sin dueño y sin momento no ocurre. Es la diferencia
      // entre un proceso y un diagrama bonito.
      const quien = /\b(responsable|due[ñn]o|asignad|comercial|se encarga|owner|assigned)\b/.test(texto);
      // «en menos de 2 horas» es como se dice de verdad, y la primera version
      // del patron solo cogia «en 2 horas». Lo caso su propia prueba.
      const cuando =
        /\b(a las \d|(en|dentro de)\s+(menos de\s+)?\d+\s*(horas?|d[íi]as?|semanas?|min)|al d[íi]a siguiente|mismo d[íi]a|cada \d|plazo|sla|within \d)\b/.test(
          texto,
        );
      if (quien && cuando) return null;
      const falta = [!quien && "quién lo hace", !cuando && "cuándo"].filter(Boolean);
      return `el seguimiento no dice ${falta.join(" ni ")}: sin eso no ocurre`;
    },
  },
];

// ── SEO ─────────────────────────────────────────────────────────────────────

export const SOBRE_LA_PROSA_SEO: readonly Comprobacion[] = [
  {
    id: "dice-como-se-va-a-medir",
    descripcion: "El plan dice con qué se va a medir",
    clase: "rubrica",
    gravedad: "aviso",
    evaluar: (p) => {
      const texto = textoDe(p);
      if (texto.length < MINIMO_PARA_OPINAR) return undefined;
      // Un plan de SEO sin medición no se puede defender a los tres meses: no
      // hay forma de distinguir «funcionó» de «pasó el tiempo».
      const medicion =
        /\b(search console|analytics|ga4|posiciones?|rankings?|impresiones|clics|ctr|tr[áa]fico org[áa]nico|conversiones)\b/.test(
          texto,
        );
      return medicion
        ? null
        : "el plan no dice con qué se va a medir: a los tres meses no habrá forma de saber si funcionó";
    },
  },
  {
    id: "el-seo-local-cuando-el-negocio-es-local",
    descripcion: "Un negocio con dirección trabaja su SEO local",
    clase: "rubrica",
    gravedad: "aviso",
    evaluar: (p) => {
      // Sólo aplica si consta que el negocio atiende en un sitio. Un SaaS que
      // vende en toda Europa no necesita ficha de Google.
      const ubicacion = textoDelContexto(p, ["ubicacion", "location", "ciudad"]);
      if (!ubicacion) return undefined;

      const texto = textoDe(p);
      if (texto.length < MINIMO_PARA_OPINAR) return undefined;
      const local =
        /\b(google business|perfil de empresa|ficha de google|maps|rese[ñn]as|local pack|seo local|nap|citations)\b/.test(
          texto,
        );
      return local
        ? null
        : "el negocio atiende en un sitio concreto y el plan no toca nada de SEO local";
    },
  },
];

// ── ADS ─────────────────────────────────────────────────────────────────────

export const SOBRE_LA_PROSA_ADS: readonly Comprobacion[] = [
  {
    id: "dice-como-se-medira-la-conversion",
    descripcion: "Se declara cómo se mide lo que se compra",
    clase: "rubrica",
    gravedad: "aviso",
    evaluar: (p) => {
      const texto = textoDe(p);
      if (texto.length < MINIMO_PARA_OPINAR) return undefined;
      // Gastar sin medir es gastar a ciegas, y encima impide optimizar: no se
      // sabe qué anuncio trajo qué.
      const medicion =
        /\b(conversi[óo]n|p[íi]xel|pixel|etiqueta|tag|gtm|ga4|evento|seguimiento|tracking|capi|offline conversions?)\b/.test(
          texto,
        );
      return medicion
        ? null
        : "no se dice cómo se medirá la conversión: es gastar sin poder optimizar";
    },
  },
  {
    id: "el-anuncio-tiene-donde-aterrizar",
    descripcion: "Se dice a dónde llega quien hace clic",
    clase: "rubrica",
    gravedad: "aviso",
    evaluar: (p) => {
      const texto = textoDe(p);
      if (texto.length < MINIMO_PARA_OPINAR) return undefined;
      // Mandar tráfico pagado a la home es la forma más común de quemar
      // presupuesto: la promesa del anuncio no aparece por ningún sitio.
      const destino = /\b(landing|p[áa]gina de destino|destino|aterrizaje|url final|landing page)\b/.test(texto);
      return destino
        ? null
        : "el plan no dice a dónde llega quien hace clic: el tráfico pagado a la home se pierde";
    },
  },
];

// ── SOCIAL ──────────────────────────────────────────────────────────────────

export const SOBRE_LA_PROSA_SOCIAL: readonly Comprobacion[] = [
  {
    id: "cada-red-tiene-su-motivo",
    descripcion: "Se dice por qué esa red y no otra",
    clase: "rubrica",
    gravedad: "aviso",
    evaluar: (p) => {
      const texto = textoDe(p);
      const redes = texto.match(
        /\b(instagram|tiktok|linkedin|facebook|youtube|twitter|threads|pinterest)\b/g,
      );
      if (!redes || redes.length === 0) return undefined;

      // Estar en una red porque existe es como se acaba publicando lo mismo en
      // cinco sitios y sin resultado en ninguno.
      const justificacion =
        /\b(porque|ya que|dado que|es donde|su p[úu]blico|la audiencia est[áa]|no tiene sentido|se descarta|no se trabaja)\b/.test(
          texto,
        );
      return justificacion
        ? null
        : `nombra ${new Set(redes).size} red(es) y no dice por qué ésas y no otras`;
    },
  },
  {
    id: "el-formato-cambia-con-la-red",
    descripcion: "El formato se adapta a dónde se publica",
    clase: "rubrica",
    gravedad: "aviso",
    evaluar: (p) => {
      const texto = textoDe(p);
      const redes = new Set(
        (texto.match(/\b(instagram|tiktok|linkedin|facebook|youtube|twitter)\b/g) ?? []),
      );
      // Con una sola red no hay adaptación que juzgar.
      if (redes.size < 2) return undefined;

      const formatos =
        /\b(reel|reels|shorts?|carrusel|carousel|v[íi]deo vertical|vertical|historia|stories|hilo|thread|art[íi]culo|documento|directo|live|9:16|1:1|16:9)\b/.test(
          texto,
        );
      return formatos
        ? null
        : `plan para ${redes.size} redes sin un solo formato propio de ninguna: es el mismo post repetido`;
    },
  },
];

// ── CONTENIDO ───────────────────────────────────────────────────────────────

export const SOBRE_LA_PROSA_CONTENIDO: readonly Comprobacion[] = [
  {
    id: "dice-donde-se-va-a-distribuir",
    descripcion: "El contenido tiene por dónde llegar a alguien",
    clase: "rubrica",
    gravedad: "aviso",
    evaluar: (p) => {
      const texto = textoDe(p);
      if (texto.length < MINIMO_PARA_OPINAR) return undefined;
      // Contenido sin distribución es contenido que no lee nadie. Publicar no
      // es distribuir.
      const distribucion =
        /\b(distribuci[óo]n|newsletter|bolet[íi]n|redes|correo|email|linkedin|instagram|b[úu]squeda|org[áa]nico|difusi[óo]n|se comparte|se publica en)\b/.test(
          texto,
        );
      return distribucion
        ? null
        : "no se dice por dónde va a llegar este contenido a alguien: publicar no es distribuir";
    },
  },
  {
    id: "cada-pieza-sabe-a-quien-pilla-donde",
    descripcion: "Se distingue a quién descubre de quién ya decide",
    clase: "rubrica",
    gravedad: "aviso",
    evaluar: (p) => {
      const texto = textoDe(p);
      if (texto.length < MINIMO_PARA_OPINAR) return undefined;
      // Escribirle igual a quien no sabe que tiene un problema y a quien está
      // comparando precios es no escribirle a ninguno de los dos.
      const momento =
        /\b(descubrimiento|conocimiento|awareness|consideraci[óo]n|comparaci[óo]n|decisi[óo]n|compra|fidelizaci[óo]n|retenci[óo]n|embudo|funnel|fr[íi]o|caliente|top of funnel|tofu|mofu|bofu)\b/.test(
          texto,
        );
      return momento
        ? null
        : "todas las piezas le hablan igual a quien acaba de descubrirte y a quien ya está comparando precios";
    },
  },
];
