/**
 * UN ERROR DE PROVEEDOR NO SE GUARDA EN CRUDO EN LA BASE DE DATOS.
 *
 * CÓMO SE ENCONTRÓ. Auditando `lote2AgentStepRunner.ts` —once líneas, 21
 * importadores, doce familias de agentes—. No tenía ningún defecto propio: sólo
 * envuelve el error del modelo y lo relanza. Pero eso llevó a mirar QUÉ error
 * está envolviendo, y de ahí salió esto:
 *
 *     `OpenAI returned non-JSON (HTTP ${res.status}). First bytes: ${raw.slice(0, 200)}`
 *
 * Los primeros bytes CRUDOS de la respuesta del proveedor. Y ese mensaje viaja:
 *
 *     LlmClient
 *       -> completeLlmStep lo envuelve
 *       -> el agente lo relanza
 *       -> el trabajador lo captura
 *       -> cola.fallar(jobId, causa, ...)
 *       -> UPDATE os_jobs SET error = ..., last_error = ...
 *
 * QUÉ PUEDE HABER EN ESOS BYTES. Cuando un proveedor devuelve algo que no es
 * JSON, casi nunca es el proveedor: es un proxy, una pasarela o un cortafuegos
 * en medio. Y ésos **devuelven la petición**, cabeceras incluidas — donde viaja
 * `Authorization: Bearer …`.
 *
 * Y OTRA VEZ LA MISMA LECCIÓN: `slice(0, 200)` es un recorte, y recortar no
 * protege. En una cabecera, los primeros caracteres son justo los del token.
 *
 * DÓNDE SE ARREGLA, Y POR QUÉ EN DOS SITIOS. En el origen (`LlmClient`) para
 * que el valor no viaje. Y en `cola.fallar`, que es el cuello por donde pasa
 * TODO error antes de convertirse en una fila — no sólo los del modelo — y
 * donde quien escriba mañana un `throw` nuevo no tiene por qué acordarse.
 *
 * TODOS LOS SECRETOS DE ESTE FICHERO SON SINTÉTICOS. Probar una defensa contra
 * fugas con una credencial real sería exactamente el error que evita.
 *
 * COSTE EXTERNO: 0 €. La base va doblada.
 */
import { describe, expect, it, vi } from "vitest";

import { ColaDeTrabajos } from "../colaDeTrabajos";

/**
 * Los tokens de estas pruebas se MONTAN EN EJECUCION, en trozos.
 *
 * Necesitan la forma exacta de una clave de proyecto de OpenAI —si no la
 * tuvieran, no comprobarian que el redactor la reconoce—, y una cadena con esa
 * forma es indistinguible de una viva mirando el fichero. GitHub rechazo un
 * push entero por una igual. En el fuente no queda ninguna cadena con forma de
 * credencial; en memoria, durante la prueba, si, que es donde hace falta.
 *
 * Es lo mismo que hace `backend/seguridad/__tests__/secretosDeMentira.ts`. No
 * se importa de alli para que esta bateria no dependa de otro paquete de
 * pruebas por dos constantes.
 */
const montar = (...piezas: readonly string[]) => piezas.join("");
const PREFIJO_OPENAI = montar("sk", "-", "proj", "-");
const TOKEN_INVENTADO = montar(PREFIJO_OPENAI, "TokenCompletamenteInventado123");
const TOKEN_LARGO = montar(PREFIJO_OPENAI, "TokenQueCruzaElLimiteDeDosMil");


/** Una base doblada que sólo apunta lo que se le manda escribir. */
function baseQueApunta() {
  const consultas: Array<{ sql: string; params: unknown[] }> = [];
  const db = {
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      consultas.push({ sql, params });
      return { rows: [] as unknown[] };
    }),
    withTransaction: vi.fn(async (fn: (c: unknown) => Promise<unknown>) => fn(db)),
  };
  return { db, consultas };
}

/** Lo que `fallar` acabaría guardando en `os_jobs.error`. */
async function loQueSeGuarda(mensajeDelError: string): Promise<string> {
  const { db, consultas } = baseQueApunta();
  const cola = new ColaDeTrabajos(db as never, { identidad: "prueba" });
  await cola.fallar("j1", new Error(mensajeDelError), 3, 3);
  const escritura = consultas.find((c) => /UPDATE os_jobs/i.test(c.sql));
  expect(escritura, "no se ha escrito nada").toBeDefined();
  return String(escritura!.params[1] ?? "");
}

