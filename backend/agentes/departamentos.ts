/**
 * LOS DEPARTAMENTOS DE LA AGENCIA.
 *
 * Un departamento aquí no es una etiqueta: es una RESPONSABILIDAD con dueño.
 * Declara qué decide, qué NO decide, de qué otro departamento depende y con qué
 * se le mide.
 *
 * LA REGLA QUE GOBIERNA ESTE FICHERO: no hay departamentos vacíos. Uno
 * declarado sin ningún agente que lo habite es un organigrama de presentación,
 * y `losDepartamentosNoEstanVacios.test.ts` lo pone en rojo.
 *
 * Por eso cada uno lleva `estado`:
 *
 *   `operativo`  tiene al menos un agente con contrato. Existe de verdad.
 *   `planeado`   sabemos qué haría y por qué hace falta, y NO tiene agentes
 *                todavía. Es una promesa escrita, no una capacidad.
 *
 * La diferencia importa porque un organigrama donde no se distinguen las dos
 * cosas es exactamente cómo NELVYON acabó con 23 especialistas «diseñados» que
 * nadie había instanciado.
 */

export type EstadoDeDepartamento = "operativo" | "planeado";

export interface Departamento {
  id: string;
  nombre: string;
  /** Qué decide. Una frase; si hacen falta tres, es más de un departamento. */
  responsabilidad: string;
  /** Qué NO decide. Evita que dos departamentos se peleen por lo mismo. */
  noDecide: string;
  /** De qué depende para poder trabajar. Vacío = no depende de nadie. */
  dependeDe: readonly string[];
  /** Con qué se mide su trabajo. Sin esto no se puede saber si va bien. */
  kpis: readonly string[];
  estado: EstadoDeDepartamento;
  /** Si está planeado, por qué todavía no. Obligatorio: sin motivo es humo. */
  motivoSiPlaneado?: string;
}

