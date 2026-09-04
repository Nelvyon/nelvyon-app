/**
 * EL BRIEF VISUAL: lo que hay que saber antes de decidir cómo se ve algo.
 *
 * ── POR QUÉ EXISTE ──────────────────────────────────────────────────────────
 *
 * `VisualEliteStrategyPipeline` lleva la cadena entera —dirección creativa,
 * guion, storyboard, prompts, dos variantes, revisión, puertas de presupuesto,
 * licencia, privacidad y aprobación humana— y no lo llamaba nadie. El motivo
 * declarado era que ningún encargo trae un brief visual.
 *
 * Conectarlo tal cual habría sido peor que dejarlo suelto: su dirección
 * creativa devolvía las MISMAS cuatro palabras para cualquier cliente
 * —«auténtico, profesional, cercano»— más el sector interpolado. Eso es
 * literalmente lo genérico que este sistema existe para evitar.
 *
 * Así que primero el brief, y después la conexión.
 *
 * ── DE DÓNDE SALE, Y POR QUÉ NO SE LE PREGUNTA AL CLIENTE ───────────────────
 *
 * Casi todo esto ya está en el Business Brain: su marca, cómo habla, lo que su
 * marca NO hace, contra quién compite, qué materiales tiene, dónde se va a ver
 * la pieza, a quién le vende, en qué idioma y en qué mercado.
 *
 * Volver a preguntárselo sería tratarle como si no nos hubiera contado nada, y
 * eso es exactamente lo que se supone que NELVYON evita: el cliente contrata
 * para no tener que ser el experto.
 *
 * ── LOS HUECOS SE NOMBRAN ───────────────────────────────────────────────────
 *
 * Lo que no consta va en `huecos`, con su nombre. Un brief que calla lo que no
 * sabe invita a rellenarlo, y una dirección creativa inventada se parece
 * demasiado a una decidida.
 *
 * ── NO TODOS LOS SERVICIOS LO NECESITAN ─────────────────────────────────────
 *
 * Una integración de APIs no tiene dirección visual. Obligar a todos los
 * servicios a traer un brief visual llenaría de campos vacíos los que no lo
 * usan, y un formulario con campos que no importan enseña a rellenarlo a boleo.
 */
import type { Cerebro } from "../cerebro/CerebroDeNegocioService";

/**
 * Los servicios que producen algo que SE VE, y por qué.
 *
 * Cada entrada dice qué se ve. Una lista sin motivos crece sola hasta incluirlo
 * todo, y entonces deja de decidir nada.
 */
export const SERVICIOS_CON_BRIEF_VISUAL: Readonly<Record<string, string>> = {
  // ── Lo que se ve en pantalla ─────────────────────────────────────────────
  web_premium: "un sitio entero: composición, tipografía, color y jerarquía",
  landing_premium: "una página cuya única misión es que alguien haga una cosa",
  mantenimiento_web_premium: "cambios sobre un diseño existente que hay que respetar",
  ecommerce_premium: "fichas de producto y categorías donde la foto vende",
  funnel_premium: "las páginas del embudo, que se generan como HTML real",

  // ── Lo que ES una pieza visual ───────────────────────────────────────────
  branding_premium: "la identidad: es el caso donde el brief visual ES el encargo",
  diseno_grafico_creatividades_premium: "piezas gráficas, una por una",
  fotografia_producto_premium: "las fotos del producto: luz, fondo, encuadre",
  video_multimedia_premium: "guion visual, planos y montaje",
  "3d_contenido_inmersivo_premium": "modelado y escena; el estilo lo decide todo",

  // ── Lo que se publica con una imagen al lado ─────────────────────────────
  social_media_premium: "cada red pide un formato y un lenguaje visual distinto",
  ads_premium: "las creatividades, que es lo que la gente ve del anuncio",
  influencer_marketing_premium: "lo que un tercero publica en nombre de la marca",
  personal_digital_premium: "la imagen de una persona, que es el producto",
  email_marketing_premium: "plantillas y cabeceras: el correo también se mira",
};

