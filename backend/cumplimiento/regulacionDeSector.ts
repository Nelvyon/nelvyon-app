/**
 * ¿ESTE SECTOR ESTÁ REGULADO? UNA SOLA RESPUESTA, PARA TODO EL SISTEMA.
 *
 * HABÍA TRES FUENTES Y NO COINCIDÍAN. Medido:
 *
 *   1. `REGULATED_SECTORS` en `OsRegulatedSectorShieldService`, 11 valores:
 *      dental, legal, beauty, solar, seguros, contabilidad, medical, pharmacy,
 *      finance, salud, clinica.
 *
 *   2. `SECTOR_REGISTRY` en `autonomous/sectors`, 20 sectores de los que 6
 *      llevan `regulated: true`: dental, legal, beauty, solar, seguros,
 *      contabilidad.
 *
 *   3. `packOrchestrator.ts`, escrito a mano:
 *      `intake.sector === "dental" || intake.sector === "fintech_b2b"`.
 *
 * LA TERCERA ERA LA PELIGROSA. Alimenta `compliance_flags.regulated_sector`, y
 * `scorer.ts` tiene la comprobación `L-CNT-03` —marcada como CRÍTICA— que exige
 * aviso legal en la copia SÓLO si esa bandera es cierta. Con dos sectores
 * escritos a mano, un pack de farmacia o de despacho jurídico aprobaba el
 * control de calidad sin llevar aviso. Y marcaba `fintech_b2b`, que no aparece
 * en ninguna de las otras dos listas.
 *
 * ── POR QUÉ SON TRES VEREDICTOS Y NO DOS ──────────────────────────────────
 *
 * Lo primero que se ve al ponerlas juntas es que **1 y 2 no hablan del mismo
 * espacio de claves**. Los cinco que sobran en el escudo —`medical`,
 * `pharmacy`, `finance`, `salud`, `clinica`— NO existen entre los 20 valores de
 * `AutonomousSector`: vienen del perfil del cliente SaaS, que es texto libre.
 *
 * Fusionarlas sería inventar una equivalencia que no hay. Así que no se
 * fusionan: se consultan las dos, y cuando ninguna reconoce el identificador la
 * respuesta es **`DESCONOCIDO`**, que es distinto de «no regulado».
 *
 *     REGULADO      hay evidencia de que lo está
 *     NO_REGULADO   hay evidencia de que NO lo está
 *     DESCONOCIDO   nadie lo reconoce — y eso NO es lo mismo que estar limpio
 *
 * `DESCONOCIDO` existe porque un sector nuevo, un identificador mal escrito o
 * uno que venga de una integración caerían antes en «no regulado» por omisión.
 * Un sector que nadie reconoce no ha demostrado que no necesite aviso legal:
 * simplemente no se ha mirado.
 *
 * QUÉ HACE CADA CONSUMIDOR CON `DESCONOCIDO` es decisión suya y está escrita en
 * su sitio. Este módulo no decide: informa. Pero la política del proyecto es
 * explícita y ninguno puede tratarlo como seguro.
 *
 * COSTE EXTERNO: 0 €. Sólo listas.
 */

/** Lo que se puede saber de un sector. Tres estados, no dos. */
export type VeredictoDeRegulacion = "REGULADO" | "NO_REGULADO" | "DESCONOCIDO";

/**
 * Sectores regulados del espacio de identificadores LIBRE (perfil SaaS).
 *
 * Es la lista del escudo, que es la que gobierna el aviso legal europeo. Se
 * mantiene aquí para que haya UN sitio donde mirarla, y el escudo la importa.
 *
 * `salud` y `clinica` están porque son los identificadores en castellano del
 * mismo supuesto sanitario que `medical` y `dental`. No son duplicados
 * cosméticos: son lo que de verdad escribe un cliente español.
 */
export const SECTORES_REGULADOS_LIBRES: ReadonlySet<string> = new Set([
  "dental",
  "legal",
  "beauty",
  "solar",
  "seguros",
  "contabilidad",
  "medical",
  "pharmacy",
  "finance",
  "salud",
  "clinica",
  /**
   * `fintech_b2b` viene del tercer sitio: `packOrchestrator` lo marcaba como
   * regulado a mano, junto con `dental`. No esta ni en el escudo ni en el enum,
   * asi que al unificar habria caido a `DESCONOCIDO` y habria PERDIDO la
   * exigencia de aviso legal que ya tenia. Se conserva porque es evidencia de
   * un productor real, no una suposicion: alguien decidio que un fintech B2B
   * necesita aviso, y unificar no puede deshacer eso en silencio.
   */
  "fintech_b2b",
]);

/**
 * Los 20 sectores del enum `AutonomousSector`, con su bandera.
 *
 * SE COPIA AQUÍ EN VEZ DE IMPORTAR `SECTOR_REGISTRY`, y es a propósito: ese
 * módulo arrastra las 19 fichas completas con sus contextos de prompt, y este
 * fichero lo importan sitios —el orquestador de packs, el escudo— que no
 * necesitan nada de eso. La prueba `laFuenteCanonicaNoSeSepara` compara las dos
 * listas y falla si divergen, que es lo que hace segura la copia.
 */
const REGULADOS_DEL_ENUM: ReadonlySet<string> = new Set([
  "dental",
  "legal",
  "beauty",
  "solar",
  "seguros",
  "contabilidad",
]);

/** Los 20 identificadores que el enum reconoce, regulados o no. */
const CONOCIDOS_DEL_ENUM: ReadonlySet<string> = new Set([
  "dental",
  "legal",
  "fitness",
  "beauty",
  "restaurant",
  "real_estate",
  "ecommerce",
  "saas_b2b",
  "solar",
  "coaching",
  "veterinaria",
  "educacion",
  "turismo",
  "construccion",
  "automocion",
  "logistica",
  "seguros",
  "contabilidad",
  "hosteleria",
  "tecnologia",
]);

/** Normaliza como lo haría cualquiera al escribirlo: sin espacios, minúsculas. */
function normalizar(sectorId: unknown): string {
  return typeof sectorId === "string" ? sectorId.trim().toLowerCase() : "";
}

/**
 * El veredicto para un identificador de sector, venga de donde venga.
 *
 * El orden importa: primero se busca entre los regulados —de cualquiera de los
 * dos espacios—, y sólo si NINGUNO lo reconoce se distingue entre «conocido y
 * no regulado» y «desconocido».
 */
export function regulacionDe(sectorId: unknown): VeredictoDeRegulacion {
  const s = normalizar(sectorId);
  if (!s) return "DESCONOCIDO";
  if (SECTORES_REGULADOS_LIBRES.has(s) || REGULADOS_DEL_ENUM.has(s)) return "REGULADO";
  if (CONOCIDOS_DEL_ENUM.has(s)) return "NO_REGULADO";
  return "DESCONOCIDO";
}

/**
 * ¿Hay que tratarlo como regulado?
 *
 * `DESCONOCIDO` cuenta que SÍ. Es la política del proyecto escrita en una
 * función, para que ningún consumidor tenga que acordarse:
 *
 *     UNKNOWN != SAFE · ERROR != SAFE · MISSING != SAFE
 *
 * Como mucho pide un aviso legal de más, y eso se ve y se corrige. Publicar un
 * claim prohibido en un sector regulado no se deshace.
 */
export function tratarComoRegulado(sectorId: unknown): boolean {
  return regulacionDe(sectorId) !== "NO_REGULADO";
}
