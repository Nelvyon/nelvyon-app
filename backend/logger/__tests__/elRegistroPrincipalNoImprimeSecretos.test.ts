/**
 * EL REGISTRO PRINCIPAL NO IMPRIME SECRETOS. NI EN EL MENSAJE.
 *
 * `backend/logger/logger.ts` lo usa media aplicacion. Tenia `sanitizeMeta` con
 * una lista de cinco nombres prohibidos, y tres agujeros:
 *
 *   1. EL MENSAJE NO SE MIRABA. `emit()` escribia `message` literal, asi que
 *
 *          logger.error(`no se pudo conectar a ${DATABASE_URL}`)
 *
 *      salia entero. Y esa es la forma NATURAL de escribir un log: interpolar
 *      el dato en la frase. Pedir que nadie lo haga nunca no es una politica,
 *      es una esperanza.
 *
 *   2. EL NOMBRE SE COMPARABA ENTERO: `FORBIDDEN_KEYS.has(key.toLowerCase())`.
 *      Quitaba `authorization`... y dejaba pasar `accessToken`,
 *      `refreshToken`, `apiKey`, `client_secret`, `set-cookie` y
 *      `databaseUrl`, porque ninguno es exactamente una de las cinco palabras.
 *
 *   3. LOS ARRAYS NO SE RECORRIAN: la condicion llevaba `!Array.isArray(value)`,
 *      asi que un array se copiaba tal cual — cabeceras como pares, listas de
 *      objetos con claves dentro.
 *
 * COSTE EXTERNO: 0 EUR. Se captura la salida de consola; no se escribe nada.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createLogger, sanitizeMeta } from "../logger";
import {
  DSN_CONTRASENA,
  DSN_CON_CLAVE,
  JWT,
  JWT_PREFIJO,
  OPENAI_PROYECTO,
  STRIPE_RESTRINGIDA,
} from "../../seguridad/__tests__/secretosDeMentira";

/**
 * Secretos de mentira con forma real, montados en trozos.
 *
 * NO son literales, y no es un capricho: un literal con la forma exacta de una
 * clave viva ES una clave viva para cualquier escaner. GitHub rechazo un push
 * entero por la que habia aqui —«Stripe Live API Restricted Key»— y tenia
 * razon: mirando el fichero, nadie podia saber que era inventada.
 */
const CLAVE_OPENAI = OPENAI_PROYECTO;
const CLAVE_STRIPE = STRIPE_RESTRINGIDA;
const DSN = DSN_CON_CLAVE;
const BEARER = `Bearer ${JWT}`;

let salida: string[];