/**
 * Servicios que NO lo llevan, con su motivo.
 *
 * Está escrito para poder discutirlo. Si mañana uno de éstos produce algo que
 * se ve, se mueve arriba y se dice por qué.
 */
export const SIN_BRIEF_VISUAL_A_PROPOSITO: Readonly<Record<string, string>> = {
  seo_premium: "produce estrategia y contenido; lo que se ve lo decide la web",
  contenido_copywriting_premium: "produce texto; el continente es de otro servicio",
  integraciones_apis_premium: "no produce nada que mire una persona",
  consultoria_automatizacion_premium: "procesos internos, sin superficie visible",
  bots_premium: "conversación; el aspecto lo pone el sitio donde vive el bot",
  voz_premium: "audio: no tiene dirección visual",
  formacion_capacitacion_digital_premium: "materiales formativos, sin identidad propia",
  advisor_empresarial_premium: "asesoría; el entregable es un documento de decisión",
  analitica_atribucion_premium: "medición; los cuadros los pinta la herramienta",
  inteligencia_mercado_premium: "investigación, no producción",
  crm_captacion_premium: "flujos y datos, sin pieza visual",
  geo_ai_search_premium: "visibilidad en respuestas de IA: es texto y entidad",
  reputacion_online_orm_premium: "respuestas y relaciones, no piezas",
  canales_comunicaciones_premium: "infraestructura de canales",
};

export function necesitaBriefVisual(serviceId: string): boolean {
  return serviceId in SERVICIOS_CON_BRIEF_VISUAL;
}

/** Lo que se sabe del aspecto que debe tener lo que se produzca. */
export interface BriefVisual {
  /** Identidad y cómo suena la marca. */
  marca: string | null;
  vozDeMarca: string | null;
  /** Lo que la marca NO hace. Es la restricción que más se salta un modelo. */
  loQueNoHace: string[];
  /** Contra quién se compara visualmente. */
  competidores: string[];
  /** Material que ya existe y hay que usar en vez de inventar. */
  activos: string[];
  /** Piezas anteriores: lo que ya se hizo para esta marca. */
  creatividadesPrevias: string[];
  /** Dónde se va a ver. Una valla y una historia de Instagram no son lo mismo. */
  dondeSeVaAVer: string[];
  /** A quién le habla. */
  publico: string | null;
  /** Qué le hace distinto: es lo que la pieza tiene que transmitir. */
  diferenciacion: string | null;
  idioma: string | null;
  mercado: string | null;

  /** Lo que NO consta, por su nombre. */
  huecos: string[];
  /** `true` si falta algo sin lo que la dirección creativa sería una invención. */
  faltaLoImprescindible: boolean;
}

/** Dimensiones del cerebro que alimentan el brief, y qué campo llenan. */
const DEL_CEREBRO: ReadonlyArray<{
  dimension: string;
  campo: keyof BriefVisual;
  forma: "texto" | "lista";
  /** Sin esto la dirección creativa sería una invención, no una decisión. */
  imprescindible: boolean;
}> = [
  { dimension: "marca", campo: "marca", forma: "texto", imprescindible: true },
  { dimension: "brand_voice", campo: "vozDeMarca", forma: "texto", imprescindible: true },
  { dimension: "lo_que_la_marca_no_hace", campo: "loQueNoHace", forma: "lista", imprescindible: false },
  { dimension: "competidores", campo: "competidores", forma: "lista", imprescindible: false },
  { dimension: "activos", campo: "activos", forma: "lista", imprescindible: false },
  { dimension: "creatividades", campo: "creatividadesPrevias", forma: "lista", imprescindible: false },
  { dimension: "donde_se_usa_esto", campo: "dondeSeVaAVer", forma: "lista", imprescindible: false },
  { dimension: "icp", campo: "publico", forma: "texto", imprescindible: true },
  { dimension: "propuesta_de_valor", campo: "diferenciacion", forma: "texto", imprescindible: true },
  { dimension: "idioma", campo: "idioma", forma: "texto", imprescindible: false },
  { dimension: "mercado", campo: "mercado", forma: "texto", imprescindible: false },
];

