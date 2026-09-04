/**
 * CINCO CLIENTES QUE NO SE PARECEN EN NADA.
 *
 * PARA QUÉ SIRVEN. Para contestar la única pregunta que decide si NELVYON hace
 * marketing o rellena plantillas:
 *
 *     ¿Le dice lo mismo a un restaurante de barrio que a un SaaS B2B?
 *
 * Si la respuesta es que sí, da igual cuántos agentes haya ni lo bien escritos
 * que estén: es un generador de documentos con el nombre del cliente puesto
 * arriba.
 *
 * CÓMO ESTÁN ELEGIDOS. No son cinco variaciones del mismo negocio: son cinco
 * negocios cuyas decisiones de marketing correctas se CONTRADICEN entre sí.
 *
 *   · el restaurante compite por proximidad; el SaaS por categoría global
 *   · el restaurante decide en minutos; el SaaS tarda nueve meses en firmar
 *   · la tienda vive del margen por pedido; la clínica de la confianza
 *   · la franquicia tiene el mismo problema en catorce sitios a la vez
 *
 * Un plan que sirva para dos de éstos a la vez está mal para al menos uno.
 *
 * Y LLEVAN RESTRICCIONES DE VERDAD, no adornos: un sector regulado que no puede
 * prometer resultados, un presupuesto que no da para el canal obvio, una marca
 * que prohíbe el humor, un histórico de haber probado algo y que saliera mal.
 * Son las que separan un consejo aplicable de uno de manual.
 */

export interface ClienteSintetico {
  id: string;
  /** Qué es, en la frase con la que se presentaría él. */
  quienEs: string;

  empresa: string;
  sector: string;
  ubicacion: string;

  /** Qué quiere conseguir. Distinto en cada uno, y a veces incompatible. */
  objetivo: string;
  /** Cuánto puede gastar al mes, en céntimos. Cambia el plan por completo. */
  presupuestoMensualCents: number;
  /** A quién le vende. */
  publico: string;
  /** Qué le hace distinto. */
  propuestaDeValor: string;
  /** Contra quién compite. */
  competidores: string[];
  /** Cómo suena. */
  vozDeMarca: string;
  /** Lo que NO puede hacer. Aquí se distingue el consejo aplicable. */
  restricciones: string[];
  /** Qué probó antes y qué pasó. Ignorarlo es repetir el error del anterior. */
  historial: string;

  /**
   * Las palabras que TIENEN que aparecer en un plan hecho para él.
   *
   * No es una lista de palabras clave de SEO: son los hechos que distinguen a
   * este cliente de los otros cuatro. Si un plan no los menciona, no se ha
   * hecho para él — se ha hecho para nadie.
   */
  hechosQueLoDistinguen: string[];
}