beforeEach(() => {
  salida = [];
  for (const via of ["log", "warn", "error"] as const) {
    vi.spyOn(console, via).mockImplementation((...args: unknown[]) => {
      salida.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
    });
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

const todo = () => salida.join("\n");

describe("el MENSAJE se redacta, que era lo que mas se escapaba", () => {
  it("una cadena de conexion interpolada en el mensaje no sale", () => {
    createLogger("prueba").error(`no se pudo conectar a ${DSN}`);
    expect(todo(), "la cadena de conexion salio en el mensaje").not.toContain(DSN_CONTRASENA);
  });

  it("una clave de proveedor interpolada en el mensaje no sale", () => {
    createLogger("prueba").warn(`el proveedor rechazo la clave ${CLAVE_OPENAI}`);
    expect(todo()).not.toContain(CLAVE_OPENAI);
  });

  it("y una cabecera de autorizacion, tampoco", () => {
    createLogger("prueba").error(`fallo con cabecera ${BEARER}`);
    expect(todo()).not.toContain(JWT_PREFIJO);
  });

  it("EL CONTROL: el mensaje sigue siendo legible cuando no hay secreto", () => {
    // Sin esto, un redactor que borrara el mensaje entero pasaria todo lo de
    // arriba y dejaria los registros inservibles. Redactar de mas destruye la
    // observabilidad, que es justo para lo que existe el registro.
    createLogger("prueba").info("el trabajo 4210 termino en 3.2 s con 18 resultados");
    expect(todo()).toContain("el trabajo 4210 termino");
    expect(todo()).toContain("18 resultados");
  });
});

describe("el nombre de la clave se juzga por su FORMA, no por igualdad", () => {
  const NOMBRES = [
    "accessToken",
    "refreshToken",
    "apiKey",
    "api_key",
    "client_secret",
    "databaseUrl",
    "sessionCookie",
  ];

  for (const nombre of NOMBRES) {
    it(`«${nombre}» no llega a la salida`, () => {
      const limpio = sanitizeMeta({ [nombre]: CLAVE_STRIPE });
      expect(JSON.stringify(limpio), `${nombre} salio entero`).not.toContain(CLAVE_STRIPE);
    });
  }

  it("y tapa tambien cuando el VALOR no parece nada", () => {
    /**
     * ESTA ES LA QUE MIDE EL CHEQUEO DEL NOMBRE, y hubo que anadirla.
     *
     * Las de arriba usaban un valor con forma de clave, asi que `redactar` lo
     * tapaba por la forma aunque el nombre pasara. Dos defensas cubriendo el
     * mismo caso: quitar la del nombre no rompia nada, y se comprobo con una
     * mutacion.
     *
     * Aqui el valor es una cadena corta y anodina que ningun detector de forma
     * puede reconocer. Lo unico que puede taparla es el nombre de la clave — y
     * un secreto corto sigue siendo un secreto.
     */
    const corto = "hunter2";
    for (const nombre of ["apiKey", "accessToken", "client_secret", "sessionCookie"]) {
      const limpio = sanitizeMeta({ [nombre]: corto });
      expect(JSON.stringify(limpio), `${nombre} con un valor anodino salio entero`).not.toContain(
        corto,
      );
    }
  });

  it("y los cinco de siempre siguen tapados", () => {
    const limpio = sanitizeMeta({
      password: "loquesea",
      token: CLAVE_OPENAI,
      secret: CLAVE_STRIPE,
      authorization: BEARER,
      cookie: "sid=abc",
    });
    expect(Object.keys(limpio)).toEqual([]);
  });

  it("EL CONTROL: un nombre inocente SI llega", () => {
    // Sin esto, un `esNombreSensible` que dijera que si a todo pasaria las
    // pruebas de arriba y vaciaria los registros.
    const limpio = sanitizeMeta({ jobId: 4210, duracionMs: 3200, resultados: 18 });
    expect(limpio).toEqual({ jobId: 4210, duracionMs: 3200, resultados: 18 });
  });
});

describe("los valores se miran aunque el nombre sea inocente", () => {
  it("un secreto guardado bajo `dato` no sale", () => {
    const limpio = sanitizeMeta({ dato: CLAVE_OPENAI });
    expect(JSON.stringify(limpio)).not.toContain(CLAVE_OPENAI);
  });

  it("una cadena de conexion guardada bajo `config`, tampoco", () => {
    const limpio = sanitizeMeta({ config: `usa ${DSN} para conectar` });
    expect(JSON.stringify(limpio)).not.toContain(DSN_CONTRASENA);
  });
});

describe("los arrays se recorren", () => {
  it("cabeceras como pares no salen enteras", () => {
    const limpio = sanitizeMeta({ headers: [["authorization", BEARER]] });
    expect(JSON.stringify(limpio), "un array de pares salio tal cual").not.toContain(
      JWT_PREFIJO,
    );
  });

  it("una lista de objetos con claves dentro, tampoco", () => {
    const limpio = sanitizeMeta({ intentos: [{ apiKey: CLAVE_STRIPE }, { nota: "ok" }] });
    expect(JSON.stringify(limpio)).not.toContain(CLAVE_STRIPE);
  });

  it("EL CONTROL: un array sin secretos sobrevive entero", () => {
    const limpio = sanitizeMeta({ ids: [1, 2, 3], etapas: ["intake", "qa"] });
    expect(limpio).toEqual({ ids: [1, 2, 3], etapas: ["intake", "qa"] });
  });
});

describe("el saneador no se cuelga con lo que se le pasa de verdad", () => {
  /**
   * ── UN REGISTRADOR QUE SE CUELGA ES PEOR QUE UNO QUE FILTRA ──────────────
   *
   * La version del lado web NO recorria los objetos anidados. Al hacer que
   * bajara —para tapar `{ headers: { authorization: ... } }`— aparecio el
   * problema de siempre con cualquier recorrido: un objeto que se referencia a
   * si mismo no termina nunca.
   *
   * Y no es rebuscado: lo que se pasa a un registro son precisamente las cosas
   * que tienen ciclos —un cliente de un proveedor, un pool de conexiones, una
   * peticion HTTP, un doble de prueba—. Dos pruebas de `saasInboxS38` se
   * quedaron colgadas hasta agotar los 60 segundos de plazo. No fallaban: se
   * colgaban, y se llevaban por delante a quien las llamo.
   */
  it("un objeto que se referencia a si mismo no lo cuelga", () => {
    const ciclico: Record<string, unknown> = { nombre: "raiz" };
    ciclico.yo = ciclico;
    const limpio = sanitizeMeta({ ciclico }) as { ciclico: Record<string, unknown> };
    expect(limpio.ciclico.nombre).toBe("raiz");
    expect(limpio.ciclico.yo).toBe("[circular]");
  });

  it("ni un ciclo indirecto, de ida y vuelta", () => {
    const a: Record<string, unknown> = { quien: "a" };
    const b: Record<string, unknown> = { quien: "b", a };
    a.b = b;
    const limpio = JSON.stringify(sanitizeMeta({ a }));
    expect(limpio).toContain("[circular]");
  });

  it("ni un ciclo dentro de un array", () => {
    const lista: unknown[] = [1, 2];
    lista.push(lista);
    expect(JSON.stringify(sanitizeMeta({ lista }))).toContain("[circular]");
  });

  it("y una estructura muy honda se corta en vez de costar lo que quiera", () => {
    let hondo: Record<string, unknown> = { fin: true };
    for (let i = 0; i < 40; i += 1) hondo = { dentro: hondo };
    expect(JSON.stringify(sanitizeMeta({ hondo }))).toContain("[demasiado hondo]");
  });

  it("EL CONTROL: una estructura normal se conserva entera", () => {
    // Sin esto, cortar a la primera pasaria todo lo de arriba y dejaria los
    // registros sin nada dentro.
    const limpio = sanitizeMeta({ a: { b: { c: { d: "valor" } } } }) as Record<string, never>;
    expect(JSON.stringify(limpio)).toContain("valor");
  });
});

describe("los errores tampoco cuelan su mensaje", () => {
  it("el mensaje de un Error se redacta", () => {
    const limpio = sanitizeMeta({ causa: new Error(`upstream dijo: ${CLAVE_OPENAI}`) });
    expect(JSON.stringify(limpio)).not.toContain(CLAVE_OPENAI);
  });

  it("EL CONTROL: el nombre y el resto del mensaje se conservan", () => {
    const limpio = sanitizeMeta({ causa: new TypeError("no es una funcion") }) as {
      causa: { name: string; message: string };
    };
    expect(limpio.causa.name).toBe("TypeError");
    expect(limpio.causa.message).toContain("no es una funcion");
  });
});

describe("no se pierde lo que hace util un registro", () => {
  it("el contexto, el nivel y los identificadores siguen saliendo", () => {
    /**
     * Redactar de mas es el otro fallo, y es igual de caro: un registro sin
     * identificadores no sirve para diagnosticar nada. Se comprueba que lo que
     * hace falta para correlacionar sigue ahi.
     */
    createLogger("cola").error("el trabajo fallo", {
      jobId: "abc-123",
      tenantId: "11111111-2222-4000-8000-333333333333",
      workspaceId: 101,
      serviceId: "NELVYON-SEO",
    });
    const texto = todo();
    expect(texto).toContain("cola");
    expect(texto).toContain("abc-123");
    expect(texto).toContain("101");
    expect(texto).toContain("NELVYON-SEO");
  });
});
