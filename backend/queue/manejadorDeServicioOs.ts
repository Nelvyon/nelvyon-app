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

export const manejadorDeServicioOs: ManejadorDeTrabajo = async (
  trabajo,
): Promise<ResultadoDeManejador> => {
  const salida = await osOrchestrator.processQueuedJob({
    jobId: trabajo.jobId,
    serviceId: trabajo.serviceId,
    clientId: trabajo.clientId,
    payload: trabajo.payload,
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
  await registrarParaAprender(trabajo, resultado);

  return { tipo: "completado", resultado };
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

export { exigeAprobacion as exigeAprobacionParaPruebas };