export const CLIENTES: readonly ClienteSintetico[] = [
  {
    id: "restaurante",
    quienEs: "Un restaurante de barrio con 40 mesas y sin sitio web decente",
    empresa: "Casa Manuela",
    sector: "restauración",
    ubicacion: "Lavapiés, Madrid",
    objetivo: "llenar de martes a jueves, que es cuando la sala está a medias",
    presupuestoMensualCents: 30_000, // 300 €/mes: no da para casi nada de pago
    publico: "vecinos del barrio y oficinistas de la zona a mediodía",
    propuestaDeValor: "cocina de mercado a precio de menú, sin carta congelada",
    competidores: ["tres bares de menú en la misma calle", "las cadenas de comida rápida"],
    vozDeMarca: "cercana, sin postureo, tuteando",
    restricciones: [
      "no tiene quien lleve redes a diario: como mucho dos publicaciones por semana",
      "300 € al mes no dan para campañas en varios canales",
      "no reparte a domicilio y no quiere empezar",
    ],
    historial: "probó una agencia que le hizo publicaciones bonitas y no llenó ni un martes",
    hechosQueLoDistinguen: ["Lavapiés", "martes", "menú", "barrio"],
  },
  {
    id: "saas_b2b",
    quienEs: "Un SaaS de gestión de flotas que vende a directores de operaciones",
    empresa: "Rutalia",
    sector: "software B2B",
    ubicacion: "Barcelona, vende en toda Europa",
    objetivo: "conseguir 20 demostraciones cualificadas al mes con empresas de más de 50 vehículos",
    presupuestoMensualCents: 1_200_000, // 12.000 €/mes
    publico: "directores de operaciones y de flota en logística y distribución",
    propuestaDeValor: "reduce un 18 % el coste por kilómetro con datos del propio vehículo",
    competidores: ["dos suites internacionales muy caras", "hojas de cálculo"],
    vozDeMarca: "técnica y directa, con datos; nada de exageraciones",
    restricciones: [
      "el ciclo de venta es de nueve meses: cualquier medición a treinta días engaña",
      "no puede hablar de precios en público por acuerdo con sus distribuidores",
      "sus clientes no están en redes sociales de consumo",
    ],
    historial: "gastó un año en publicidad de display sin una sola oportunidad cerrada",
    hechosQueLoDistinguen: ["flota", "demostracion", "nueve meses", "operaciones"],
  },
  {
    id: "ecommerce",
    quienEs: "Una tienda de suplementos deportivos con 400 referencias",
    empresa: "Nutrigo",
    sector: "comercio electrónico de suplementación",
    ubicacion: "vende a toda España desde Valencia",
    objetivo: "subir el valor medio del pedido sin bajar el margen",
    presupuestoMensualCents: 400_000, // 4.000 €/mes
    publico: "gente que entrena entre tres y cinco veces por semana, de 25 a 45",
    propuestaDeValor: "envío en 24 h y devolución sin preguntas",
    competidores: ["dos gigantes del sector con precios más bajos", "marcas propias de gimnasios"],
    vozDeMarca: "motivadora pero honesta; nada de promesas de resultados",
    restricciones: [
      "SECTOR REGULADO: no puede atribuir propiedades curativas ni prometer resultados físicos",
      "el margen medio es del 22 %: un coste por pedido alto se come el beneficio",
      "no puede usar antes y después con personas",
    ],
    historial: "los descuentos agresivos subieron ventas y hundieron el margen dos trimestres",
    hechosQueLoDistinguen: ["margen", "pedido", "suplement", "22"],
  },
  {
    id: "franquicia",
    quienEs: "Una franquicia de clínicas dentales con catorce centros",
    empresa: "Dentalia",
    sector: "salud dental",
    ubicacion: "catorce clínicas en seis provincias",
    objetivo: "que cada clínica llene su agenda sin quitarle pacientes a la de al lado",
    presupuestoMensualCents: 2_500_000, // 25.000 €/mes repartidos
    publico: "familias de la zona de cada clínica, y adultos para tratamientos de estética",
    propuestaDeValor: "mismo protocolo y mismos precios en las catorce, sin sorpresas",
    competidores: ["clínicas independientes de barrio", "dos cadenas grandes que hacen mucha publicidad"],
    vozDeMarca: "seria y tranquilizadora; el humor está prohibido por manual de marca",
    restricciones: [
      "SECTOR SANITARIO: la publicidad sanitaria tiene normas propias y no se puede prometer un resultado",
      "cada clínica tiene su propio número de colegiado y su ficha de Google",
      "el manual de marca prohíbe el humor y las comparaciones directas",
      "dos clínicas están a 4 km: si compiten por lo mismo, se canibalizan",
    ],
    historial: "una campaña nacional única hizo que dos centros se quedaran vacíos y otro se colapsara",
    hechosQueLoDistinguen: ["catorce", "clínica", "provincia", "colegiado"],
  },
  {
    /**
     * LA MARCA PERSONAL DE ALTO TICKET.
     *
     * Existe porque contradice a los otros cinco en lo que más importa: aquí el
     * producto es una persona. No se puede escalar el volumen —hay una agenda y
     * una sola boca— así que todo consejo de «más tráfico, más leads» es
     * exactamente el consejo equivocado. Lo que necesita es MENOS gente y mejor
     * cualificada.
     *
     * Un plan que le proponga captación masiva está copiado del restaurante.
     */
    id: "marca_personal",
    quienEs: "Un consultor de operaciones que factura por proyectos de 30.000 €",
    empresa: "Íñigo Salvatierra",
    sector: "consultoría de operaciones industriales",
    ubicacion: "Bilbao, trabaja en toda Europa",
    objetivo:
      "menos llamadas y mejores: cerrar cuatro proyectos grandes al año en vez de perseguir veinte pequeños",
    presupuestoMensualCents: 200_000, // 2.000 €/mes
    publico: "directores de planta y de operaciones en industria manufacturera",
    propuestaDeValor:
      "veinte años arreglando plantas que iban mal; se paga por el criterio, no por las horas",
    competidores: ["las cuatro grandes consultoras", "consultores independientes más baratos"],
    vozDeMarca: "directa y sin adornos; habla de plantas y de números, no de transformación digital",
    restricciones: [
      "NO ESCALA: hay una agenda y una persona; más volumen no es mejor",
      "no puede nombrar clientes: sus contratos llevan confidencialidad",
      "no publica precios: cada proyecto se cotiza",
      "no quiere aparecer como «coach» ni como «mentor»",
    ],
    historial:
      "una campaña de captación con lead magnet trajo 300 descargas y ninguna llamada de un director de planta",
    hechosQueLoDistinguen: ["planta", "operaciones", "industrial", "proyecto"],
  },
  {
    id: "despacho",
    quienEs: "Un despacho de abogados laboralistas de tres socios",
    empresa: "Vega & Asociados",
    sector: "servicios jurídicos",
    ubicacion: "Sevilla",
    objetivo: "que les lleguen despidos improcedentes en vez de consultas gratis",
    presupuestoMensualCents: 150_000, // 1.500 €/mes
    publico: "trabajadores despedidos y pequeñas empresas con conflictos laborales",
    propuestaDeValor: "primera consulta clara sobre si hay caso, sin vender humo",
    competidores: ["dos despachos grandes con mucha publicidad", "plataformas que dan consulta gratis"],
    vozDeMarca: "sobria y precisa; nada de urgencia artificial ni alarmismo",
    restricciones: [
      "COLEGIO DE ABOGADOS: la publicidad de servicios jurídicos tiene límites deontológicos",
      "no puede garantizar el resultado de un procedimiento",
      "no quiere consultas gratuitas: son el 80 % de lo que entra y no convierten",
    ],
    historial:
      "un formulario de consulta gratuita trajo 200 contactos al mes y ni un solo encargo pagado",
    hechosQueLoDistinguen: ["despido", "laboral", "Sevilla", "consulta"],
  },
];

