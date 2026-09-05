/**
 * Lo que cada red pide DE VERDAD, y por que no vale copiar el mismo texto.
 *
 * ── EL PROBLEMA QUE RESUELVE ────────────────────────────────────────────────
 *
 * El agente social tenia seis pasos horizontales —auditoria, estrategia,
 * calendario, comunidad, analitica, informe— y en 129 lineas de instrucciones
 * mencionaba una plataforma concreta DOS veces. Un plan asi sale igual para
 * Instagram que para LinkedIn, y eso no es un plan social: es un texto repetido
 * seis veces.
 *
 * Publicar lo mismo en todas las redes no es solo peor: en algunas es
 * contraproducente. Un carrusel de LinkedIn en TikTok no se ve; un hilo de X en
 * Instagram no se lee; un Short vertical en YouTube compite con otro formato y
 * otro algoritmo.
 *
 * ── QUE ES ESTO Y QUE NO ────────────────────────────────────────────────────
 *
 * NO es una lista de buenas practicas genericas. Cada entrada dice tres cosas
 * que cambian el trabajo:
 *
 *   · el FORMATO nativo — lo que la plataforma premia, no lo que admite;
 *   · como se gana la ATENCION en los primeros segundos, que es distinto en
 *     cada red porque el contexto de consumo es distinto;
 *   · lo que NO se hace ahi, que suele ser lo que mas se copia sin pensar.
 *
 * Las prohibiciones importan tanto como las recomendaciones: son las que
 * impiden que el mismo material se recicle a ciegas.
 *
 * COSTE EXTERNO: 0 EUR. Es texto que viaja dentro del encargo.
 */

/** Las redes para las que hay criterio propio. */
export type Plataforma =
  | "instagram"
  | "tiktok"
  | "linkedin"
  | "facebook"
  | "x"
  | "youtube";

export type ContratoDePlataforma = {
  /** Como se llama la red al hablar con el cliente. */
  nombre: string;
  /** Los formatos que la plataforma PREMIA hoy, no los que admite. */
  formatos: string[];
  /** Como se gana la atencion ahi, en concreto. */
  gancho: string;
  /** Que mide el exito en esa red, que no es lo mismo en todas. */
  seniales: string[];
  /** Lo que NO se hace. Es lo que evita el copia-pega. */
  nunca: string[];
  /** Cadencia sostenible sin quemar la cuenta ni al equipo. */
  cadencia: string;
};