export const DEPARTAMENTOS: readonly Departamento[] = [
  // ── Dirección ────────────────────────────────────────────────────────────
  {
    id: "estrategia",
    nombre: "Estrategia",
    responsabilidad: "Decide qué se hace por este cliente y en qué orden, a partir de sus objetivos.",
    noDecide: "Cómo se ejecuta cada pieza; eso es de cada especialista.",
    dependeDe: [],
    kpis: ["objetivos con plan asignado", "planes revisados tras medir resultados"],
    estado: "operativo",
  },
  {
    id: "customer_success",
    nombre: "Customer Success",
    responsabilidad:
      "Detecta lo que se está atascando —onboarding, conexiones, aprobaciones, entregas— antes de que el cliente lo note.",
    noDecide: "Qué trabajo se hace; sólo que el trabajo que hay pueda avanzar.",
    dependeDe: ["estrategia"],
    kpis: ["días hasta el primer entregable", "señales bloqueantes abiertas", "igualas incumplidas"],
    estado: "operativo",
  },
  {
    id: "qa",
    nombre: "QA independiente",
    responsabilidad: "Decide si algo puede salir. Es independiente de quien lo produjo.",
    noDecide: "Cómo arreglarlo; devuelve el motivo, no la solución.",
    dependeDe: [],
    kpis: ["entregables bloqueados por QA", "defectos detectados tras publicar"],
    estado: "operativo",
  },
  {
    id: "compliance",
    nombre: "Cumplimiento",
    responsabilidad:
      "Decide qué NO se puede afirmar en cada sector, y qué descargos son obligatorios.",
    noDecide: "El mensaje; sólo sus límites.",
    dependeDe: [],
    kpis: ["afirmaciones prohibidas detectadas", "entregables con descargo correcto"],
    estado: "operativo",
  },
  {
    id: "operaciones",
    nombre: "Operaciones",
    responsabilidad: "Que el trabajo encolado se ejecute, se reintente y no se pierda.",
    noDecide: "Qué trabajo entra en la cola.",
    dependeDe: [],
    kpis: ["trabajos en dead_letter", "tiempo medio en cola", "trabajos rescatados"],
    estado: "operativo",
  },

  // ── Conocimiento del mercado ─────────────────────────────────────────────
  {
    id: "inteligencia_mercado",
    nombre: "Inteligencia de mercado",
    responsabilidad: "Qué está pasando en el sector del cliente y qué buscan sus compradores.",
    noDecide: "Qué se hace con ello.",
    dependeDe: [],
    kpis: ["hallazgos que cambiaron un plan"],
    estado: "planeado",
    motivoSiPlaneado:
      "Necesita fuentes de datos de mercado que hoy no están conectadas; sin ellas produciría opinión, no inteligencia.",
  },
  {
    id: "inteligencia_competencia",
    nombre: "Inteligencia competitiva",
    responsabilidad: "Qué hacen los competidores del cliente y dónde tienen huecos.",
    noDecide: "Cómo atacarlos.",
    dependeDe: ["inteligencia_mercado"],
    kpis: ["huecos identificados que se convirtieron en acción"],
    estado: "planeado",
    motivoSiPlaneado:
      "El cerebro ya guarda `competidores`, pero nada los analiza todavía; instanciarlo sin análisis sería un departamento vacío con nombre.",
  },

  // ── Marca y creatividad ──────────────────────────────────────────────────
  {
    id: "marca",
    nombre: "Marca",
    responsabilidad: "Cómo suena y cómo se ve el cliente, de forma coherente en todo lo que sale.",
    noDecide: "Qué se publica y cuándo.",
    dependeDe: ["estrategia"],
    kpis: ["entregables coherentes con la voz declarada"],
    estado: "operativo",
  },
  {
    id: "creatividad",
    nombre: "Creatividad",
    responsabilidad: "Las piezas visuales: anuncios, imágenes, vídeo, diseño.",
    noDecide: "El mensaje; eso es de copy.",
    dependeDe: ["marca", "estrategia"],
    kpis: ["creatividades producidas", "rendimiento por creatividad"],
    estado: "operativo",
  },
  {
    id: "copy",
    nombre: "Copywriting",
    responsabilidad: "Lo que se dice: titulares, textos, guiones, correos.",
    noDecide: "Dónde se dice.",
    dependeDe: ["marca", "estrategia"],
    kpis: ["textos aprobados a la primera", "conversión de las piezas escritas"],
    estado: "operativo",
  },
  {
    id: "contenido",
    nombre: "Contenido",
    responsabilidad: "Qué se publica, sobre qué y con qué frecuencia.",
    noDecide: "El posicionamiento técnico; eso es de SEO.",
    dependeDe: ["estrategia", "copy"],
    kpis: ["piezas publicadas", "tráfico por pieza"],
    estado: "operativo",
  },

  // ── Búsqueda ─────────────────────────────────────────────────────────────
  {
    id: "seo",
    nombre: "SEO",
    responsabilidad: "Que encuentren al cliente cuando buscan lo que vende.",
    noDecide: "Qué se escribe; define qué hace falta escribir.",
    dependeDe: ["estrategia"],
    kpis: ["visibilidad", "posiciones ganadas", "tráfico orgánico"],
    estado: "operativo",
  },
  {
    id: "seo_tecnico",
    nombre: "SEO técnico",
    responsabilidad: "Que la web se pueda rastrear, indexar y cargar rápido.",
    noDecide: "El contenido.",
    dependeDe: ["seo"],
    kpis: ["errores de rastreo", "páginas indexadas", "velocidad"],
    estado: "operativo",
  },
  {
    id: "seo_local",
    nombre: "SEO local",
    responsabilidad: "Que le encuentren quien está cerca y busca ahora.",
    noDecide: "La estrategia nacional.",
    dependeDe: ["seo"],
    kpis: ["visibilidad en el mapa", "acciones desde la ficha"],
    estado: "operativo",
  },
  {
    id: "geo_ai_search",
    nombre: "Visibilidad en buscadores de IA",
    responsabilidad:
      "Que los asistentes de IA citen al cliente cuando alguien pregunta por lo que vende.",
    noDecide: "El SEO clásico, aunque comparta materia prima.",
    dependeDe: ["seo", "contenido"],
    kpis: ["menciones en respuestas de IA", "señales de entidad reconocidas"],
    estado: "planeado",
    motivoSiPlaneado:
      "Medir visibilidad en respuestas de IA exige consultar modelos de terceros de forma repetida, y eso genera coste externo que hoy no está autorizado.",
  },

  // ── Medios de pago ───────────────────────────────────────────────────────
  {
    id: "paid_media",
    nombre: "Medios de pago",
    responsabilidad: "Dónde y cuánto se invierte para conseguir el objetivo.",
    noDecide: "El presupuesto total; ése lo pone el cliente.",
    dependeDe: ["estrategia", "creatividad", "copy"],
    kpis: ["CPA", "ROAS", "presupuesto ejecutado sobre autorizado"],
    estado: "operativo",
  },

  // ── Canales ──────────────────────────────────────────────────────────────
  {
    id: "social",
    nombre: "Social media",
    responsabilidad: "Presencia y conversación en las redes donde están sus clientes.",
    noDecide: "La inversión en anuncios; eso es de medios de pago.",
    dependeDe: ["contenido", "marca"],
    kpis: ["alcance", "interacción", "tiempo de respuesta a comentarios"],
    estado: "operativo",
  },
  {
    id: "email_lifecycle",
    nombre: "Email y ciclo de vida",
    responsabilidad: "Qué se le dice a cada contacto según en qué momento está.",
    noDecide: "Quién entra en la base; eso es de captación.",
    dependeDe: ["crm", "copy"],
    kpis: ["entregabilidad", "apertura", "conversión por secuencia", "bajas"],
    estado: "operativo",
  },
  {
    id: "reputacion",
    nombre: "Reputación",
    responsabilidad: "Qué se dice del cliente y cómo se responde.",
    noDecide: "El producto que genera esas opiniones.",
    dependeDe: ["marca"],
    kpis: ["valoración media", "reseñas respondidas", "tiempo de respuesta"],
    estado: "operativo",
  },

  // ── Comercial ────────────────────────────────────────────────────────────
  {
    id: "crm",
    nombre: "CRM",
    responsabilidad: "Que ningún contacto se pierda y que cada uno esté donde le toca.",
    noDecide: "Qué se le dice.",
    dependeDe: [],
    kpis: ["contactos sin dueño", "duplicados", "tiempo hasta el primer contacto"],
    estado: "operativo",
  },
  {
    id: "captacion",
    nombre: "Captación",
    responsabilidad: "Conseguir contactos cualificados.",
    noDecide: "Cerrar la venta ni gestionar el trato una vez el contacto entra.",
    dependeDe: ["estrategia", "paid_media", "seo"],
    kpis: ["leads", "leads cualificados", "coste por lead cualificado"],
    estado: "operativo",
  },
  {
    id: "cro",
    nombre: "CRO y experimentación",
    responsabilidad: "Que de las visitas que ya hay salgan más clientes.",
    noDecide: "Traer más visitas.",
    dependeDe: ["analitica", "contenido"],
    kpis: ["experimentos concluidos", "mejora de conversión demostrada"],
    estado: "operativo",
  },
  {
    id: "funnels",
    nombre: "Embudos y landing",
    responsabilidad: "El camino desde el clic hasta la conversión.",
    noDecide: "El tráfico que entra.",
    dependeDe: ["cro", "copy", "creatividad"],
    kpis: ["conversión del embudo", "abandono por paso"],
    estado: "operativo",
  },

  // ── Producto digital ─────────────────────────────────────────────────────
  {
    id: "web",
    nombre: "Web",
    responsabilidad: "Que la web exista, funcione y se pueda cambiar.",
    noDecide: "Qué dice la web ni cómo se posiciona; eso es de copy y de SEO.",
    dependeDe: ["marca"],
    kpis: ["disponibilidad", "velocidad", "incidencias"],
    estado: "operativo",
  },
  {
    id: "ecommerce",
    nombre: "E-commerce",
    responsabilidad: "Que el catálogo venda: fichas, búsqueda, carrito, pago.",
    noDecide: "El precio ni el surtido.",
    dependeDe: ["web", "cro"],
    kpis: ["conversión", "ticket medio", "abandono de carrito"],
    estado: "operativo",
  },

  // ── Medición ─────────────────────────────────────────────────────────────
  {
    id: "analitica",
    nombre: "Analítica y atribución",
    responsabilidad: "Saber qué pasó de verdad y a qué se debió.",
    noDecide: "Qué hacer con ello.",
    dependeDe: [],
    kpis: ["objetivos con línea base", "acciones con resultado atribuido"],
    estado: "operativo",
  },
  {
    id: "reporting",
    nombre: "Informes",
    responsabilidad: "Contarle al cliente qué se ha hecho y qué ha producido.",
    noDecide: "Los números; los toma de analítica sin retocarlos.",
    dependeDe: ["analitica"],
    kpis: ["informes entregados a tiempo", "informes con resultado medido"],
    estado: "operativo",
  },

  // ── La agencia vendiéndose a sí misma ────────────────────────────────────
  //
  // Estos tres no trabajan PARA un cliente: trabajan para que NELVYON tenga
  // clientes. Es una distinción que el organigrama no hacía y que importa,
  // porque `captacion` capta para el cliente y esto capta para la casa. Meter
  // las dos cosas en el mismo departamento haría que nadie supiera de quién es
  // el embudo del que se habla.
  {
    id: "ventas",
    nombre: "Ventas",
    responsabilidad:
      "Llevar a una empresa desde que oye hablar de NELVYON hasta que firma, con un motivo propio para cada contacto.",
    noDecide: "Qué se le hará una vez firme; eso es de estrategia.",
    dependeDe: ["inteligencia_mercado"],
    kpis: [
      "contactos preparados con motivo propio",
      "conversaciones abiertas",
      "propuestas aceptadas",
      "bajas solicitadas",
    ],
    estado: "operativo",
  },
  {
    id: "comunidad",
    nombre: "Comunidad",
    responsabilidad:
      "Sostener la conversación con quien ya sigue al cliente: responder, moderar y detectar lo que se repite.",
    noDecide: "Qué se publica; eso es de contenido y social.",
    dependeDe: ["social", "reputacion"],
    kpis: ["tiempo hasta la primera respuesta", "conversaciones sin responder", "temas recurrentes detectados"],
    estado: "planeado",
    motivoSiPlaneado:
      "Responder en nombre del cliente en sus redes exige credenciales de publicación y una autorización que hoy no existe. El departamento se declara para que el trabajo tenga dueño cuando llegue, no para aparentar que ya se hace.",
  },
  {
    id: "growth",
    nombre: "Growth",
    responsabilidad:
      "Buscar la palanca que mueve el negocio del cliente ahora, mirando el embudo entero en vez de un canal.",
    noDecide: "Ejecutar la palanca; la propone y la mide, la hace el especialista.",
    dependeDe: ["analitica", "estrategia", "cro"],
    kpis: ["palancas propuestas con hipótesis medible", "palancas con efecto demostrado"],
    estado: "planeado",
    motivoSiPlaneado:
      "Necesita series históricas de varios canales a la vez, y hoy el motor de resultados sólo tiene medidas de las últimas semanas. Sin histórico, cualquier palanca que propusiera sería una corazonada con formato de análisis.",
  },
] as const;