function textoDe(cerebro: Cerebro, id: string): string | null {
  if (cerebro.caducadas.includes(id)) return null;
  const v = cerebro.dimensiones.get(id)?.valor as { texto?: unknown } | undefined;
  const t = typeof v?.texto === "string" ? v.texto.trim() : "";
  return t.length > 0 ? t : null;
}

function listaDe(cerebro: Cerebro, id: string): string[] {
  if (cerebro.caducadas.includes(id)) return [];
  const v = cerebro.dimensiones.get(id)?.valor as { items?: unknown } | undefined;
  if (!Array.isArray(v?.items)) return [];
  return v.items.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

/**
 * Compone el brief visual con lo que NELVYON ya sabe del cliente.
 *
 * Sin cerebro devuelve un brief vacío con TODOS los huecos nombrados. No
 * devuelve `null`: un brief ausente se lee como «no había restricciones», y ése
 * es el peor mensaje posible para una marca con reglas.
 */
export function componerBriefVisual(cerebro: Cerebro | null): BriefVisual {
  const brief: BriefVisual = {
    marca: null,
    vozDeMarca: null,
    loQueNoHace: [],
    competidores: [],
    activos: [],
    creatividadesPrevias: [],
    dondeSeVaAVer: [],
    publico: null,
    diferenciacion: null,
    idioma: null,
    mercado: null,
    huecos: [],
    faltaLoImprescindible: false,
  };

  for (const d of DEL_CEREBRO) {
    const valor = cerebro
      ? d.forma === "texto"
        ? textoDe(cerebro, d.dimension)
        : listaDe(cerebro, d.dimension)
      : d.forma === "texto"
        ? null
        : [];

    const vacio = valor === null || (Array.isArray(valor) && valor.length === 0);
    if (vacio) {
      brief.huecos.push(d.dimension);
      if (d.imprescindible) brief.faltaLoImprescindible = true;
      continue;
    }
    // El campo y la forma van declarados juntos, así que la asignación es
    // correcta por construcción; TypeScript no puede seguir esa correlación.
    (brief as unknown as Record<string, unknown>)[d.campo] = valor;
  }

  return brief;
}

/**
 * El brief, en el texto que se le pone delante a quien produce la pieza.
 *
 * Los huecos van escritos y con instrucción explícita de no rellenarlos. Es la
 * misma regla que `contextoDeNegocio`, y por el mismo motivo: un hueco callado
 * invita a inventarlo, y un color de marca inventado se publica.
 */
export function briefVisualComoTexto(brief: BriefVisual): string {
  const partes: string[] = [];

  const linea = (etiqueta: string, valor: string | string[] | null): void => {
    if (valor === null || (Array.isArray(valor) && valor.length === 0)) return;
    partes.push(`- ${etiqueta}: ${Array.isArray(valor) ? valor.join("; ") : valor}`);
  };

  linea("Marca", brief.marca);
  linea("Cómo habla", brief.vozDeMarca);
  linea("A quién le habla", brief.publico);
  linea("Qué le hace distinto", brief.diferenciacion);
  linea("Se va a ver en", brief.dondeSeVaAVer);
  linea("Material que ya existe", brief.activos);
  linea("Piezas anteriores", brief.creatividadesPrevias);
  linea("Compite visualmente con", brief.competidores);
  linea("Idioma", brief.idioma);
  linea("Mercado", brief.mercado);

  if (brief.loQueNoHace.length > 0) {
    partes.push(
      "- LO QUE LA MARCA NO HACE, y no se salta por una idea mejor: "
        + brief.loQueNoHace.join("; "),
    );
  }

  const cabecera = partes.length > 0
    ? "### BRIEF VISUAL — lo que NELVYON sabe de esta marca\n" + partes.join("\n")
    : "### BRIEF VISUAL\nNo hay ningún dato visual registrado de este cliente.";

  if (brief.huecos.length === 0) return cabecera;

  return (
    cabecera
    + "\n\n### LO QUE NO SE SABE\n"
    + "No consta: "
    + brief.huecos.join(", ")
    + ".\nNO lo inventes. Si una decisión visual depende de algo de esta lista, "
    + "dilo y pídelo en vez de suponerlo."
  );
}
