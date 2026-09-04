/**
 * Qué ha contestado de verdad un prospecto, y qué hay que hacer con eso.
 *
 * ── POR QUÉ HACE FALTA ──────────────────────────────────────────────────────
 *
 * `handleReplyHook` marcaba `reply_received = true` y nada más. Una respuesta
 * era un booleano. Pero «respuesta» agrupa cosas que exigen acciones opuestas:
 *
 *   · «dadme de baja»            → hay que PARAR y no volver a escribir nunca;
 *   · «estoy de vacaciones»      → NO ha contestado nadie: seguir;
 *   · «no me interesa»           → parar, y no es una oportunidad;
 *   · «me interesa, ¿hablamos?»  → parar, y avisar a una persona YA;
 *   · buzón inexistente          → la dirección está muerta.
 *
 * Tratarlas igual produce los dos errores caros a la vez: seguir escribiendo a
 * quien pidió que pararas, y dejar de escribir a quien solo tenía puesto el
 * autorespondedor.
 *
 * ── LA DECISIÓN QUE MÁS IMPORTA ─────────────────────────────────────────────
 *
 * La respuesta automática NO cuenta como respuesta. Es la regla que hace que
 * parar-al-responder sea seguro: sin ella, un «estaré fuera hasta el lunes»
 * cierra la secuencia, el prospecto no vuelve a saber de nosotros, y en el CRM
 * consta como que contestó. Nadie revisa eso jamás.
 *
 * ── POR QUÉ NO LO DECIDE UN MODELO ──────────────────────────────────────────
 *
 * Podría, y quizá acertaría más en los casos raros. Pero esta decisión gobierna
 * si se sigue escribiendo a una persona que ha pedido que pares: tiene que ser
 * reproducible, auditable y gratuita, y tiene que funcionar igual el día que no
 * haya proveedor. Un modelo puede AÑADIRSE después para lo que aquí queda como
 * `indeterminado`; no para sustituir esto.
 *
 * ── ANTE LA DUDA, PARAR ─────────────────────────────────────────────────────
 *
 * Lo que no se reconoce se trata como respuesta humana y detiene la secuencia.
 * Un prospecto de menos duele mucho menos que seguir enviando correo comercial
 * a alguien que ya está escribiéndote.
 */

/** Qué clase de respuesta es. */
export type CategoriaDeRespuesta =
  | "baja" //           pide explícitamente no recibir más
  | "rebote" //         la dirección o el número no existen
  | "automatica" //     autorespondedor: no ha contestado una persona
  | "reunion" //        propone o acepta hablar
  | "interesado" //     quiere saber más
  | "negativo" //       no le interesa
  | "indeterminado"; // una persona escribió algo que no clasificamos

export type RespuestaClasificada = {
  categoria: CategoriaDeRespuesta;
  /** Si la secuencia automática debe dejar de escribir. */
  detieneLaSecuencia: boolean;
  /** Si cuenta como que una PERSONA contestó (un autorespondedor no). */
  cuentaComoRespuesta: boolean;
  /** Si hay que retirar el consentimiento para escribirle. */
  retiraConsentimiento: boolean;
  /** Si merece que una persona lo mire hoy. */
  requiereAtencionHumana: boolean;
  /** Qué se reconoció, para poder discutir la clasificación después. */
  señales: string[];
};

type Regla = { nombre: string; patron: RegExp };

/**
 * Pedir la baja. Se mira PRIMERO porque es la única categoría cuya consecuencia
 * es legal y no comercial: equivocarse aquí no cuesta un cliente, cuesta una
 * reclamación.
 */
const BAJA: Regla[] = [
  // «dadme», «dame», «darnos», «dad»… El imperativo plural es la forma más
  // común en español y la primera versión no lo cogía.
  //
  // Y NO puede coger «estoy de baja»: en español eso es una baja médica, o sea
  // justo lo contrario —una ausencia temporal—. Por eso el patrón exige el verbo
  // dar delante y no se conforma con «de baja».
  { nombre: "baja-explicita", patron: /\bd[aá][rd]?(me|nos)?\s+de\s+baja\b/i },
  {
    nombre: "baja-solicitada",
    patron: /\b(solicito|quiero|deseo|pido)\s+(la\s+baja|darme\s+de\s+baja|que\s+me\s+d[eéi]is\s+de\s+baja)\b/i,
  },
  { nombre: "baja-lista", patron: /\bbaja\s+(de|en)\s+(la|esta|vuestra)\s+lista\b/i },
  { nombre: "unsubscribe", patron: /\b(unsubscribe|opt[\s-]?out|remove\s+me|take\s+me\s+off)\b/i },
  {
    nombre: "no-escribir",
    patron: /\bno\s+(me\s+|nos\s+)?(volv[áa]is|vuelvas?|volver|escrib[áa]is|escribas?|contact[éeá]is|contactes)\b/i,
  },
  { nombre: "stop", patron: /^\s*(stop|baja|unsubscribe)\s*[.!]?\s*$/i },
  {
    nombre: "borrar-datos",
    patron: /\b(borr(ad|a|en)\s+mis\s+datos|elimin(ad|a|en)\s+mis\s+datos|derecho\s+de\s+supresi[óo]n|gdpr|rgpd)\b/i,
  },
  {
    nombre: "denuncia",
    patron: /\b(spam|denunciar|agencia\s+espa[ñn]ola\s+de\s+protecci[óo]n\s+de\s+datos)\b/i,
  },
];

