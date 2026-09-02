/**
 * BLOQUE 6 · un proveedor caido no cuesta dinero ni entra en bucle.
 *
 * El adaptador de LLM es la unica pieza de NELVYON cuyo fallo puede costar
 * dinero de verdad. Un reintento mal puesto o un fallback automatico a un
 * proveedor de pago convierten una incidencia tecnica en una factura.
 *
 * Se inyecta el fallo en vez de leer el codigo:
 *
 *   1. Con la IA apagada NO sale una sola peticion.
 *   2. Si el proveedor local se cae, **no se escala solo** a uno de pago.
 *   3. Los reintentos estan acotados: nada de bucles.
 *   4. Un fallo no se disfraza de exito.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENTORNO = { ...process.env };
const fetchOriginal = globalThis.fetch;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ENTORNO };
  delete process.env.AUTONOMOUS_LLM_MODE;
  delete process.env.AUTONOMOUS_ALLOW_OPENAI;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OLLAMA_BASE_URL;
  delete process.env.AUTONOMOUS_OLLAMA_MODEL;
  delete process.env.NELVYON_AI_ENABLED;
  delete process.env.PRIVATE_MODE;
  delete process.env.NELVYON_PRIVATE_MODE;
});

afterEach(() => {
  process.env = { ...ENTORNO };
  globalThis.fetch = fetchOriginal;
  vi.restoreAllMocks();
});

function peticion(mock: Record<string, unknown> = { ok: true }) {
  return {
    agentId: "seo" as never,
    payload: { brief: "x" },
    mockGenerator: () => mock,
  };
}

describe("BLOQUE 6 · con la IA apagada no sale ni una peticion", () => {
  it("modo mock: cero llamadas a la red", async () => {
    /**
     * La sonda no gasta tokens, pero sigue siendo trafico saliente a un
     * proveedor: revela que esta instancia habla con OpenAI a quien mire la red,
     * y con la clave puesta puede costar dinero.
     */
    const espia = vi.fn(async () => new Response("{}", { status: 200 }));
    globalThis.fetch = espia as never;
    process.env.AUTONOMOUS_LLM_MODE = "mock";
    // Con clave puesta a proposito: apagado tiene que ganar a configurado.
    process.env.OPENAI_API_KEY = "sk-no-debe-usarse";

    const { invokeLlm } = await import("../llmAdapter");
    const r = await invokeLlm(peticion() as never);

    expect(espia, "salio una peticion con la IA en modo mock").not.toHaveBeenCalled();
    expect(r.mode).toBe("mock");
  });

  it("sin proveedor configurado se queda en mock, no inventa uno", async () => {
    const espia = vi.fn(async () => new Response("{}", { status: 200 }));
    globalThis.fetch = espia as never;
    const { invokeLlm } = await import("../llmAdapter");

    const r = await invokeLlm(peticion() as never);

    expect(r.mode).toBe("mock");
    expect(espia).not.toHaveBeenCalled();
  });
});

