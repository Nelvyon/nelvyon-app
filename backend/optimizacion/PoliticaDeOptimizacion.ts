/**
 * QUÉ SE MIRA, QUÉ SE PUEDE CAMBIAR, Y CUÁNDO HAY QUE PARAR.
 *
 * LO QUE ESTE FICHERO ES. Una política de optimización por disciplina: qué
 * métrica manda, a partir de qué variación merece la pena actuar, qué palancas
 * existen, cuáles se pueden mover solas y cuáles exigen que alguien diga que sí.
 *
 * LO QUE **NO** ES. No es un motor que decida: eso es
 * `MotorDeOptimizacion.ts`. Aquí sólo está el conocimiento de dominio, separado
 * a propósito, porque cambiar «cuánto tiene que caer el ROAS para tocar algo»
 * no debería obligar a tocar la lógica de decisión.
 *
 * POR QUÉ LOS UMBRALES NO SON REDONDOS. Cada uno sale de lo que la disciplina
 * exige, y está escrito al lado. Un umbral inventado hace una de dos cosas: o
 * reacciona a ruido —y entonces el sistema se pasa el día cambiando cosas y
 * ninguna llega a medirse— o no reacciona nunca, y entonces no optimiza.
 *
 * LA REGLA QUE GOBIERNA TODO: NO SE ACTÚA SIN SABER. Un dato insuficiente NO es
 * un «no ha cambiado nada»: es que no se sabe. Y actuar sobre lo que no se sabe
 * es exactamente cómo un cliente acaba pagando por movimientos que nadie puede
 * justificar.
 */

/** Qué se le puede hacer a una campaña, un contenido o una página. */
export interface Palanca {
  id: string;
  /** Qué se cambia, en una frase que el cliente entendería. */
  que: string;
  /**
   * Consecuencias reales de moverla. Las mismas del catálogo de autonomía:
   * es lo que decide si puede hacerse sola o necesita una persona.
   */
  consecuencias: readonly string[];
  /**
   * Cuánto tarda en poder medirse el efecto. Mover una palanca y mirar al día
   * siguiente no mide nada: mide ruido.
   */
  diasHastaPoderMedir: number;
}

export interface PoliticaDeDisciplina {
  disciplina: string;
  /** Los servicios a los que aplica. Derivado, no una lista suelta. */
  servicios: readonly string[];

  /** La métrica que manda. Si sólo pudieras mirar una, sería ésta. */
  metricaPrincipal: string;
  /**
   * Las que la acompañan y pueden contradecirla.
   *
   * Son las importantes: si el tráfico sube y las ventas bajan, mirar sólo el
   * tráfico diría que va bien. Una contradicción entre estas dos NO se resuelve
   * eligiendo la que conviene.
   */
  metricasQueVigilan: readonly string[];

  /**
   * Variación mínima, en porcentaje, para que merezca la pena moverse.
   *
   * Por debajo de esto es ruido. Y reaccionar al ruido no es optimizar: es
   * cambiar cosas cada semana sin dejar que ninguna llegue a medirse.
   */
  variacionMinimaPct: number;

  /** Cuánta muestra hace falta para que la medición signifique algo. */
  muestraMinima: { que: string; minimo: number };

  /** Cuánto tiene que caer para considerarlo un problema, no una fluctuación. */
  caidaPreocupantePct: number;

  palancas: readonly Palanca[];

  /**
   * Qué hipótesis se pueden plantear cuando la cosa va mal. Se declaran aquí
   * para que la propuesta salga de la disciplina y no de la improvisación.
   */
  hipotesis: readonly string[];

  /** Cuándo hay que dejar de intentarlo y hablar con una persona. */
  cuandoEscalar: readonly string[];
}

/**
 * Las políticas, por disciplina.
 *
 * Son ocho, no veinticinco: la optimización se parece mucho más entre servicios
 * de la misma disciplina que entre disciplinas. Un servicio de fotografía y uno
 * de diseño se optimizan igual —por rendimiento de la pieza—; uno de anuncios y
 * uno de SEO no se parecen en nada.
 */
