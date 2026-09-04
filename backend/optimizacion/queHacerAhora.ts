/**
 * De «cómo va» a «y por eso hacemos esto».
 *
 * ── EL HUECO QUE CIERRA ─────────────────────────────────────────────────────
 *
 * `MotorDeResultados` dice si algo mejoró. `MotorDeOptimizacion` dice qué hacer
 * con esa respuesta. Los dos están construidos, probados y documentados.
 *
 * Y no se conocían. `MotorDeOptimizacion` sólo lo importaba `PoliticaDeOptimizacion`
 * —su propia vecina de carpeta— y `MotorDeResultados` no lo importaba nadie. El
 * bucle estaba escrito en dos mitades que nunca se tocaron:
 *
 *     objetivo → línea base → acción → medida → RESULTADO ║ DECISIÓN → acción…
 *                                                          ↑
 *                                              aquí no había nada
 *
 * Este módulo es esa juntura. No añade lógica: compone.
 *
 * ── NO EJECUTA ──────────────────────────────────────────────────────────────
 *
 * Devuelve qué haría. Mover algo de verdad pasa por sus puertas y, si tiene
 * consecuencias hacia fuera, por una persona. Un módulo que decide Y ejecuta es
 * un módulo que no se puede leer sin miedo.
 *
 * ── LO QUE NO SE PUEDE JUZGAR TODAVÍA, Y POR QUÉ ────────────────────────────
 *
 * `MotorDeOptimizacion` necesita el TAMAÑO DE MUESTRA de cada medida: es lo que
 * le permite distinguir «no cambió» de «no hay datos suficientes», que es la
 * distinción que —según su propia cabecera— lo separa de un generador de
 * cambios.
 *
 * `os_mediciones` no guarda ese dato. Guarda el valor, el periodo y la fuente.
 *
 * Para una métrica de RECUENTO —leads, conversiones, ventas— el valor ES el
 * número de observaciones, así que la muestra se conoce. Para una métrica de
 * RATIO —coste por lead, tasa de conversión, ROAS— no: un 3 % puede venir de
 * 3 conversiones sobre 100 o de 3.000 sobre 100.000, y son cosas muy distintas.
 *
 * En esos casos se declara muestra 0, que el motor lee como «no hay datos
 * suficientes» y responde `esperar_datos`. Es la respuesta correcta: no
 * sabemos. Fingir una muestra para obtener una decisión bonita sería
 * exactamente el fallo que los dos motores están escritos para evitar.
 *
 * Arreglarlo del todo pide una columna `muestra` en `os_mediciones` — o sea, una
 * escritura en producción, que no se hace sin permiso.
 */
import {
  MotorDeOptimizacion,
  type Decision,
  type Medida,
  type Situacion,
} from "./MotorDeOptimizacion";

import type { AlmacenDeResultados, Veredicto } from "../resultados/MotorDeResultados";
import { MotorDeResultados } from "../resultados/MotorDeResultados";

/**
 * Métricas cuyo valor ES el número de observaciones.
 *
 * Sólo de éstas se puede afirmar la muestra sin inventarla. La lista es corta a
 * propósito: ante la duda, una métrica va fuera y el motor dirá que no sabe.
 */
const METRICAS_DE_RECUENTO = new Set([
  "leads",
  "conversiones",
  "ventas",
  "pedidos",
  "citas",
  "registros",
  "sesiones",
  "visitas",
  "clics",
  "impresiones",
  "llamadas",
  "formularios",
]);

function esRecuento(metrica: string): boolean {
  return METRICAS_DE_RECUENTO.has(metrica.trim().toLowerCase());
}

/**
 * La muestra que sostiene un valor.
 *
 * Devuelve 0 —«no se sabe»— para todo lo que no sea un recuento. Cero no es una
 * estimación baja: es la ausencia de dato, y el motor la trata como tal.
 */
function muestraDe(metrica: string, valor: number): number {
  return esRecuento(metrica) && Number.isFinite(valor) && valor >= 0 ? Math.round(valor) : 0;
}

/** Traduce un veredicto de resultados a la situación que entiende el otro motor. */
export function situacionDesdeVeredicto(
  serviceId: string,
  metrica: string,
  veredicto: Veredicto,
  hasta: string,
): Situacion {
  if (veredicto.estado !== "medido") {
    // Sin línea base o sin medición posterior no hay nada que decidir, y decirlo
    // es la respuesta correcta.
    return { serviceId, lineaBase: null, historial: [] };
  }

  const linea: Medida = {
    metrica,
    valor: veredicto.lineaBase,
    muestra: muestraDe(metrica, veredicto.lineaBase),
    hasta,
  };
  const actual: Medida = {
    metrica,
    valor: veredicto.actual,
    muestra: muestraDe(metrica, veredicto.actual),
    hasta,
  };

  return {
    serviceId,
    lineaBase: linea,
    historial: [actual],
    // Cuántas acciones hubo entre medio ya lo cuenta el motor de resultados. Es
    // lo que impide atribuir una mejora a algo que se hizo después de medirla.
    ciclosSinMejora: veredicto.mejoraPorcentual > 0 ? 0 : 1,
  };
}

export type Recomendacion = {
  objetivoId: string;
  metrica: string;
  veredicto: Veredicto;
  decision: Decision;
};

/**
 * Qué debería hacerse ahora con cada objetivo activo de un cliente.
 *
 * Es de solo lectura: consulta y decide. Nada de lo que devuelve se ejecuta.
 */
export async function queHacerAhora(
  db: AlmacenDeResultados,
  params: { workspaceId: number; clientId: string; serviceId: string },
): Promise<Recomendacion[]> {
  const resultados = new MotorDeResultados(db);
  const optimizacion = new MotorDeOptimizacion();
  const ahora = new Date().toISOString();

  const panel = await resultados.panel(params.workspaceId, params.clientId);

  return panel.map(({ objetivo, veredicto }) => ({
    objetivoId: objetivo.id,
    metrica: objetivo.metrica,
    veredicto,
    decision: optimizacion.decidir(
      situacionDesdeVeredicto(params.serviceId, objetivo.metrica, veredicto, ahora),
    ),
  }));
}