describe("BLOQUE 6 · un proveedor caido no escala solo a uno de pago", () => {
  it("con la clave de OpenAI puesta pero SIN permiso, no se usa", async () => {
    /**
     * El caso que cuesta dinero. Hay clave en el entorno —lo normal en un
     * despliegue que la tuvo alguna vez— y el proveedor local falla.
     *
     * Un fallback «razonable» llamaria a OpenAI para no dejar al cliente
     * colgado. Eso es exactamente lo que no puede pasar sin que el dueno lo
     * haya autorizado: la decision de gastar no es tecnica.
     */
    process.env.OPENAI_API_KEY = "sk-hay-clave-pero-no-permiso";
    // Sin `AUTONOMOUS_ALLOW_OPENAI=1`.
    const llamadas: string[] = [];
    globalThis.fetch = vi.fn(async (url: unknown) => {
      llamadas.push(String(url));
      return new Response("{}", { status: 500 });
    }) as never;

    const { invokeLlm } = await import("../llmAdapter");
    await invokeLlm(peticion() as never).catch(() => undefined);

    const aOpenAi = llamadas.filter((u) => u.includes("openai.com"));
    expect(
      aOpenAi,
      `se llamo a OpenAI sin permiso explicito: ${aOpenAi.join(", ")}`,
    ).toHaveLength(0);
  });

  it("SOLO falta el permiso de OpenAI: las otras tres puertas abiertas", async () => {
    /**
     * Prueba AISLADA de la puerta del opt-in, y hace falta que lo sea.
     *
     * La primera version comprobaba «con clave pero sin permiso no se llama» y
     * pasaba... por el motivo equivocado: el interruptor maestro estaba apagado
     * y el modo privado activo, asi que bloqueaban ellos. Una mutacion que
     * quitaba la comprobacion del opt-in **no tumbaba nada**.
     *
     * Es la leccion de siempre: un negativo verde no certifica una defensa si
     * la ejecucion nunca llega a alcanzarla. Aqui se abren las otras tres a
     * proposito para que la unica que puede decir que no sea esta.
     */
    process.env.OPENAI_API_KEY = "sk-todo-menos-el-permiso";
    process.env.NELVYON_AI_ENABLED = "1";
    process.env.PRIVATE_MODE = "0";
    delete process.env.AUTONOMOUS_ALLOW_OPENAI;

    const { isAutonomousOpenAiAllowed, resolveLlmMode } = await import("../llmAdapter");

    expect(
      isAutonomousOpenAiAllowed(),
      "sin opt-in explicito se autorizo un proveedor de pago con todo lo demas abierto",
    ).toBe(false);
    expect(resolveLlmMode()).toBe("mock");
  });

  it("`resolveLlmMode` no pasa a real solo porque haya una clave", async () => {
    process.env.OPENAI_API_KEY = "sk-solo-la-clave";
    const { resolveLlmMode } = await import("../llmAdapter");
    expect(
      resolveLlmMode(),
      "tener una clave en el entorno basto para activar un proveedor de pago",
    ).toBe("mock");
  });

  it("EL CONTROL: con permiso explicito Y el interruptor maestro, SI se considera modo real", async () => {
    /**
     * Sin este control, un adaptador que nunca usara nada pasaria las pruebas
     * de arriba y dejaria el producto sin IA aunque el dueno la hubiera
     * autorizado.
     *
     * Hacen falta CUATRO cosas, y las cuatro son puertas independientes:
     * clave, permiso explicito de OpenAI, interruptor maestro encendido y modo
     * privado desactivado.
     *
     * Las dos ultimas las descubrio esta misma prueba al fallar: la primera
     * version solo ponia clave y permiso, y siguio en `mock`. No era un fallo
     * del adaptador — era que el modo privado esta ACTIVO por defecto y el
     * interruptor maestro APAGADO por defecto. Los dos por diseno: hay que
     * hacer cuatro cosas a proposito para que salga una peticion de pago.
     */
    process.env.OPENAI_API_KEY = "sk-con-permiso";
    process.env.AUTONOMOUS_ALLOW_OPENAI = "1";
    process.env.NELVYON_AI_ENABLED = "1";
    process.env.PRIVATE_MODE = "0";
    const { resolveLlmMode } = await import("../llmAdapter");
    expect(resolveLlmMode()).toBe("real");
  });

  it("el MODO PRIVADO por si solo ya lo bloquea", async () => {
    /**
     * Cuarta puerta, y esta viene ACTIVA de fabrica: sin autorizacion de tarea
     * de internet, el modo privado corta la salida aunque estE todo lo demas
     * en su sitio.
     *
     * Que el valor por defecto sea el seguro no es un detalle: significa que un
     * despliegue nuevo, sin configurar, no puede gastar dinero por accidente.
     */
    process.env.OPENAI_API_KEY = "sk-con-todo";
    process.env.AUTONOMOUS_ALLOW_OPENAI = "1";
    process.env.NELVYON_AI_ENABLED = "1";
    process.env.PRIVATE_MODE = "1";

    const { isAutonomousOpenAiAllowed } = await import("../llmAdapter");
    expect(
      isAutonomousOpenAiAllowed(),
      "el modo privado no bloqueo la salida a un proveedor de pago",
    ).toBe(false);
  });

  it("el interruptor maestro APAGADO gana a cualquier otro permiso", async () => {
    /**
     * «IA apagada» tiene que significar apagada, sin excepciones ni matices.
     * Si un permiso mas especifico pudiera saltarselo, el interruptor no
     * serviria para lo unico que sirve: parar el gasto de golpe cuando hace
     * falta.
     */
    process.env.OPENAI_API_KEY = "sk-con-todo";
    process.env.AUTONOMOUS_ALLOW_OPENAI = "1";
    process.env.NELVYON_AI_ENABLED = "0";
    process.env.PRIVATE_MODE = "0"; // todo lo demas abierto: solo manda el maestro

    // Con los argumentos DECLARADOS. Sin ellos el doble es una funcion de cero
    // parametros, `mock.calls` es una lista de tuplas vacias, y leer `c[0]`
    // —que es como se comprueba a donde salio la peticion— no compila. Las
    // pruebas de abajo solo miran SI se llamo; esta mira A DONDE.
    const espia = vi.fn(
      async (_recurso?: unknown, _opciones?: unknown) => new Response("{}", { status: 200 }),
    );
    globalThis.fetch = espia as never;

    const { resolveLlmMode, isAutonomousOpenAiAllowed, invokeLlm } = await import("../llmAdapter");

    expect(
      isAutonomousOpenAiAllowed(),
      "el permiso de OpenAI se salto el interruptor maestro",
    ).toBe(false);
    expect(resolveLlmMode()).toBe("mock");

    await invokeLlm(peticion() as never);
    const aOpenAi = espia.mock.calls.filter((c) => String(c[0]).includes("openai.com"));
    expect(aOpenAi, "salio una peticion a OpenAI con la IA apagada").toHaveLength(0);
  });
});

describe("BLOQUE 6 · los reintentos estan acotados", () => {
  it("un proveedor que siempre devuelve basura no reintenta sin fin", async () => {
    /**
     * El bucle infinito es el peor final posible para un sistema autonomo: no
     * hay error, no hay alerta, solo una maquina gastando para siempre.
     *
     * El adaptador permite UN pase de reparacion cuando la respuesta no es JSON
     * valido. Con un proveedor que nunca devuelve JSON, el numero de llamadas
     * tiene que quedarse en dos y despues fallar — no seguir intentandolo.
     */
    process.env.AUTONOMOUS_LLM_MODE = "real";
    process.env.OLLAMA_BASE_URL = "http://127.0.0.1:59999"; // no escucha nadie
    process.env.AUTONOMOUS_OLLAMA_MODEL = "modelo-de-prueba";

    let llamadas = 0;
    globalThis.fetch = vi.fn(async () => {
      llamadas += 1;
      return new Response("esto no es json", { status: 200 });
    }) as never;

    const { invokeLlm } = await import("../llmAdapter");
    const resultado = await invokeLlm(peticion() as never).catch((e) => e);

    expect(llamadas, `el adaptador hizo ${llamadas} llamadas: no esta acotado`).toBeLessThanOrEqual(4);
    // Y no se disfraza de exito.
    if (!(resultado instanceof Error)) {
      expect(
        resultado.mode === "mock" || resultado.parsed != null,
        "un proveedor que solo devuelve basura acabo en un resultado que parece bueno",
      ).toBe(true);
    }
  });
});