describe("lo que un proxy devuelve no acaba en la base", () => {
  it("LA REGLA: una cabecera Authorization no se persiste", async () => {
    // La forma exacta de lo que devuelve una pasarela que rechaza la petición
    // y la echa de vuelta. El token es inventado.
    const respuestaDelProxy =
      "OpenAI returned non-JSON (HTTP 502). First bytes: " +
      "<html>502 Bad Gateway<br>Request: POST /v1/chat/completions<br>" +
      `Authorization: Bearer ${TOKEN_INVENTADO}<br></html>`;

    const guardado = await loQueSeGuarda(respuestaDelProxy);
    expect(guardado).not.toContain(TOKEN_INVENTADO);
    expect(guardado).toContain("<REDACTADO>");
  });

  it("ni recortada: el prefijo del token tampoco", async () => {
    // Es la lección concreta. Un secreto truncado sigue siendo material
    // sensible, y en un token los primeros caracteres son los que más valen.
    const token = TOKEN_INVENTADO;
    const guardado = await loQueSeGuarda(`fallo: Authorization: Bearer ${token}`);
    for (const n of [10, 16, 24]) {
      expect(guardado, `filtra los primeros ${n} caracteres`).not.toContain(token.slice(0, n));
    }
  });

  it("tampoco una cadena de conexión que venga en un error", async () => {
    // `fallar` persiste errores de CUALQUIER procedencia, no sólo del modelo.
    const guardado = await loQueSeGuarda(
      "connect ECONNREFUSED postgres://usr:ClaveInventadaAqui@db.interno:5432/nelvyon",
    );
    expect(guardado).not.toContain("ClaveInventadaAqui");
  });

  it("ni una cookie de sesión", async () => {
    const guardado = await loQueSeGuarda("upstream dijo: Cookie: session=abcdef1234567890abcdef");
    expect(guardado).not.toContain("abcdef1234567890abcdef");
  });
});

describe("el mensaje sigue sirviendo para diagnosticar", () => {
  it("EL CONTROL: un error normal se guarda intacto", async () => {
    /**
     * La otra mitad, y la que impide el remedio peor que la enfermedad. Una
     * redacción que borrara de más dejaría los fallos indiagnosticables: el
     * trabajo caería a `dead_letter` con un mensaje que no dice nada, y eso es
     * exactamente lo que este sistema intenta no hacer.
     */
    const normal = "OsAgentError: seo_keywords: Ollama returned an empty completion.";
    expect(await loQueSeGuarda(normal)).toBe(normal);
  });

  it("se conserva el código de estado y el nombre del paso", async () => {
    // Lo que hace falta para saber qué falló y dónde.
    const guardado = await loQueSeGuarda(
      "seo_audit: OpenAI returned non-JSON (HTTP 502). First bytes: <html>gateway</html>",
    );
    expect(guardado).toContain("seo_audit");
    expect(guardado).toContain("502");
  });

  it("el recorte a 2000 caracteres sigue en pie", async () => {
    // Redactar no puede quitar el tope: un error de megabytes llenaría la
    // tabla. Se redacta ANTES y se recorta después.
    const guardado = await loQueSeGuarda("x".repeat(5000));
    expect(guardado.length).toBe(2000);
  });

  it("EL ORDEN IMPORTA: se redacta ANTES de recortar", async () => {
    /**
     * ESTE CASO LO DESTAPÓ UNA MUTACIÓN QUE SOBREVIVÍA. Cambiar
     * `redactar(crudo).slice(2000)` por `redactar(crudo.slice(2000))` no rompía
     * ninguna prueba, porque todos los mensajes de aquí caben en 2000
     * caracteres.
     *
     * Pero con un mensaje largo el orden decide: si se recorta primero y el
     * token CRUZA el límite, lo que queda es un prefijo de token que ya no
     * tiene forma de token — así que el redactor no lo reconoce y el prefijo
     * se guarda.
     *
     * Es la misma trampa de siempre con una vuelta de tuerca: no es que
     * recortar no proteja, es que recortar puede DESACTIVAR la protección.
     */
    const token = TOKEN_LARGO;
    // Se coloca el token a caballo del corte: empieza antes de 2000 y acaba
    // después.
    // El relleno acaba en espacio: sin frontera de palabra antes del token, el
    // `\b` del redactor no engancha —y eso es correcto, es lo que impide que
    // «ask-me-anything» se tache—. Aqui se mide el ORDEN, no la frontera.
    const relleno = `${"y".repeat(2000 - Math.floor(token.length / 2) - 1)} `;
    const guardado = await loQueSeGuarda(`${relleno}${token} final`);

    expect(guardado).not.toContain(token.slice(0, 12));
    expect(guardado).not.toContain(token.slice(0, 20));
  });
});