export const POLITICAS: readonly PoliticaDeDisciplina[] = [
  {
    disciplina: "paid_media",
    servicios: ["ads_premium"],
    metricaPrincipal: "coste_por_adquisicion",
    // El coste por adquisición sube porque suben las pujas o porque baja la
    // conversión. Sin mirar las dos, se ajusta la puja cuando el problema
    // estaba en la página de destino.
    metricasQueVigilan: ["tasa_de_conversion", "impresiones", "ctr", "roas"],
    variacionMinimaPct: 10,
    // Menos de 30 conversiones y el coste por adquisición baila solo. Es el
    // mínimo con el que las plataformas dicen que su puja automática aprende.
    muestraMinima: { que: "conversiones en el periodo", minimo: 30 },
    caidaPreocupantePct: 25,
    palancas: [
      { id: "ajustar_puja", que: "subir o bajar la puja", consecuencias: ["gasta_dinero"], diasHastaPoderMedir: 7 },
      { id: "ajustar_presupuesto", que: "mover el presupuesto entre campañas", consecuencias: ["gasta_dinero"], diasHastaPoderMedir: 7 },
      { id: "anadir_negativas", que: "añadir palabras clave negativas", consecuencias: [], diasHastaPoderMedir: 14 },
      { id: "pausar_lo_que_no_funciona", que: "pausar el anuncio que peor va", consecuencias: ["gasta_dinero"], diasHastaPoderMedir: 7 },
      { id: "rotar_creatividad", que: "cambiar la creatividad", consecuencias: ["publica_en_nombre_del_cliente"], diasHastaPoderMedir: 14 },
    ],
    hipotesis: [
      "el coste sube porque la competencia ha entrado en la subasta",
      "el coste sube porque la página de destino ha empeorado su conversión",
      "el coste sube porque la creatividad se ha quemado y baja el CTR",
      "el coste sube porque entran búsquedas que no interesan",
    ],
    cuandoEscalar: [
      "el coste por adquisición supera el margen del cliente: cada venta pierde dinero",
      "el gasto se ha consumido antes de tiempo",
      "tres ciclos seguidos sin mejora",
    ],
  },
  {
    disciplina: "seo",
    servicios: ["seo_premium"],
    metricaPrincipal: "sesiones_organicas",
    metricasQueVigilan: ["posicion_media", "impresiones", "ctr_organico", "conversiones_organicas"],
    variacionMinimaPct: 15,
    muestraMinima: { que: "sesiones orgánicas mensuales", minimo: 200 },
    caidaPreocupantePct: 30,
    palancas: [
      { id: "reescribir_titulos", que: "reescribir títulos y descripciones", consecuencias: [], diasHastaPoderMedir: 28 },
      { id: "ampliar_contenido", que: "ampliar el contenido que ya posiciona", consecuencias: [], diasHastaPoderMedir: 45 },
      { id: "enlazado_interno", que: "reforzar el enlazado interno", consecuencias: [], diasHastaPoderMedir: 30 },
      { id: "arreglar_tecnico", que: "arreglar lo que impide rastrear o indexar", consecuencias: [], diasHastaPoderMedir: 21 },
      { id: "consolidar_canibalizacion", que: "unir páginas que compiten entre sí", consecuencias: ["es_irreversible"], diasHastaPoderMedir: 45 },
    ],
    hipotesis: [
      "las sesiones bajan porque ha cambiado el algoritmo, no la web",
      "las sesiones bajan por estacionalidad y no por nada que hayamos hecho",
      "las impresiones se mantienen y baja el CTR: el problema está en el título",
      "hay dos páginas compitiendo por la misma búsqueda",
      "algo ha dejado de indexarse",
    ],
    cuandoEscalar: [
      "la caída coincide con una actualización conocida del buscador",
      "hay una penalización o una acción manual",
      "la caída es superior al 50 % en menos de una semana: eso no es SEO, es algo roto",
    ],
  },
  {
    disciplina: "social",
    servicios: ["social_media_premium", "influencer_marketing_premium"],
    metricaPrincipal: "alcance_util",
    // «Interacciones» sin alcance engaña: mil interacciones sobre cien mil
    // impresiones es peor que cien sobre mil.
    metricasQueVigilan: ["tasa_de_interaccion", "seguidores_netos", "clics_al_sitio"],
    variacionMinimaPct: 20,
    muestraMinima: { que: "publicaciones en el periodo", minimo: 8 },
    caidaPreocupantePct: 35,
    palancas: [
      { id: "cambiar_formato", que: "cambiar el formato dominante", consecuencias: ["publica_en_nombre_del_cliente"], diasHastaPoderMedir: 21 },
      { id: "ajustar_frecuencia", que: "publicar más o menos", consecuencias: ["publica_en_nombre_del_cliente"], diasHastaPoderMedir: 28 },
      { id: "cambiar_hora", que: "cambiar la franja de publicación", consecuencias: [], diasHastaPoderMedir: 21 },
      { id: "cambiar_pilar", que: "cambiar el reparto entre temas", consecuencias: [], diasHastaPoderMedir: 30 },
    ],
    hipotesis: [
      "el alcance baja porque la red ha cambiado su distribución, no el contenido",
      "el formato que funcionaba se ha agotado",
      "se publica a una hora en la que la audiencia no está",
      "un solo tema se ha comido el calendario",
    ],
    cuandoEscalar: [
      "una publicación genera respuesta negativa sostenida",
      "la cuenta pierde alcance de forma brusca: puede ser una restricción de la plataforma",
    ],
  },
  {
    disciplina: "email",
    servicios: ["email_marketing_premium"],
    metricaPrincipal: "conversiones_por_envio",
    // La tasa de apertura dejó de ser fiable cuando los clientes de correo
    // empezaron a precargar imágenes. Se vigila, pero no manda.
    metricasQueVigilan: ["tasa_de_clic", "tasa_de_baja", "tasa_de_rebote", "quejas_de_spam"],
    variacionMinimaPct: 12,
    muestraMinima: { que: "envíos en el periodo", minimo: 500 },
    caidaPreocupantePct: 20,
    palancas: [
      { id: "cambiar_asunto", que: "probar otro asunto", consecuencias: [], diasHastaPoderMedir: 14 },
      { id: "resegmentar", que: "afinar a quién se le manda", consecuencias: [], diasHastaPoderMedir: 21 },
      { id: "cambiar_cadencia", que: "espaciar o juntar los envíos", consecuencias: ["contacta_personas"], diasHastaPoderMedir: 30 },
      { id: "limpiar_lista", que: "quitar a quien lleva meses sin abrir", consecuencias: ["es_irreversible"], diasHastaPoderMedir: 30 },
    ],
    hipotesis: [
      "las conversiones bajan porque se envía demasiado y la lista se cansa",
      "el segmento se ha quedado obsoleto",
      "la entregabilidad ha empeorado y no llega",
      "el asunto atrae aperturas pero no a quien compra",
    ],
    cuandoEscalar: [
      "las quejas de spam suben: eso pone en riesgo el dominio del cliente",
      "la tasa de rebote sube de golpe: la lista puede estar contaminada",
      "la tasa de baja se dispara: se está molestando a la gente",
    ],
  },
  {
    disciplina: "cro",
    servicios: ["funnel_premium", "landing_premium"],
    metricaPrincipal: "tasa_de_conversion",
    metricasQueVigilan: ["abandono_por_paso", "tiempo_hasta_conversion", "valor_medio"],
    variacionMinimaPct: 8,
    // Con menos de mil visitas por variante, un ganador es ruido con forma de
    // resultado. Es la cifra que decide si el experimento puede concluir.
    muestraMinima: { que: "visitas por variante", minimo: 1000 },
    caidaPreocupantePct: 15,
    palancas: [
      { id: "cambiar_titular", que: "probar otro titular", consecuencias: [], diasHastaPoderMedir: 14 },
      { id: "reducir_campos", que: "quitar campos del formulario", consecuencias: [], diasHastaPoderMedir: 14 },
      { id: "reordenar_pasos", que: "cambiar el orden de los pasos", consecuencias: [], diasHastaPoderMedir: 21 },
      { id: "cambiar_llamada", que: "cambiar la llamada a la acción", consecuencias: [], diasHastaPoderMedir: 14 },
    ],
    hipotesis: [
      "el formulario pide más de lo que la gente está dispuesta a dar",
      "la promesa del anuncio no coincide con lo que se encuentra al llegar",
      "hay un paso donde se cae la mayoría",
      "el precio aparece demasiado tarde",
    ],
    cuandoEscalar: [
      "el tráfico no da para alcanzar significación en un plazo razonable",
      "dos experimentos seguidos dan resultados contradictorios",
    ],
  },
  {
    disciplina: "contenido",
    servicios: [
      "contenido_copywriting_premium",
      "personal_digital_premium",
      "formacion_capacitacion_digital_premium",
    ],
    metricaPrincipal: "conversiones_asistidas",
    metricasQueVigilan: ["lecturas_completas", "tiempo_en_pagina", "comparticiones"],
    variacionMinimaPct: 20,
    muestraMinima: { que: "piezas publicadas", minimo: 6 },
    caidaPreocupantePct: 30,
    palancas: [
      { id: "cambiar_angulo", que: "cambiar el ángulo de los temas", consecuencias: [], diasHastaPoderMedir: 45 },
      { id: "cambiar_formato", que: "cambiar el formato", consecuencias: [], diasHastaPoderMedir: 30 },
      { id: "actualizar_lo_que_funciona", que: "actualizar lo que ya funciona", consecuencias: [], diasHastaPoderMedir: 30 },
    ],
    hipotesis: [
      "los temas no responden a lo que el público busca",
      "el formato no encaja con dónde se consume",
      "hay contenido antiguo que sigue trayendo y nadie lo mantiene",
    ],
    cuandoEscalar: ["tres ciclos sin que ninguna pieza pase de la media"],
  },
  {
    disciplina: "web",
    servicios: [
      "web_premium",
      "ecommerce_premium",
      "mantenimiento_web_premium",
      "integraciones_apis_premium",
      "consultoria_automatizacion_premium",
    ],
    metricaPrincipal: "conversiones",
    metricasQueVigilan: ["velocidad_de_carga", "errores_por_sesion", "sesiones", "valor_medio_pedido"],
    variacionMinimaPct: 10,
    muestraMinima: { que: "sesiones en el periodo", minimo: 500 },
    caidaPreocupantePct: 20,
    palancas: [
      { id: "mejorar_velocidad", que: "acelerar la carga", consecuencias: [], diasHastaPoderMedir: 21 },
      { id: "arreglar_errores", que: "arreglar los errores que ve el usuario", consecuencias: [], diasHastaPoderMedir: 14 },
      { id: "simplificar_compra", que: "quitar pasos del proceso de compra", consecuencias: [], diasHastaPoderMedir: 21 },
    ],
    hipotesis: [
      "la web ha empeorado de velocidad tras un cambio",
      "hay un error que sólo pasa en móvil",
      "el proceso de compra pide demasiado",
    ],
    cuandoEscalar: [
      "las conversiones caen a cero: eso no es conversión, es algo roto",
      "los errores por sesión se disparan",
    ],
  },
  {
    disciplina: "reputacion",
    servicios: ["reputacion_online_orm_premium"],
    metricaPrincipal: "valoracion_media",
    metricasQueVigilan: ["resenas_nuevas", "tiempo_de_respuesta", "resenas_sin_responder"],
    variacionMinimaPct: 5,
    muestraMinima: { que: "reseñas en el periodo", minimo: 10 },
    caidaPreocupantePct: 10,
    palancas: [
      { id: "responder_antes", que: "responder más rápido", consecuencias: ["publica_en_nombre_del_cliente"], diasHastaPoderMedir: 30 },
      { id: "pedir_resenas", que: "pedir reseña a quien ha quedado contento", consecuencias: ["contacta_personas"], diasHastaPoderMedir: 30 },
      { id: "avisar_de_lo_que_se_repite", que: "avisar al cliente de lo que se repite en las quejas", consecuencias: [], diasHastaPoderMedir: 14 },
    ],
    hipotesis: [
      "la valoración baja por un problema real del negocio, no por cómo se responde",
      "las reseñas buenas no llegan porque nadie las pide",
      "hay una queja que se repite y nadie la ha resuelto",
    ],
    cuandoEscalar: [
      "una queja se repite: eso no lo arregla una respuesta, lo arregla el cliente",
      "aparece una reseña con acusación grave",
    ],
  },
  {
    disciplina: "marca",
    servicios: [
      "branding_premium",
      "diseno_grafico_creatividades_premium",
      "fotografia_producto_premium",
      "video_multimedia_premium",
      "3d_contenido_inmersivo_premium",
      "voz_premium",
      "canales_comunicaciones_premium",
      "bots_premium",
      "advisor_empresarial_premium",
    ],
    // Las piezas de marca no se optimizan por sí solas: se optimizan por cómo
    // rinden donde se usan. Por eso la métrica es la de la pieza en su canal.
    metricaPrincipal: "rendimiento_de_la_pieza",
    metricasQueVigilan: ["uso_de_la_pieza", "sustituciones", "coherencia_reportada"],
    variacionMinimaPct: 20,
    muestraMinima: { que: "usos de la pieza", minimo: 5 },
    caidaPreocupantePct: 30,
    palancas: [
      { id: "iterar_pieza", que: "iterar sobre la pieza que mejor rinde", consecuencias: [], diasHastaPoderMedir: 30 },
      { id: "retirar_lo_que_no_se_usa", que: "retirar lo que nadie usa", consecuencias: [], diasHastaPoderMedir: 30 },
    ],
    hipotesis: [
      "la pieza no se usa porque no encaja con el canal para el que se pidió",
      "la versión que mejor rinde no es la que más se usa",
    ],
    cuandoEscalar: ["la marca del cliente ha cambiado y las piezas ya no encajan"],
  },
  {
    disciplina: "crm_captacion",
    servicios: ["crm_captacion_premium"],
    metricaPrincipal: "leads_cualificados",
    // «Leads» a secas engaña: doscientos contactos que no compran son peores
    // que veinte que sí, porque además ocupan al equipo de ventas.
    metricasQueVigilan: ["tasa_de_cualificacion", "tiempo_hasta_primer_contacto", "cierres", "coste_por_lead"],
    variacionMinimaPct: 15,
    muestraMinima: { que: "leads en el periodo", minimo: 40 },
    caidaPreocupantePct: 25,
    palancas: [
      { id: "afinar_criterio", que: "afinar qué contacto se considera bueno", consecuencias: [], diasHastaPoderMedir: 30 },
      { id: "acortar_respuesta", que: "reducir el tiempo hasta el primer contacto", consecuencias: [], diasHastaPoderMedir: 21 },
      { id: "cambiar_formulario", que: "cambiar qué se pregunta al captar", consecuencias: [], diasHastaPoderMedir: 21 },
      { id: "reactivar_dormidos", que: "reactivar contactos antiguos", consecuencias: ["contacta_personas"], diasHastaPoderMedir: 30 },
    ],
    hipotesis: [
      "entran muchos contactos pero el criterio de cualificación deja pasar a cualquiera",
      "se tarda demasiado en llamar y para entonces ya han hablado con otro",
      "el formulario no pregunta lo que distingue a un buen contacto",
      "los motivos de pérdida se repiten y nadie ha actuado sobre ellos",
    ],
    cuandoEscalar: [
      "el coste por lead cualificado supera lo que deja un cliente",
      "ventas dice que los leads no sirven: eso no lo arregla más volumen",
    ],
  },
  {
    disciplina: "analitica",
    servicios: ["analitica_atribucion_premium"],
    // Lo que se optimiza aquí NO es el negocio del cliente: es la calidad de la
    // medición. Confundirlo llevaría a «mejorar» los números en vez de
    // mejorar lo que miden.
    metricaPrincipal: "cobertura_de_medicion",
    metricasQueVigilan: ["discrepancia_entre_fuentes", "conversiones_sin_origen", "eventos_perdidos"],
    variacionMinimaPct: 10,
    muestraMinima: { que: "sesiones medidas", minimo: 500 },
    caidaPreocupantePct: 15,
    palancas: [
      { id: "arreglar_etiquetas", que: "arreglar las etiquetas que no disparan", consecuencias: [], diasHastaPoderMedir: 14 },
      { id: "unificar_definiciones", que: "unificar qué cuenta como conversión", consecuencias: [], diasHastaPoderMedir: 21 },
      { id: "ampliar_ventana", que: "ajustar la ventana de atribución al ciclo real", consecuencias: [], diasHastaPoderMedir: 30 },
      { id: "marcar_campanas", que: "etiquetar bien el origen de las campañas", consecuencias: [], diasHastaPoderMedir: 14 },
    ],
    hipotesis: [
      "hay conversiones sin origen porque las campañas no llevan etiqueta",
      "dos herramientas cuentan distinto porque miden cosas distintas",
      "la ventana de atribución es más corta que el ciclo de compra",
      "el consentimiento bloquea la medición de una parte del tráfico",
    ],
    cuandoEscalar: [
      "las fuentes discrepan más de un 30 %: no se puede informar de nada con eso",
      "hay conversiones que nadie sabe de dónde vienen y son mayoría",
    ],
  },
  {
    disciplina: "inteligencia_mercado",
    servicios: ["inteligencia_mercado_premium"],
    metricaPrincipal: "decisiones_informadas",
    // Una investigación se juzga por las decisiones que permite tomar, no por
    // las páginas que ocupa.
    metricasQueVigilan: ["hallazgos_accionables", "hallazgos_confirmados", "tiempo_hasta_el_hallazgo"],
    variacionMinimaPct: 25,
    muestraMinima: { que: "hallazgos con fuente", minimo: 5 },
    caidaPreocupantePct: 40,
    palancas: [
      { id: "estrechar_la_pregunta", que: "estrechar la pregunta de investigación", consecuencias: [], diasHastaPoderMedir: 30 },
      { id: "cambiar_fuentes", que: "cambiar de dónde se saca la información", consecuencias: [], diasHastaPoderMedir: 30 },
      { id: "profundizar_en_un_competidor", que: "profundizar en un solo competidor", consecuencias: [], diasHastaPoderMedir: 21 },
    ],
    hipotesis: [
      "la pregunta era demasiado amplia y el informe no decide nada",
      "las fuentes son públicas y todos los competidores ya las conocen",
      "el hallazgo importante estaba en un competidor que no se miró",
    ],
    cuandoEscalar: [
      "la investigación no cambia ninguna decisión: entonces no hacía falta",
      "los datos que harían falta no son públicos ni comprables",
    ],
  },
  {
    disciplina: "geo_ai_search",
    servicios: ["geo_ai_search_premium"],
    metricaPrincipal: "menciones_en_respuestas_de_ia",
    metricasQueVigilan: ["senales_de_entidad", "citas_con_enlace", "cobertura_de_preguntas"],
    variacionMinimaPct: 20,
    muestraMinima: { que: "preguntas comprobadas", minimo: 20 },
    caidaPreocupantePct: 35,
    palancas: [
      { id: "responder_la_pregunta", que: "responder directamente la pregunta que se hace", consecuencias: [], diasHastaPoderMedir: 30 },
      { id: "aportar_dato_propio", que: "añadir un dato propio que nadie más tenga", consecuencias: [], diasHastaPoderMedir: 45 },
      { id: "reforzar_entidad", que: "reforzar las señales de entidad de la empresa", consecuencias: [], diasHastaPoderMedir: 45 },
      { id: "estructurar_datos", que: "marcar los datos con esquema", consecuencias: [], diasHastaPoderMedir: 30 },
    ],
    hipotesis: [
      "el contenido repite lo que ya está en cien sitios: no hay razón para citarlo",
      "la empresa no está reconocida como entidad y por eso no se la nombra",
      "el contenido responde al tema pero no a la pregunta concreta",
    ],
    cuandoEscalar: [
      "no se puede medir: comprobar menciones exige consultar modelos de terceros de forma repetida, y eso genera coste externo",
      "los asistentes citan a un competidor con peor contenido: hay una señal de entidad que falta",
    ],
  },
];

const PORSERVICIO = new Map<string, PoliticaDeDisciplina>();
for (const p of POLITICAS) {
  for (const s of p.servicios) PORSERVICIO.set(s, p);
}

export function politicaDe(serviceId: string): PoliticaDeDisciplina | null {
  return PORSERVICIO.get(serviceId) ?? null;
}

export function serviciosConPolitica(): string[] {
  return [...PORSERVICIO.keys()].sort();
}

/**
 * Las palancas que un agente puede mover SOLO.
 *
 * Sin consecuencias declaradas = sin efectos hacia fuera. Todo lo que gasta
 * dinero, publica en nombre del cliente, contacta con personas o es
 * irreversible necesita que alguien diga que sí, y eso lo impone el puente.
 */
export function palancasAutonomas(p: PoliticaDeDisciplina): Palanca[] {
  return p.palancas.filter((x) => x.consecuencias.length === 0);
}