export const CONTRATO_POR_PLATAFORMA: Readonly<Record<Plataforma, ContratoDePlataforma>> = {
  instagram: {
    nombre: "Instagram",
    formatos: ["carrusel de 6-10 laminas", "reel vertical de 7-15 s", "historia con encuesta"],
    gancho:
      "la primera lamina o el primer fotograma tiene que entenderse SIN sonido y sin " +
      "contexto: se consume en silencio y a media pantalla",
    seniales: ["guardados", "compartidos en historias", "retencion del reel"],
    nunca: [
      "enlaces en el cuerpo del texto — no son clicables y rompen la lectura",
      "capturas de texto largo pensadas para otra red",
      "hashtags en bloque al final sin relacion con la pieza",
    ],
    cadencia: "3-5 piezas por semana, con al menos una en video",
  },
  tiktok: {
    nombre: "TikTok",
    formatos: ["video vertical de 15-45 s", "serie de varios capitulos"],
    gancho:
      "los tres primeros segundos deciden; se empieza por el conflicto o el resultado, " +
      "nunca por la presentacion de quien habla",
    seniales: ["porcentaje de visionado completo", "revisionados", "comentarios que piden mas"],
    nunca: [
      "reciclar un video con marca de agua de otra red — el algoritmo lo penaliza",
      "abrir diciendo el nombre de la empresa",
      "formato horizontal",
    ],
    cadencia: "4-7 piezas por semana; el volumen es parte del formato",
  },
  linkedin: {
    nombre: "LinkedIn",
    formatos: ["texto de 800-1300 caracteres", "carrusel en PDF", "articulo cuando hay tesis"],
    gancho:
      "las dos primeras lineas antes del «ver mas» son el titular; se abre con una " +
      "afirmacion concreta, no con una pregunta retorica",
    seniales: ["comentarios de profesionales del sector", "guardados", "mensajes recibidos"],
    nunca: [
      "emojis decorativos en cada linea",
      "enlaces externos en el cuerpo — reducen el alcance; van en el primer comentario",
      "tono de campana publicitaria: aqui se lee en horario de trabajo",
    ],
    cadencia: "2-4 publicaciones por semana, en dias laborables",
  },
  facebook: {
    nombre: "Facebook",
    formatos: ["publicacion con imagen y texto de 2-4 lineas", "video nativo", "evento"],
    gancho:
      "se apela a la pertenencia local o al grupo; funciona lo cercano y lo reconocible, " +
      "no lo aspiracional",
    seniales: ["comentarios de la comunidad", "compartidos", "asistencias a eventos"],
    nunca: [
      "texto largo sin salto: se corta y casi nadie despliega",
      "el mismo copy que Instagram — el publico y la edad media no coinciden",
    ],
    cadencia: "2-4 publicaciones por semana",
  },
  x: {
    nombre: "X",
    formatos: ["publicacion suelta de una idea", "hilo de 4-8 mensajes con una tesis"],
    gancho:
      "una afirmacion que se sostenga sola en un mensaje; si necesita contexto para " +
      "entenderse, no funciona aqui",
    seniales: ["citas con comentario", "respuestas de cuentas del sector", "guardados"],
    nunca: [
      "cortar un texto largo en trozos y llamarlo hilo",
      "publicar imagenes de texto en vez de texto",
      "hashtags: aqui restan mas que suman",
    ],
    cadencia: "diaria; es la red de mayor rotacion",
  },
  youtube: {
    nombre: "YouTube",
    formatos: ["video de 6-12 min con capitulos", "Short vertical de menos de 60 s"],
    gancho:
      "titulo y miniatura son el 90% de la decision, y se piensan ANTES de grabar; " +
      "el video responde a la promesa que hacen",
    seniales: ["duracion media de visionado", "clics sobre impresiones", "suscripciones ganadas"],
    nunca: [
      "subir un Short y un video largo con el mismo material sin recortar",
      "titulos que prometen lo que el video no da: hunden el canal entero, no solo el video",
      "empezar con una introduccion de marca antes del contenido",
    ],
    cadencia: "1 video largo por semana, 2-3 Shorts",
  },
};

/** Las redes que tienen criterio propio, en orden estable. */
export const PLATAFORMAS: readonly Plataforma[] = Object.freeze(
  Object.keys(CONTRATO_POR_PLATAFORMA) as Plataforma[],
);

/**
 * El contrato como texto, para que viaje dentro del encargo del agente.
 *
 * Se pasan las plataformas que el cliente USA. Pedir criterio para una red donde
 * no esta seria inventarle una presencia que no tiene.
 */
export function contratoNativoComoTexto(plataformas: readonly Plataforma[]): string {
  const elegidas = plataformas.filter((p) => p in CONTRATO_POR_PLATAFORMA);
  if (elegidas.length === 0) return "";

  const bloques = elegidas.map((p) => {
    const c = CONTRATO_POR_PLATAFORMA[p];
    return [
      `### ${c.nombre}`,
      `Formatos que premia: ${c.formatos.join("; ")}.`,
      `Como se gana la atencion: ${c.gancho}.`,
      `Que mide el exito: ${c.seniales.join(", ")}.`,
      `Cadencia: ${c.cadencia}.`,
      `NUNCA aqui:`,
      ...c.nunca.map((n) => `  - ${n}`),
    ].join("\n");
  });

  return [
    "## CADA RED RECIBE CONTENIDO NATIVO",
    "",
    "No adaptes el mismo texto a todas. Cada pieza se concibe PARA su red: el",
    "formato, el gancho y lo que se mide son distintos, y lo que funciona en una",
    "penaliza en otra. Si una idea solo funciona en una red, va solo en esa red.",
    "",
    ...bloques,
  ].join("\n");
}
