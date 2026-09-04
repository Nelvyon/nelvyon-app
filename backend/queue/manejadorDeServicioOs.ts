/**
 * El puente entre la cola de `os_jobs` y quien sabe hacer el trabajo.
 *
 * `osOrchestrator.processQueuedJob` ya existe y es el mismo camino que usa el
 * worker de Redis (`osWorker.ts`). No se duplica nada: se conecta.
 *
 * Por qué es un fichero aparte de `TrabajadorDeCola`: el trabajador no debe
 * conocer a ningún agente. Manteniéndolos separados, las pruebas del trabajador
 * se ejecutan sin arrastrar medio producto, y añadir un servicio nuevo no toca
 * el bucle que reclama y cierra filas.
 */

import mapaDeServicio from "../calidad/mapaDeServicio.json";
import { MotorDeCalidad, type Pieza } from "../calidad/MotorDeCalidad";
import { osOrchestrator } from "../os-agents/OsOrchestrator";
import { degradacionPermitida, veredictoDeEntrega } from "../autonomous/llm/llmPolicy";
import type { LlmProvenance } from "../autonomous/llm/llmProvenance";
import type { ManejadorDeTrabajo, ResultadoDeManejador } from "./trabajadorDeCola";

/**
 * ¿Este trabajo puede ejecutarse solo hasta el final, o hay que parar y esperar
 * a una persona?
 *
 * Hoy sólo hay un motivo, y es el que el diagnóstico dejó medido: si el
 * resultado se produjo sin modelo real y el servicio no admite esa degradación,
 * no se cierra como completado. Se deja en `waiting_approval` con la causa, que
 * es lo que permite que alguien lo vea en vez de que se publique contenido de
 * plantilla como si fuera trabajo hecho.
 *
 * Se comprueba AQUÍ, además de en el orquestador de packs, porque son dos
 * caminos distintos hacia la misma entrega y cerrar sólo uno deja el otro
 * abierto.
 */
function exigeAprobacion(
  serviceId: string,
  resultado: unknown,
): { pide: true; motivo: string } | { pide: false } {
  const procedencias = extraerProcedencias(resultado);
  if (procedencias.length === 0) return { pide: false };

  const permite = degradacionPermitida({ serviceId });
  for (const p of procedencias) {
    const v = veredictoDeEntrega({ ...p, degradationAllowed: permite });
    if (!v.publicable) return { pide: true, motivo: v.motivo };
  }
  return { pide: false };
}

/** Saca las procedencias de un resultado sin suponer su forma exacta. */
function extraerProcedencias(resultado: unknown): LlmProvenance[] {
  if (!resultado || typeof resultado !== "object") return [];
  const raiz = resultado as Record<string, unknown>;
  const candidatos: unknown[] = [];

  const log = raiz.agent_log ?? (raiz.project as Record<string, unknown> | undefined)?.agent_log;
  if (Array.isArray(log)) {
    for (const entrada of log) {
      const p = (entrada as Record<string, unknown> | null)?.provenance;
      if (p) candidatos.push(p);
    }
  }
  if (raiz.provenance) candidatos.push(raiz.provenance);

  return candidatos.filter(
    (p): p is LlmProvenance =>
      Boolean(p) && typeof p === "object" && typeof (p as LlmProvenance).outcome === "string",
  );
}

/** La constancia de que una pieza pasó por calidad, y con qué resultado. */
type RastroDeCalidad = {
  dominio: string;
  veredicto: string;
  revisadoPor: string;
  avisos: string[];
  noComprobado: string[];
};

/** Qué disciplina juzga cada servicio. Fuente única, ya declarada. */
const QA_DE = (mapaDeServicio as { qaDe: Record<string, string> }).qaDe;

const motorDeCalidad = new MotorDeCalidad();