/** La dirección no existe. No es una opinión del prospecto: es un hecho técnico. */
const REBOTE: Regla[] = [
  {
    nombre: "rebote-duro",
    patron: /\b(address\s+not\s+found|user\s+unknown|mailbox\s+(is\s+)?(unavailable|not\s+found|full)|no\s+such\s+user|recipient\s+(address\s+)?rejected)\b/i,
  },
  {
    nombre: "rebote-smtp",
    patron: /\b5\.[0-9]\.[0-9]\b|delivery\s+status\s+notification\s+\(failure\)/i,
  },
  {
    nombre: "rebote-es",
    patron: /\b(no\s+se\s+ha\s+podido\s+entregar|direcci[óo]n\s+(de\s+correo\s+)?(no\s+existe|inexistente)|destinatario\s+desconocido)\b/i,
  },
];

/**
 * Autorespondedor. No ha contestado nadie.
 *
 * Es la regla que sostiene toda la mecánica: si esto falla hacia el lado
 * equivocado, parar-al-responder deja de ser una protección y se convierte en
 * una fuga silenciosa de prospectos.
 */
const AUTOMATICA: Regla[] = [
  {
    nombre: "ooo-en",
    patron: /\b(out\s+of\s+(the\s+)?office|auto(matic)?[\s-]?reply|automatic\s+response|away\s+from\s+my\s+(desk|email)|on\s+(vacation|annual\s+leave|parental\s+leave))\b/i,
  },
  {
    nombre: "ooo-es",
    patron: /\b(fuera\s+de\s+la\s+oficina|estar[ée]\s+(fuera|ausente)|de\s+vacaciones|respuesta\s+autom[áa]tica|ausencia\s+temporal|no\s+estar[ée]\s+disponible\s+hasta)\b/i,
  },
  {
    nombre: "vuelvo-el",
    patron: /\b(vuelvo|regreso|estar[ée]\s+de\s+vuelta|back\s+in\s+the\s+office|i\s+will\s+be\s+back|returning)\s+(el|on|the)?\s*\d/i,
  },
  {
    nombre: "cabecera-auto",
    patron: /auto[\s-]?submitted:\s*auto|x-autoreply|precedence:\s*(bulk|auto_reply)/i,
  },
  {
    nombre: "acuse",
    patron: /\b(hemos\s+recibido\s+tu\s+(mensaje|correo)|we\s+have\s+received\s+your\s+(message|email)|ticket\s+#?\d+\s+(creado|created))\b/i,
  },
];

/** Quiere hablar. Es lo más valioso que puede pasar y no puede esperar. */
const REUNION: Regla[] = [
  {
    nombre: "propone-hueco",
    patron: /\b(agend(a|amos|emos)|reserv(a|amos)|qued(amos|emos)|llamada|videollamada|reuni[óo]n|calendly|meet\.google|teams\.microsoft|zoom\.us)\b/i,
  },
  {
    nombre: "propone-hueco-en",
    patron: /\b(book\s+a\s+(call|meeting|slot)|schedule\s+a\s+(call|meeting)|set\s+up\s+a\s+(call|meeting)|are\s+you\s+free|my\s+calendar)\b/i,
  },
  {
    nombre: "dia-y-hora",
    patron: /\b(lunes|martes|mi[ée]rcoles|jueves|viernes|monday|tuesday|wednesday|thursday|friday)\b.{0,30}\b\d{1,2}([:.]\d{2})?\s*(h|am|pm|horas)\b/i,
  },
];

/** No le interesa. Parar, pero no es una baja: no retira el consentimiento. */
const NEGATIVO: Regla[] = [
  {
    nombre: "no-interesa",
    patron: /\bno\s+(me\s+|nos\s+)?(interesa|es\s+de\s+inter[ée]s|encaja|aplica|procede|es\s+(una\s+)?prioridad|es\s+el\s+momento)\b/i,
  },
  // «No, gracias» sin más es la negativa más frecuente que existe. Pero
  // «gracias a vosotros» es lo contrario, así que se excluye explícitamente.
  { nombre: "no-gracias", patron: /\bno,?\s+gracias\b(?!\s+a\b)/i },
  {
    nombre: "not-interested",
    patron: /\b(not\s+interested|no,?\s+thanks?|we\s*(’|')?re\s+(all\s+)?(good|set)|pass\s+on\s+this|not\s+a\s+(good\s+)?fit)\b/i,
  },
  {
    nombre: "ya-tenemos",
    patron: /\b(ya\s+(tenemos|trabajamos\s+con|contamos\s+con)|we\s+already\s+(have|work\s+with)|tenemos\s+(agencia|proveedor))\b/i,
  },
  {
    nombre: "no-soy-yo",
    patron: /\b(no\s+soy\s+(la\s+persona|el\s+responsable)|wrong\s+person|not\s+my\s+(area|department)|ya\s+no\s+trabajo\s+(aqu[íi]|en))\b/i,
  },
  {
    nombre: "sin-presupuesto",
    patron: /\b(no\s+(hay|tenemos)\s+presupuesto|no\s+budget|too\s+expensive|demasiado\s+caro)\b/i,
  },
];

/** Quiere saber más. Menos urgente que una reunión, pero es una oportunidad. */
const INTERESADO: Regla[] = [
  {
    nombre: "pide-info",
    patron: /\b(m[áa]s\s+informaci[óo]n|env[íi]a(me|nos)?|c[óo]mo\s+funciona|qu[ée]\s+incluye|presupuesto|tarifas?|precios?)\b/i,
  },
  {
    nombre: "tell-me-more",
    patron: /\b(tell\s+me\s+more|more\s+info|send\s+(me\s+)?(over|details|a\s+deck)|how\s+(does\s+it|much\s+does\s+it)|pricing|quote)\b/i,
  },
  {
    nombre: "interes-explicito",
    patron: /\b(me\s+interesa|nos\s+interesa|suena\s+bien|sounds\s+(good|interesting)|i\s*(’|')?m\s+interested)\b/i,
  },
];

function primeraQueCoincide(reglas: Regla[], texto: string): string | null {
  for (const r of reglas) if (r.patron.test(texto)) return r.nombre;
  return null;
}

/**
 * Clasifica el texto de una respuesta.
 *
 * @param texto  cuerpo de la respuesta, y el asunto si se tiene: el asunto es
 *               donde vive «Automatic reply:», así que dejarlo fuera pierde la
 *               señal más fiable que existe para detectar un autorespondedor.
 */
export function clasificarRespuesta(texto: string | null | undefined): RespuestaClasificada {
  const t = (texto ?? "").trim();

  // Sin texto no se puede afirmar nada. Que alguien llamara al hook es indicio
  // de que hubo respuesta, así que se para —ante la duda, parar— pero no se
  // inventa una categoría.
  if (t.length === 0) {
    return {
      categoria: "indeterminado",
      detieneLaSecuencia: true,
      cuentaComoRespuesta: true,
      retiraConsentimiento: false,
      requiereAtencionHumana: true,
      señales: ["sin-texto"],
    };
  }

  const baja = primeraQueCoincide(BAJA, t);
  if (baja) {
    return {
      categoria: "baja",
      detieneLaSecuencia: true,
      cuentaComoRespuesta: true,
      retiraConsentimiento: true,
      requiereAtencionHumana: false,
      señales: [baja],
    };
  }

  const rebote = primeraQueCoincide(REBOTE, t);
  if (rebote) {
    return {
      categoria: "rebote",
      detieneLaSecuencia: true,
      // Un buzón que no existe no ha contestado: contarlo como respuesta
      // inflaría la tasa de respuesta, que es justo la métrica con la que se
      // decide si la secuencia sirve para algo.
      cuentaComoRespuesta: false,
      retiraConsentimiento: false,
      requiereAtencionHumana: false,
      señales: [rebote],
    };
  }

  const automatica = primeraQueCoincide(AUTOMATICA, t);
  if (automatica) {
    return {
      categoria: "automatica",
      // NO para. Es toda la razón de ser de esta función.
      detieneLaSecuencia: false,
      cuentaComoRespuesta: false,
      retiraConsentimiento: false,
      requiereAtencionHumana: false,
      señales: [automatica],
    };
  }

  const reunion = primeraQueCoincide(REUNION, t);
  if (reunion) {
    return {
      categoria: "reunion",
      detieneLaSecuencia: true,
      cuentaComoRespuesta: true,
      retiraConsentimiento: false,
      requiereAtencionHumana: true,
      señales: [reunion],
    };
  }

  const negativo = primeraQueCoincide(NEGATIVO, t);
  if (negativo) {
    return {
      categoria: "negativo",
      detieneLaSecuencia: true,
      cuentaComoRespuesta: true,
      // Un «no me interesa» NO es una baja. Retirarle el consentimiento sería
      // decidir por él algo que no ha pedido, y le cierra la puerta a otra
      // oferta dentro de un año.
      retiraConsentimiento: false,
      requiereAtencionHumana: false,
      señales: [negativo],
    };
  }

  const interesado = primeraQueCoincide(INTERESADO, t);
  if (interesado) {
    return {
      categoria: "interesado",
      detieneLaSecuencia: true,
      cuentaComoRespuesta: true,
      retiraConsentimiento: false,
      requiereAtencionHumana: true,
      señales: [interesado],
    };
  }

  return {
    categoria: "indeterminado",
    detieneLaSecuencia: true,
    cuentaComoRespuesta: true,
    retiraConsentimiento: false,
    requiereAtencionHumana: true,
    señales: [],
  };
}
