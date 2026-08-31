/**
 * UN CRON NO ESCRIBE SU CADENA DE CONEXIÓN EN LOS REGISTROS.
 *
 * QUÉ TENÍA. Ocho líneas que pasaban lo recibido a `console` tal cual, con 18
 * importadores. Y tres de sus ocho llamadas pasan el ERROR CRUDO:
 *
 *     logger.error(`[CRON] Error encolando ${svc.service_id}:`, err);
 *     logger.error("[CRON] Error en mantenimiento mensual:", err);
 *     logger.error("[CRON] Error en health check semanal:", err);
 *
 * Un fallo de conexión de PostgreSQL trae la cadena entera en su mensaje
 * —`connect ECONNREFUSED postgres://usuario:clave@host:5432/base`— y de ahí iba
 * a los registros de la plataforma, donde se queda.
 *
 * LAS TRES REGLAS QUE SE PRUEBAN, y son tres cosas distintas:
 *
 *   1. no imprime secretos;
 *   2. no rompe el proceso que observa;
 *   3. no convierte un error en un éxito.
 *
 * La segunda es la que suele olvidarse. Un registro que revienta es PEOR que un
 * registro que falta: el primero se lleva por delante el trabajo que estaba
 * observando. Por eso se prueba con un objeto circular, con un `toString` que
 * lanza y con un `console` que falla.
 *
 * TODOS LOS SECRETOS SON SINTÉTICOS.
 *
 * COSTE EXTERNO: 0 €. No se escribe en ningún sitio real.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { logger, seguro } from "../cron/logger";

/** Recoge lo que el logger habría escrito, sin ensuciar la salida. */
function capturando<T>(fn: () => T): { escrito: string; salida: T } {
  const info = vi.spyOn(console, "info").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const salida = fn();
    const todo = [...info.mock.calls, ...error.mock.calls]
      .flat()
      .map((x) => (typeof x === "string" ? x : JSON.stringify(x)))
      .join(" ");
    return { escrito: todo, salida };
  } finally {
    info.mockRestore();
    error.mockRestore();
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("1 · no imprime secretos", () => {
  it("LA REGLA: la cadena de conexión de un error de base no se escribe", () => {
    // El caso exacto de `OsCronMaintenance`: se le pasa el error crudo.
    const err = new Error(
      "connect ECONNREFUSED postgres://nelvyon:ClaveInventadaAqui@db.interno:5432/nelvyon",
    );
    const { escrito } = capturando(() => logger.error("[CRON] Error encolando seo:", err));
    expect(escrito).not.toContain("ClaveInventadaAqui");
    expect(escrito).toContain("<REDACTADO>");
  });

  it("un secreto en una cadena suelta tampoco", () => {
    // Sin este caso, quitar la redaccion de las CADENAS no rompia nada: todos
    // los demas casos meten el secreto dentro de un Error o de un objeto.
    const { escrito } = capturando(() =>
      logger.info("[CRON] usando postgres://u:ClaveSueltaFalsa@h:5432/d"),
    );
    expect(escrito).not.toContain("ClaveSueltaFalsa");
  });

  it("tampoco un token dentro de un objeto", () => {
    const { escrito } = capturando(() =>
      logger.info("[CRON] estado", { authorization: "Bearer sk-InventadoParaLaPrueba1234" }),
    );
    expect(escrito).not.toContain("sk-InventadoParaLaPrueba1234");
  });

  it("ni en la causa encadenada de un error", () => {
    // `cause` es donde acaban las credenciales cuando alguien envuelve un error
    // de base en uno de dominio.
    const err = new Error("fallo al encolar", {
      cause: "postgres://u:OtraClaveFalsa@h:5432/d",
    });
    const { escrito } = capturando(() => logger.error("[CRON]", err));
    expect(escrito).not.toContain("OtraClaveFalsa");

    // Y SIGUE ESTANDO, redactada. Sin esta segunda mitad, DESCARTAR la causa
    // pasaria la prueba igual de bien que redactarla — y perder la causa es
    // perder justo el dato que explica el fallo.
    expect(escrito).toContain("causa:");
    expect(escrito).toContain("postgres://u:<REDACTADO>@h:5432/d");
  });

  it("EL CONTROL: un mensaje normal se escribe intacto", () => {
    /**
     * La otra mitad. Una redacción que borrara de más dejaría los crons
     * indiagnosticables, que es el problema contrario y no una solución.
     */
    const normal = "[CRON] 12 servicios activos encontrados";
    const { escrito } = capturando(() => logger.info(normal));
    expect(escrito).toContain(normal);
  });

  it("y la pila del error se conserva: es lo que sirve para diagnosticar", () => {
    const err = new Error("algo se rompio");
    const { escrito } = capturando(() => logger.error("[CRON]", err));
    expect(escrito).toContain("algo se rompio");
    expect(escrito).toMatch(/Error:/);
  });
});

describe("2 · no rompe el proceso que observa", () => {
  it("LA REGLA: un objeto circular no tumba el cron", () => {
    // `JSON.stringify` lanza con una referencia circular. Un cron no puede
    // caerse por intentar escribir una línea.
    const circular: Record<string, unknown> = { nombre: "ciclo" };
    circular.yo = circular;
    expect(() => capturando(() => logger.info("[CRON]", circular))).not.toThrow();
  });

  it("un `toString` que lanza tampoco", () => {
    const hostil = {
      toString() {
        throw new Error("no me conviertas");
      },
    };
    expect(() => capturando(() => logger.error("[CRON]", hostil))).not.toThrow();
  });

  it("ni un `console` que falla", () => {
    // Si hasta escribir falla, se calla. Propagar dejaría al cron muerto por
    // culpa del registro.
    const espia = vi.spyOn(console, "error").mockImplementation(() => {
      throw new Error("stdout cerrado");
    });
    try {
      expect(() => logger.error("[CRON] algo")).not.toThrow();
    } finally {
      espia.mockRestore();
    }
  });

  it("valores raros: undefined, null, símbolos, funciones", () => {
    expect(() =>
      capturando(() => logger.info("[CRON]", undefined, null, Symbol("s"), () => 1, 0n)),
    ).not.toThrow();
  });

  it("EL CONTROL: `seguro` devuelve algo legible ante lo irrepresentable", () => {
    // No basta con no lanzar: si devolviera `undefined`, la línea diría menos
    // que nada y el fallo quedaría invisible.
    const hostil = {
      toJSON() {
        throw new Error("tampoco");
      },
    };
    expect(seguro(hostil)).toBe("[valor no representable]");
  });
});

describe("3 · no convierte un error en un éxito", () => {
  it("LA REGLA: `error` sigue escribiendo por console.error", () => {
    // Tragarse un fallo para que la línea salga limpia sería peor que la fuga:
    // el cron parecería haber ido bien.
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      logger.error("[CRON] fallo");
      expect(error).toHaveBeenCalledTimes(1);
      expect(info).not.toHaveBeenCalled();
    } finally {
      info.mockRestore();
      error.mockRestore();
    }
  });

  it("y `info` por console.info", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      logger.info("[CRON] ok");
      expect(info).toHaveBeenCalledTimes(1);
      expect(error).not.toHaveBeenCalled();
    } finally {
      info.mockRestore();
      error.mockRestore();
    }
  });

  it("se escribe SIEMPRE algo, aunque el valor no se pueda representar", () => {
    // Un registro que decide callarse porque el argumento es raro deja el
    // suceso sin rastro.
    const circular: Record<string, unknown> = {};
    circular.yo = circular;
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      logger.error("[CRON] fallo", circular);
      expect(error).toHaveBeenCalledTimes(1);
    } finally {
      error.mockRestore();
    }
  });
});