/**
 * ¿Esto se puede entregar tal cual, o tiene que verlo una persona?
 *
 * ── EL HUECO QUE CIERRA, Y ERA EL MAYOR ─────────────────────────────────────
 *
 * `MotorDeCalidad` tiene 82 comprobaciones repartidas en 18 disciplinas.
 * `mapaDeServicio.json` dice qué disciplina juzga cada servicio. Las dos cosas
 * estaban construidas.
 *
 * Y no se tocaban. El único módulo que llamaba al motor era `PuenteDeEjecucion`,
 * que no tiene ni un consumidor; y `qaDe` sólo lo leía una prueba. La vía real
 * —`manejadorDeServicioOs` → `OsOrchestrator.processQueuedJob`— no menciona la
 * calidad en ninguna línea.
 *
 * Es decir: todo lo que se ha entregado hasta hoy salió sin pasar por calidad
 * ni una sola vez. No porque el motor fallara: porque nadie lo llamaba.
 *
 * ── POR QUÉ AQUÍ ────────────────────────────────────────────────────────────
 *
 * Es el punto único por el que pasa todo trabajo terminado, venga del agente
 * que venga. Ponerlo en cada agente es exactamente cómo el bucle de aprendizaje
 * acabó faltando en 67 de ellos.
 *
 * Y va DESPUÉS de la puerta de procedencia y ANTES del aprendizaje: aprender de
 * trabajo que no ha pasado calidad enseña a repetir lo que no vale, y encima
 * con la confianza que da un patrón con muchas muestras.
 *
 * ── NO TIRA TRABAJO ─────────────────────────────────────────────────────────
 *
 * Suspender no borra nada: encamina a `esperandoAprobacion`, que es la vía que
 * ya existe para que una persona lo mire. El trabajo está hecho y sigue ahí; lo
 * único que se impide es que salga sin que nadie lo haya visto.
 */
async function revisarCalidad(
  serviceId: string,
  resultado: unknown,
  payload: Record<string, unknown>,
): Promise<
  | { pide: true; motivo: string }
  | { pide: false; rastro?: RastroDeCalidad }
> {
  const dominio = QA_DE[serviceId];
  // Servicio sin disciplina declarada: no se inventa una. Juzgarlo con la
  // rúbrica equivocada sería peor que no juzgarlo, y el hueco de declaración se
  // vigila donde corresponde, en el mapa.
  if (!dominio) return { pide: false };

  if (!resultado || typeof resultado !== "object") return { pide: false };

  const pieza: Pieza = {
    dominio,
    autor: serviceId,
    contenido: resultado as Record<string, unknown>,
    contexto: contextoDelCliente(payload),
  };

  try {
    const informe = motorDeCalidad.evaluar(pieza, `qa:${serviceId}`);

    // PASS_WITH_WARNINGS es un aprobado, no un suspenso. El motor distingue las
    // dos cosas a proposito: un aviso senala algo mejorable, no algo que impida
    // entregar. Retener por un aviso llenaria la bandeja de revision de trabajo
    // valido, y una bandeja llena de ruido se deja de mirar —que es como se
    // pierde tambien lo que si importaba—.
    if (informe.veredicto === "PASS" || informe.veredicto === "PASS_WITH_WARNINGS") {
      // DEJA CONSTANCIA DE QUE SE REVISO, aunque haya pasado.
      //
      // Sin esto solo quedaba rastro de lo que suspendia —el motivo va a
      // `waiting_reason`— y un entregable aprobado era indistinguible de uno que
      // nadie miro. La pregunta que se hace despues nunca es «por que se
      // retuvo», que ya se sabia: es «esto lo revisó alguien, y con qué».
      return {
        pide: false,
        rastro: {
          dominio,
          veredicto: informe.veredicto,
          revisadoPor: `qa:${serviceId}`,
          avisos: informe.hallazgos.map((h) => h.id),
          // Lo que NO se pudo comprobar viaja con el entregable. Un aprobado con
          // media rubrica sin ejecutar no es lo mismo que uno completo, y quien
          // lo lea despues tiene derecho a distinguirlos.
          noComprobado: informe.noComprobado.map((n) => n.id),
        },
      };
    }

    const porQue = informe.hallazgos.length > 0
      ? informe.hallazgos.map((h) => h.quePasa).join("; ")
      : informe.noComprobado.map((n) => `${n.id}: ${n.porQue}`).join("; ");
    return {
      pide: true,
      motivo: `calidad (${dominio}) dice ${informe.veredicto}: ${porQue}`,
    };
  } catch (e) {
    // FALLA CERRADO. Si el propio motor revienta, no se sabe si la pieza vale
    // — y no saberlo no es lo mismo que valer. Se encamina a revisión, que no
    // pierde el trabajo, en vez de entregarlo sin haberlo mirado.
    const motivo = e instanceof Error ? e.message : String(e);
    return { pide: true, motivo: `no se pudo revisar la calidad: ${motivo}` };
  }
}

/**
 * Lo que el motor necesita saber del cliente para juzgar la pieza.
 *
 * Sin esto, las comprobaciones de idioma y mercado no aplican nunca y el motor
 * juzgaría una landing francesa exactamente igual que una española. Se pasa lo
 * que haya; lo que falte, falta —no se rellena con suposiciones—.
 */