/**
 * La carga útil con la que se llama a un agente, para un cliente concreto.
 *
 * Los nombres de campo son los que los agentes premium leen de verdad
 * (`eliteCommonIntakeStrings` y compañía). Inventarse nombres produciría una
 * medición limpia sobre datos que el agente nunca ve.
 */
export function cargaDe(c: ClienteSintetico): Record<string, unknown> {
  return {
    clientName: c.empresa,
    businessName: c.empresa,
    industry: c.sector,
    sector: c.sector,
    location: c.ubicacion,
    targetAudience: c.publico,
    mainGoal: c.objetivo,
    campaignGoal: c.objetivo,
    businessGoal: c.objetivo,
    uniqueValue: c.propuestaDeValor,
    usp: c.propuestaDeValor,
    competitors: c.competidores,
    brandVoice: c.vozDeMarca,
    tone: c.vozDeMarca,
    constraints: c.restricciones,
    restrictions: c.restricciones,
    history: c.historial,
    pastResults: c.historial,
    monthlyBudget: Math.round(c.presupuestoMensualCents / 100),
    budget: Math.round(c.presupuestoMensualCents / 100),
    currentWebsiteUrl: `https://${c.id}-ejemplo.test`,
    websiteUrl: `https://${c.id}-ejemplo.test`,
    targetKeywords: c.hechosQueLoDistinguen,
    platforms: ["google", "meta"],
    postFrequency: "2 por semana",
    contentStyle: c.vozDeMarca,
    products: [c.propuestaDeValor],
    services: [c.propuestaDeValor],
    tenantId: `sintetico-${c.id}`,
    clientId: `sintetico-${c.id}`,
  };
}

/**
 * Una variante del mismo cliente con UNA sola cosa cambiada.
 *
 * Es la prueba contrafactual: si sólo cambia el presupuesto, el plan tiene que
 * cambiar donde el presupuesto manda —y no en el resto—. Cambiar una variable y
 * que no cambie nada significa que esa variable no se está usando; cambiarla y
 * que cambie todo significa que no se está razonando, se está regenerando.
 */
export function variante(
  c: ClienteSintetico,
  cambio: Partial<ClienteSintetico>,
): ClienteSintetico {
  return { ...c, ...cambio };
}
