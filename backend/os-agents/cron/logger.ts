import { redactar } from "../../seguridad/loQueNoSeImprime.mjs";

/**
 * El registro de los crons.
 *
 * QUÉ TENÍA. Ocho líneas que pasaban lo recibido a `console` tal cual. Con 18
 * importadores, y tres de sus ocho llamadas pasando el ERROR CRUDO:
 *
 *     logger.error(`[CRON] Error encolando ${svc.service_id}:`, err);
 *     logger.error("[CRON] Error en mantenimiento mensual:", err);
 *     logger.error("[CRON] Error en health check semanal:", err);
 *
 * Un fallo de conexión de PostgreSQL trae la cadena entera en su mensaje
 * —`connect ECONNREFUSED postgres://usuario:clave@host:5432/base`— y de ahí iba
 * directo a los registros de la plataforma, donde se queda.
 *
 * LAS TRES REGLAS QUE CUMPLE AHORA, y las tres importan por separado:
 *
 *   1. NO IMPRIME SECRETOS. Todo pasa por `redactar`, que sustituye lo que
 *      tiene FORMA de secreto y deja intacto lo demás. Un mensaje de error
 *      normal sale igual que antes; hay una prueba de control que lo fija,
 *      porque una redacción que borrara de más dejaría los crons
 *      indiagnosticables — el problema contrario, no una solución.
 *
 *   2. NO ROMPE EL PROCESO QUE OBSERVA. Un objeto circular, un `toString` que
 *      lanza, un `Proxy` hostil: nada de eso puede tumbar un cron. Si algo
 *      falla al preparar la línea, se escribe lo que se pueda y se sigue.
 *
 *   3. NO CONVIERTE UN ERROR EN UN ÉXITO. `error()` sigue escribiendo por
 *      `console.error` e `info()` por `console.info`. Tragarse un fallo para
 *      que la línea salga limpia sería peor que la fuga.
 *
 * LO QUE NO HACE, y conviene decirlo: no añade identificadores de correlación,
 * ni atribución de inquilino, ni de trabajo. Eso exigiría cambiar las dieciocho
 * llamadas y es una decisión de diseño, no un arreglo de seguridad. Los
 * mensajes actuales ya llevan `tenant=` donde hace falta.
 */

/** Un valor listo para escribir: sin secretos y sin poder reventar. */
export function seguro(arg: unknown): unknown {
  try {
    if (typeof arg === "string") return redactar(arg);

    if (arg instanceof Error) {
      // Se convierte a texto A PROPÓSITO. `console` formatea un `Error` mejor
      // que esto, pero lo formatea SIN redactar — y aquí la seguridad manda
      // sobre la estética. La pila se conserva: es lo que sirve para
      // diagnosticar.
      const partes = [`${arg.name}: ${arg.message}`];
      if (arg.stack) partes.push(arg.stack);
      const causa = (arg as Error & { cause?: unknown }).cause;
      if (causa !== undefined) partes.push(`causa: ${String(causa)}`);
      return redactar(partes.join("\n"));
    }

    if (arg === null || arg === undefined || typeof arg !== "object") {
      return redactar(String(arg));
    }

    // Un objeto circular hace que `JSON.stringify` lance. No puede tumbar un
    // cron por intentar escribir una línea.
    return redactar(JSON.stringify(arg));
  } catch {
    return "[valor no representable]";
  }
}

function escribir(salida: (...a: unknown[]) => void, args: unknown[]): void {
  try {
    salida(...args.map(seguro));
  } catch {
    // Si hasta escribir falla, se calla. Un registro que revienta es peor que
    // un registro que falta: el primero se lleva por delante el trabajo que
    // estaba observando.
  }
}

export const logger = {
  info: (...args: unknown[]) => {
    escribir((...a) => console.info(...a), args);
  },
  error: (...args: unknown[]) => {
    escribir((...a) => console.error(...a), args);
  },
};