function contextoDelCliente(payload: Record<string, unknown>): Record<string, unknown> {
  const ctx: Record<string, unknown> = {};
  const idioma = payload.idioma ?? payload.language ?? payload.locale;
  if (typeof idioma === "string") ctx.idioma = idioma;
  const mercado = payload.mercado ?? payload.market ?? payload.pais ?? payload.country;
  if (typeof mercado === "string") ctx.mercado = mercado;
  if (payload.datosDelCliente && typeof payload.datosDelCliente === "object") {
    ctx.datosDelCliente = payload.datosDelCliente;
  }
  if (Array.isArray(payload.otrosClientes)) ctx.otrosClientes = payload.otrosClientes;
  return ctx;
}

export const manejadorDeServicioOs: ManejadorDeTrabajo = async (
  trabajo,
): Promise<ResultadoDeManejador> => {
  // EL BUSINESS BRAIN SE CARGA UNA VEZ, AQUI.
  //
  // Todas las piezas existian —el servicio que lo guarda, el mapa de que
  // dimensiones usa cada uno de los 29 servicios, el compositor del texto y la
  // clave que lo prepone— y el cerebro no llegaba a NINGUN agente. Ni siquiera
  // a web, el unico que sabia recibirlo: su parametro era opcional y nadie se
  // lo pasaba.
  //
  // Una vez por trabajo y no por familia de prompts: hay doce familias que
  // pasan por el mismo trabajo, y cargarlo en cada una serian doce consultas
  // para el mismo dato.
  const { bloqueDeCerebro } = await import("../os-agents/bloqueDeCerebro");
  const { CLAVE_CEREBRO } = await import("../os-agents/agents/elitePayloadStrings");
  const sabido = await bloqueDeCerebro(trabajo.clientId, trabajo.serviceId);

  // El idioma y el mercado viajan APARTE del bloque, y no por comodidad: la
  // puerta de calidad los compara con lo que salio escrito, y un texto no se
  // puede comparar con un texto. Sin esto, `en-el-idioma-del-cliente` no
  // aplicaba nunca — la comprobacion existia y no se ejecutaba jamas.
  //
  // Lo que ya trae el encargo MANDA sobre lo que sabiamos: si este trabajo pide
  // expresamente una pieza en frances, se hace en frances aunque el cliente
  // opere en espanol.
  const payloadConCerebro: Record<string, unknown> = { ...trabajo.payload };
  if (sabido.bloque) payloadConCerebro[CLAVE_CEREBRO] = sabido.bloque;
  if (sabido.idioma && payloadConCerebro.idioma === undefined) {
    payloadConCerebro.idioma = sabido.idioma;
  }
  if (sabido.mercado && payloadConCerebro.mercado === undefined) {
    payloadConCerebro.mercado = sabido.mercado;
  }
  // Los vecinos no son contexto para el modelo: son para que la comprobacion
  // bloqueante `sin-mezcla-de-clientes` pueda ejecutarse. Su cabecera lo llama
  // «el fallo que destruye la confianza» —recibir un plan con el nombre de otro
  // cliente de la misma agencia no se arregla pidiendo perdon— y hasta ahora no
  // se aplicaba nunca, porque nadie le decia contra que nombres comparar.
  if (sabido.otrosClientes.length > 0) {
    payloadConCerebro.otrosClientes = sabido.otrosClientes;
  }

  const salida = await osOrchestrator.processQueuedJob({
    jobId: trabajo.jobId,
    serviceId: trabajo.serviceId,
    clientId: trabajo.clientId,
    payload: payloadConCerebro,
    enqueuedAt: new Date().toISOString(),
    userId: (trabajo.payload.userId as string | undefined) ?? undefined,
  });

  if (salida.skipped) {
    // El orquestador decidió no hacerlo. No es un fallo y no debe reintentarse
    // sin que nadie mire: se para y se dice por qué.
    return {
      tipo: "esperandoAprobacion",
      motivo: salida.message ?? "el orquestador omitio el trabajo sin dar motivo",
    };
  }

  if (salida.status !== "completed") {
    // Un fallo se lanza para que la cola aplique su espera creciente y, agotados
    // los intentos, lo mande a `dead_letter`.
    throw new Error(salida.message ?? "el trabajo termino sin completarse");
  }

  const resultado = salida.result ?? { message: salida.message };
  const aprobacion = exigeAprobacion(trabajo.serviceId, resultado);
  if (aprobacion.pide) {
    return { tipo: "esperandoAprobacion", motivo: aprobacion.motivo };
  }

  // LA PUERTA DE CALIDAD. Antes de esto, nada de lo que se entregaba pasaba por
  // el motor: existia, y no lo llamaba nadie en la via real.
  const calidad = await revisarCalidad(trabajo.serviceId, resultado, payloadConCerebro);
  if (calidad.pide) {
    return { tipo: "esperandoAprobacion", motivo: calidad.motivo };
  }

  // El rastro viaja CON el entregable, en su propia clave. No se mezcla con lo
  // que produjo el agente: sobrescribir algo suyo por llamarse igual perderia
  // trabajo, y aqui solo se anade.
  const entregable =
    calidad.rastro && resultado && typeof resultado === "object" && !Array.isArray(resultado)
      ? { ...(resultado as Record<string, unknown>), calidad: calidad.rastro }
      : resultado;

  // EL BUCLE DE APRENDIZAJE SE CIERRA AQUI, no en cada agente.
  //
  // `LearningService.recordOutcome` es la entrada de ese bucle: sin outcomes no
  // hay patrones que analizar y `analyzePatternsForAgent` mira sobre nada.
  //
  // Estaba cableado agente por agente. De los 244 agentes de los sectores que
  // producen con modelo, 67 no lo llamaban — seis sectores enteros (`b2b`,
  // `hospitality`, `influencers`, `realestate`, `sports`, `youtubers`) trabajaban
  // sin dejar rastro del que aprender. Y el 68 lo habria olvidado igual: pedirle
  // a cada autor de agente que se acuerde de una linea es como se pierde una
  // capacidad entera en silencio.
  //
  // Aqui pasa TODO trabajo que termina, venga del agente que venga.
  //
  // DESPUES de la puerta de aprobacion, y eso es deliberado: un resultado que
  // necesita que lo mire una persona todavia no es un outcome del que aprender.
  // Aprender de trabajo sin validar es como se ensena a repetir un error.
  await registrarParaAprender(trabajo, entregable);

  // Y QUEDA REGISTRADA COMO ACCION MEDIBLE.
  //
  // `MotorDeResultados` cierra el circulo objetivo → linea base → accion →
  // medicion → resultado, tiene sus tablas y su bateria contra PostgreSQL real,
  // y no lo importaba nadie: cero referencias en todo el repositorio fuera de
  // sus propias pruebas. El motor que decide si NELVYON sirve de algo no recibia
  // ni un dato, asi que `veredicto()` devolvia `desconocido` para siempre — con
  // toda la razon, porque nadie podia demostrar lo contrario.
  //
  // Va DESPUES de calidad, igual que el aprendizaje: atribuirse una mejora a
  // partir de una pieza que no ha pasado calidad es como se construyen los
  // informes de agencia que no significan nada.
  const { registrarEntregaComoAccion } = await import("../resultados/registrarEntregaComoAccion");
  await registrarEntregaComoAccion({
    clientId: trabajo.clientId,
    serviceId: trabajo.serviceId,
  });

  return { tipo: "completado", resultado: entregable };
};

