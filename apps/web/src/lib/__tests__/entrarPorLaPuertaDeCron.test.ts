/**
 * BLOQUE 7 · entrar por la puerta de cron.
 *
 * Dieciséis rutas bajo `api/cron/` disparan trabajo real sin ninguna sesión
 * detrás: cobros de morosidad, envíos de secuencias, publicaciones sociales,
 * volcado de contadores a Stripe, mantenimiento. Lo único que separa a un
 * anónimo de todo eso es una cadena en una cabecera.
 *
 * La composición de esta certificación tiene dos mitades y las dos hacen falta:
 *
 *   - El guardián estructural (`test_las_fronteras_no_se_abren_solas.py`)
 *     comprueba que **las dieciséis** llaman a una de las tres verificaciones.
 *     Sin eso, probar la puerta a fondo no diría nada sobre una ruta que no la
 *     usa.
 *   - Esta suite comprueba que **la puerta aguanta**, y lo hace además a través
 *     de una ruta real, porque un negativo verde que nunca llega a la defensa no
 *     certifica la defensa.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { verifyCronBearer, verifyCronFlexible, verifyCronHeader } from "../cronAuth";

const SECRETO = "secreto-de-cron-de-certificacion-bloque-7-largo";

const original = process.env.CRON_SECRET;

beforeEach(() => {
  process.env.CRON_SECRET = SECRETO;
});

afterEach(() => {
  if (original === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = original;
});

/** `null` significa «pasa». Cualquier respuesta significa «no pasa». */
const pasa = (r: unknown) => r === null;

describe("BLOQUE 7 · EL CONTROL: el disparador legítimo entra", () => {
  it("el secreto correcto abre las tres puertas", () => {
    /**
     * Sin este control, tres funciones que devolvieran siempre 401 pasarían
     * todos los ataques de abajo y dejarían dieciséis trabajos programados sin
     * ejecutarse jamás — que es una avería silenciosa de las peores, porque
     * nadie mira un cron que no falla, solo uno que no corre.
     */
    expect(pasa(verifyCronHeader(SECRETO))).toBe(true);
    expect(pasa(verifyCronBearer(`Bearer ${SECRETO}`))).toBe(true);
    expect(pasa(verifyCronFlexible(SECRETO, null))).toBe(true);
    expect(pasa(verifyCronFlexible(null, `Bearer ${SECRETO}`))).toBe(true);
  });
});

describe("BLOQUE 7 · no entrar", () => {
  const basura = [
    ["vacío", ""],
    ["solo espacios", "   "],
    ["nulo textual", "null"],
    ["indefinido textual", "undefined"],
    ["otro secreto", "no-es-el-secreto-pero-mide-parecido!!"],
  ] as const;

  for (const [nombre, valor] of basura) {
    it(`no se entra con ${nombre}`, () => {
      expect(pasa(verifyCronHeader(valor)), nombre).toBe(false);
      expect(pasa(verifyCronBearer(valor)), nombre).toBe(false);
      expect(pasa(verifyCronFlexible(valor, valor)), nombre).toBe(false);
    });
  }

  it("no se entra sin presentar nada", () => {
    expect(pasa(verifyCronHeader(null))).toBe(false);
    expect(pasa(verifyCronHeader(undefined))).toBe(false);
    expect(pasa(verifyCronBearer(null))).toBe(false);
    expect(pasa(verifyCronFlexible(null, null))).toBe(false);
  });

  it("un PREFIJO del secreto no vale", () => {
    /**
     * El ataque de adivinación por trozos: si la comparación cortara en el
     * primer carácter distinto, o si aceptara prefijos, se podría reconstruir el
     * secreto carácter a carácter. Aquí la longitud se compara antes, así que
     * ningún prefijo pasa.
     */
    for (let i = 1; i < SECRETO.length; i += 7) {
      expect(pasa(verifyCronHeader(SECRETO.slice(0, i))), `prefijo de ${i}`).toBe(false);
    }
  });

  it("el secreto con algo pegado detrás no vale", () => {
    expect(pasa(verifyCronHeader(`${SECRETO}x`))).toBe(false);
    expect(pasa(verifyCronHeader(`${SECRETO} `))).toBe(false);
    expect(pasa(verifyCronHeader(` ${SECRETO}`))).toBe(false);
    expect(pasa(verifyCronHeader(`${SECRETO}\n`))).toBe(false);
  });

  it("cambiarle las mayúsculas no vale", () => {
    expect(pasa(verifyCronHeader(SECRETO.toUpperCase()))).toBe(false);
  });
});

