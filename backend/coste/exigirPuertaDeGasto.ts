/**
 * Una linea para no gastar sin permiso.
 *
 * ── POR QUE EXISTE ──────────────────────────────────────────────────────────
 *
 * `PoliticaDeCosteCero` clasifica proveedores y operaciones y decide bien. El
 * problema nunca fue la politica: fue que los modulos que gastan no le
 * preguntaban. Se encontraron NUEVE, en sitios sin relacion entre si —campanas
 * de Google y Meta, SMS, llamadas, WhatsApp— y en todos la politica ya tenia el
 * proveedor clasificado como `PAID`.
 *
 * El patron comun era otro, y explica por que se repitio: lo unico que frenaba
 * cada uno era que faltaran credenciales. Una guarda por AUSENCIA. Funciona
 * mientras nadie configure nada, y desaparece sola el dia que alguien lo hace
 * —que es el objetivo del producto— sin que ninguna prueba se ponga roja.
 *
 * Preguntar a la politica costaba ocho lineas repetidas. Ahora cuesta una, y
 * una linea si se pone.
 *
 * ── FALLA CERRADO ───────────────────────────────────────────────────────────
 *
 * Si la politica deniega, LANZA. No devuelve `false` para que quien llama
 * decida, porque el patron `if (!puede) return` se olvida y entonces el gasto
 * ocurre igual. Y no degrada a una simulacion silenciosa: quien llamo cree que
 * ha enviado un mensaje o creado una campana, y merece enterarse de que no.
 *
 * ── DEJA RASTRO SIEMPRE ─────────────────────────────────────────────────────
 *
 * Apunta la decision se permita o no. Sin el apunte, la politica solo existe
 * mientras alguien la mira; con el se puede contestar despues a «quien autorizo
 * esto y cuanto costo», que es la pregunta que se hace cuando ya ha pasado.
 */
import { apuntar, decidirCoste, type OperacionConCoste } from "./PoliticaDeCosteCero";

/** Se lanza cuando la politica de coste deniega una operacion. */
export class GastoDenegadoError extends Error {
  constructor(
    readonly proveedor: string,
    readonly operacion: string,
    readonly motivo: string,
    porQue: string,
  ) {
    super(`gasto denegado por la politica (${motivo}): ${operacion} en ${proveedor} — ${porQue}`);
    this.name = "GastoDenegadoError";
  }
}

/**
 * Pregunta a la politica y lanza si dice que no.
 *
 * @example
 *   exigirPuertaDeGasto({ proveedor: "twilio", operacion: "enviar_sms", tenantId });
 */
export function exigirPuertaDeGasto(op: OperacionConCoste): void {
  const veredicto = decidirCoste(op);
  apuntar(op, veredicto);
  if (veredicto.permitido !== true) {
    throw new GastoDenegadoError(op.proveedor, op.operacion, veredicto.motivo, veredicto.porQue);
  }
}