describe("la capa de origen: LlmClient no interpola bytes crudos", () => {
  /**
   * POR QUE SE COMPRUEBA SOBRE EL FUENTE Y NO EJECUTANDO `LlmClient`.
   *
   * Ejercitar esa ruta exige armar el camino de OpenAI: `AUTONOMOUS_ALLOW_OPENAI=1`
   * y una `OPENAI_API_KEY`. Aunque se doble `fetch`, eso es encender —aunque sea
   * en una prueba— el interruptor de un proveedor DE PAGO. La regla de coste
   * cero de este proyecto es absoluta, y un doble que fallara dejaria salir una
   * llamada real.
   *
   * El valor marginal, ademas, es bajo: el resultado YA esta protegido por
   * `cola.fallar` —el cuello por donde pasa todo error antes de persistirse— y
   * eso si esta probado ejecutandolo. Esta capa es defensa en profundidad:
   * sirve para que el secreto no VIAJE, no para que no se guarde.
   *
   * Asi que se comprueba lo que se puede sin encender nada: que en el fuente no
   * quede ninguna interpolacion de `raw` sin pasar por `redactar`.
   */
  it("LA REGLA: cada uso de `raw` en un mensaje de error va redactado", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const fuente = fs.readFileSync(
      path.resolve(__dirname, "..", "..", "os-agents", "LlmClient.ts"),
      "utf8",
    );

    const usos = [...fuente.matchAll(/\$\{([^{}]*\braw\b[^{}]*)\}/g)].map((m) => m[1]);
    expect(usos.length, "no se encuentra ningun uso de `raw`: cambio el fichero?").toBeGreaterThan(0);

    const sinRedactar = usos.filter((u) => !u.includes("redactar"));
    expect(
      sinRedactar,
      `bytes crudos del proveedor sin redactar:\n  ${sinRedactar.join("\n  ")}`,
    ).toEqual([]);
  });

  it("y CUALQUIER forma en que `raw` llegue a un mensaje", async () => {
    /**
     * La primera version de esta prueba solo miraba las interpolaciones
     * `${...}`. Se le escapaba la otra forma, que es una asignacion:
     *
     *     const msg = redactar(parsed.error?.message ?? raw).slice(0, 400);
     *
     * Quitar el `redactar` de ahi NO rompia nada. Ahora se comprueban las tres
     * formas en que los bytes crudos pueden acabar en un mensaje: interpolados,
     * recortados, o como valor por defecto de un `??`.
     */
    const fs = await import("node:fs");
    const path = await import("node:path");
    const fuente = fs.readFileSync(
      path.resolve(__dirname, "..", "..", "os-agents", "LlmClient.ts"),
      "utf8",
    ).replace(/\r\n/g, "\n");

    const PELIGROSAS = [/\?\?\s*raw\b/, /\$\{[^{}]*\braw\b/, /\braw\.slice\(/];
    const sinRedactar: string[] = [];
    for (const linea of fuente.split("\n")) {
      const codigo = linea.replace(/^\s*(\/\/|\*).*$/, "");
      if (!PELIGROSAS.some((re) => re.test(codigo))) continue;
      if (codigo.includes("redactar")) continue;
      sinRedactar.push(linea.trim().slice(0, 110));
    }
    expect(
      sinRedactar,
      `bytes crudos del proveedor sin redactar:\n  ${sinRedactar.join("\n  ")}`,
    ).toEqual([]);
  });
});


describe("el reintento guarda lo mismo que el descarte", () => {
  it("un fallo que aún tiene intentos también se redacta", async () => {
    // Sin esto, la redacción cubriría sólo `dead_letter` y un trabajo que
    // reintenta tres veces escribiría el secreto tres veces.
    const { db, consultas } = baseQueApunta();
    const cola = new ColaDeTrabajos(db as never, { identidad: "prueba" });
    await cola.fallar("j1", new Error("Authorization: Bearer sk-InventadoParaLaPrueba123"), 1, 3);
    const escritura = consultas.find((c) => /UPDATE os_jobs/i.test(c.sql));
    expect(String(escritura!.params[1] ?? "")).not.toContain("sk-InventadoParaLaPrueba123");
  });
});
