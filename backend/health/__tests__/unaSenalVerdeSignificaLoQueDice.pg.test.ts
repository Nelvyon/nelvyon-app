/**
 * BLOQUE 9 · una señal verde significa lo que dice.
 *
 * La propiedad fundamental de este bloque, y la más fácil de fingir. Un
 * `/health` que devuelve 200 pase lo que pase es peor que no tener `/health`:
 * el balanceador manda tráfico a un proceso inservible, el panel de guardia está
 * verde, y nadie se entera hasta que llaman los clientes.
 *
 * NELVYON reparte bien las sondas, y conviene decir por qué está bien antes de
 * atacarlas:
 *
 *   - `/health` y `/health/live` **no** consultan la base. Es lo correcto: una
 *     sonda de vida que dependiera de PostgreSQL reiniciaría todos los procesos
 *     durante un parpadeo de la base, convirtiendo un incidente pequeño en uno
 *     grande.
 *   - `/health/ready` **sí** la consulta, y devuelve 503 cuando no puede
 *     atender. Es lo que el balanceador mira para decidir si mandarle tráfico.
 *
 * Aquí se comprueban las dos mitades **provocando el fallo de verdad**, no
 * simulándolo: se apunta a una base que no existe y se mira qué dice cada sonda.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const DSN =
  process.env.NELVYON_PG_CERT_DSN ?? process.env.DATABASE_URL ?? process.env.NELVYON_B2_DSN ?? "";
const hayBase = Boolean(DSN);
const soloConBase = hayBase ? describe : describe.skip;

/** Una base que no existe, en el mismo servidor: el fallo es real, no un doble. */
const DSN_MUERTO = DSN.replace(/\/[^/]+$/, "/nelvyon_base_que_no_existe_b9");

const previo = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env.DATABASE_URL = DSN;
});

afterEach(() => {
  process.env = { ...previo };
  vi.resetModules();
});

/**
 * Ejecuta la sonda de disponibilidad contra el DSN que se le diga.
 *
 * Lo que hace que coja el DSN nuevo es `vi.resetModules()`, y solo eso:
 * `dbClientSingleton` vive a nivel de modulo, asi que al reiniciar el registro de
 * modulos vuelve a ser `undefined` y `getInstance()` lee el entorno otra vez.
 *
 * La primera version tambien llamaba a `resetDbClientForTests?.()` **que no
 * existe**. Con el encadenamiento opcional no fallaba: simplemente no hacia
 * nada, y la prueba pasaba por el motivo de al lado. Es la misma trampa que
 * «maquinaria sin llamador», del reves: una llamada a nada que parece hacer algo.
 */
async function sonda(dsn: string) {
  process.env.DATABASE_URL = dsn;
  vi.resetModules();
  const mod = await import("../healthChecks");
  return mod.checkDatabase();
}

soloConBase("BLOQUE 9 · la sonda de disponibilidad dice la verdad", () => {
  it("EL CONTROL: con la base viva, dice `ok` y trae su latencia", async () => {
    /**
     * Sin este control, una sonda que dijera `down` siempre pasaría el caso de
     * abajo y sacaría de servicio a todos los procesos sanos. Es la mitad que
     * convierte el negativo en evidencia.
     */
    const r = await sonda(DSN);
    expect(r.status, "la sonda dice que la base esta caida y NO lo esta").toBe("ok");
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
    expect(r.latencyMs).toBeLessThan(3_000);
  }, 30_000);

  it("con la base INUTILIZABLE, dice `down` — no `ok`", async () => {
    /**
     * El ataque a la señal. Se apunta a una base que no existe en el mismo
     * servidor: la conexión falla de verdad. Si la sonda siguiera diciendo `ok`,
     * el balanceador mandaría tráfico a un proceso que no puede atender nada.
     */
    const r = await sonda(DSN_MUERTO);
    expect(
      r.status,
      "la sonda dice `ok` con la base inutilizable: la senal verde no significa nada",
    ).toBe("down");
  }, 30_000);

  it("cuando dice `down`, NO revela por qué a quien pregunta", async () => {
    /**
     * Una sonda pública que devuelve el mensaje de PostgreSQL regala el nombre de
     * la base, el del rol y a veces el del servidor. El detalle va a los
     * registros; a la respuesta va un mensaje genérico.
     */
    const r = await sonda(DSN_MUERTO);
    const texto = JSON.stringify(r).toLowerCase();
    expect(texto).not.toContain("password");
    expect(texto, "la sonda filtra el nombre de la base en su respuesta").not.toContain(
      "nelvyon_base_que_no_existe_b9",
    );
  }, 30_000);

  it("la sonda tiene PLAZO: no se queda esperando a una base que no contesta", async () => {
    /**
     * Una sonda sin plazo es peor que ninguna: el balanceador se queda esperando
     * la respuesta de la sonda, la da por fallida por su propio plazo, y el
     * proceso entra y sale de servicio sin que nadie sepa por qué.
     *
     * Se mide el tiempo real que tarda en decir `down`.
     */
    const t = Date.now();
    const r = await sonda(DSN_MUERTO);
    const ms = Date.now() - t;
    console.info(`la sonda tardo ${ms}ms en declarar la base caida`);
    expect(r.status).toBe("down");
    expect(ms, "la sonda no respeta su plazo de 3s").toBeLessThan(8_000);
  }, 30_000);
});

soloConBase("BLOQUE 9 · la sonda de VIDA no depende de la base", () => {
  it("`/health/live` responde aunque la base esté inutilizable", async () => {
    /**
     * Esto no es un descuido: es la decisión correcta y merece quedar asegurada.
     * Si la sonda de vida consultara PostgreSQL, un parpadeo de la base
     * reiniciaría todos los procesos a la vez — convirtiendo un incidente de
     * treinta segundos en uno de varios minutos, con el arranque en frío de todo
     * el parque encima.
     *
     * La sonda de VIDA responde «el proceso está vivo». La de DISPONIBILIDAD
     * responde «puede atender». Son preguntas distintas y confundirlas cuesta
     * caro en las dos direcciones.
     */
    process.env.DATABASE_URL = DSN_MUERTO;
    vi.resetModules();
    const { GET } = await import("../../../apps/web/src/app/api/health/live/route");
    const t = Date.now();
    const res = await GET();
    const ms = Date.now() - t;
    expect(res.status, "la sonda de vida se cayo con la base").toBe(200);
    expect(ms, "la sonda de vida tardo demasiado: seguro que toca la base").toBeLessThan(1_000);
  }, 30_000);

  it("la sonda de vida NO menciona la base en su código", async () => {
    /**
     * La comprobación estructural que acompaña a la de comportamiento: hoy
     * responde rápido porque no toca la base, y esto lo deja fijado para que
     * nadie le añada una consulta «para que sea más completa».
     */
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "../../apps/web/src/app/api/health/live/route.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/DbClient|checkDatabase|pg\.Pool|SELECT/i);
  });
});