const POR_ID = new Map(DEPARTAMENTOS.map((d) => [d.id, d]));

export function departamento(id: string): Departamento | null {
  return POR_ID.get(id) ?? null;
}

export function esDepartamentoConocido(id: string): boolean {
  return POR_ID.has(id);
}

export function departamentosOperativos(): Departamento[] {
  return DEPARTAMENTOS.filter((d) => d.estado === "operativo");
}

export function departamentosPlaneados(): Departamento[] {
  return DEPARTAMENTOS.filter((d) => d.estado === "planeado");
}

/**
 * Dependencias que apuntan a un departamento que no existe. Un organigrama con
 * una flecha hacia la nada es un organigrama que nadie puede seguir.
 */
export function dependenciasRotas(): Array<{ departamento: string; dependeDe: string }> {
  const rotas: Array<{ departamento: string; dependeDe: string }> = [];
  for (const d of DEPARTAMENTOS) {
    for (const dep of d.dependeDe) {
      if (!POR_ID.has(dep)) rotas.push({ departamento: d.id, dependeDe: dep });
    }
  }
  return rotas;
}

/**
 * Ciclos de dependencia. Dos departamentos que dependen el uno del otro no
 * pueden empezar: cada uno espera al otro y el trabajo no arranca nunca.
 */
export function ciclosDeDependencia(): string[][] {
  const ciclos: string[][] = [];
  const visitando = new Set<string>();
  const visitado = new Set<string>();

  const bajar = (id: string, camino: string[]): void => {
    if (visitando.has(id)) {
      ciclos.push([...camino.slice(camino.indexOf(id)), id]);
      return;
    }
    if (visitado.has(id)) return;
    visitando.add(id);
    for (const dep of POR_ID.get(id)?.dependeDe ?? []) {
      if (POR_ID.has(dep)) bajar(dep, [...camino, id]);
    }
    visitando.delete(id);
    visitado.add(id);
  };

  for (const d of DEPARTAMENTOS) bajar(d.id, []);
  return ciclos;
}
