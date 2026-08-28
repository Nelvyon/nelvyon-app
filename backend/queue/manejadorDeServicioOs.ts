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

  return { tipo: "completado", resultado };
};

export { exigeAprobacion as exigeAprobacionParaPruebas };