describe("BLOQUE 7 · sin secreto configurado NO se abre", () => {
  it("con `CRON_SECRET` sin poner, nada entra", () => {
    /**
     * La forma más fácil de dejar dieciséis trabajos al alcance de cualquiera es
     * desplegar sin la variable y que el código interprete «no hay secreto» como
     * «no hace falta secreto». Aquí no: sin secreto se cierra.
     */
    delete process.env.CRON_SECRET;
    expect(pasa(verifyCronHeader(""))).toBe(false);
    expect(pasa(verifyCronHeader("lo-que-sea"))).toBe(false);
    expect(pasa(verifyCronBearer("Bearer lo-que-sea"))).toBe(false);
    expect(pasa(verifyCronFlexible("", ""))).toBe(false);
  });

  it("con `CRON_SECRET` en blanco tampoco", () => {
    // `"   "` recortado es `""`, y `""` no puede ser una credencial válida: si
    // lo fuera, presentar una cabecera vacía abriría todo.
    process.env.CRON_SECRET = "   ";
    expect(pasa(verifyCronHeader(""))).toBe(false);
    expect(pasa(verifyCronHeader("   "))).toBe(false);
  });
});

describe("BLOQUE 7 · las dos vías de `verifyCronFlexible`", () => {
  it("una cabecera vacía no tapa un Bearer válido", () => {
    // `fromHeader || fromBearer`: si la cadena vacía no fuera falsa, el Bearer
    // correcto nunca se llegaría a mirar y el disparador legítimo se quedaría
    // fuera.
    expect(pasa(verifyCronFlexible("", `Bearer ${SECRETO}`))).toBe(true);
  });

  it("una cabecera EQUIVOCADA no se cae hacia el Bearer válido", () => {
    /**
     * Al revés importa igual: presentar un valor falso y uno bueno no debe
     * resolverse a favor del bueno. Da lo mismo para un atacante —que no tiene
     * ninguno de los dos— pero un «prueba todas las vías hasta que una pase» es
     * la forma en que estas puertas se ablandan con el tiempo.
     */
    expect(pasa(verifyCronFlexible("no-es", `Bearer ${SECRETO}`))).toBe(false);
  });

  it("el esquema en minúsculas no cuela", () => {
    // Documenta el comportamiento real: `bearer <secreto>` no se reconoce como
    // esquema, se toma entero como credencial, y no coincide. Es más estricto
    // que HTTP, pero cierra en falso, que es la dirección correcta.
    expect(pasa(verifyCronBearer(`bearer ${SECRETO}`))).toBe(false);
  });
});

describe("BLOQUE 7 · de extremo a extremo por una ruta real", () => {
  it("`/api/cron/status-check` no ejecuta nada sin el secreto", async () => {
    /**
     * La puerta puede estar perfecta y la ruta llamarla mal —o después de haber
     * hecho ya el trabajo—. Aquí se comprueba que la comprobación ocurre ANTES:
     * `runAllChecks` no debe llegar a llamarse.
     */
    const corridas: string[] = [];
    vi.doMock("@nelvyon/monitoring", () => ({
      runAllChecks: vi.fn(async (base: string) => {
        corridas.push(base);
      }),
    }));
    const { GET } = await import("../../app/api/cron/status-check/route");

    const sin = await GET(
      new Request("https://nelvyon.test/api/cron/status-check") as never,
    );
    expect(sin.status).toBe(401);
    expect(corridas, "el trabajo se ejecuto antes de comprobar el secreto").toHaveLength(0);

    const mal = await GET(
      new Request("https://nelvyon.test/api/cron/status-check", {
        headers: { "x-cron-secret": "no-es-el-secreto" },
      }) as never,
    );
    expect(mal.status).toBe(401);
    expect(corridas).toHaveLength(0);

    // EL CONTROL: con el secreto bueno el trabajo SÍ corre.
    const bien = await GET(
      new Request("https://nelvyon.test/api/cron/status-check", {
        headers: { "x-cron-secret": SECRETO },
      }) as never,
    );
    expect(bien.status).toBe(200);
    expect(corridas, "el disparador legitimo no ejecuto el trabajo").toHaveLength(1);
  });
});