/**
 * Registra el resultado para que el sistema pueda aprender de el.
 *
 * NUNCA hace fallar el trabajo. El aprendizaje es secundario respecto a la
 * entrega: si la base no esta, o el registro falla, el cliente ya tiene su
 * trabajo hecho y perderlo por no poder anotarlo seria absurdo.
 *
 * Lo que si hace es DEJAR CONSTANCIA de que no pudo anotarse, en vez de tragarse
 * el error: un bucle de aprendizaje que deja de recibir datos y no lo dice es
 * indistinguible de uno que funciona y no encuentra patrones.
 */
async function registrarParaAprender(
  trabajo: Parameters<ManejadorDeTrabajo>[0],
  resultado: unknown,
): Promise<void> {
  try {
    const { LearningService } = await import("../os-agents/learning/LearningService");
    const userId = (trabajo.payload.userId as string | undefined) ?? trabajo.clientId;
    // El sector sale del payload si viene; si no, el propio servicio identifica
    // la disciplina. Inventarse un sector agruparia aprendizajes de sitios
    // distintos bajo la misma etiqueta, que es peor que no agruparlos.
    const sector =
      (trabajo.payload.sector as string | undefined)
      ?? (trabajo.payload.industry as string | undefined)
      ?? trabajo.serviceId;
    await new LearningService().recordOutcome(
      userId,
      trabajo.serviceId,
      sector,
      trabajo.payload,
      resultado,
      "generated",
    );
  } catch (e) {
    // REDACTADO, no truncado. Truncar a 120 caracteres no protege nada: una
    // cadena de conexion con credenciales cabe de sobra en ese margen, y este
    // camino corre en produccion. Lo cazo la propia prueba de esta bateria.
    const { redactar } = await import("../seguridad/formaDeUnSecreto.mjs");
    const crudo = e instanceof Error ? e.message : "desconocido";
    console.warn(
      `[aprendizaje] no se pudo registrar el resultado de ${trabajo.serviceId}: `
        + `${String(redactar(crudo)).slice(0, 200)}`,
    );
  }
}

export { exigeAprobacion as exigeAprobacionParaPruebas, revisarCalidad as revisarCalidadParaPruebas };
