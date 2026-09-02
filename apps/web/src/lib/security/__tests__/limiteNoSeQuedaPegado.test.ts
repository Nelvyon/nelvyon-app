/**
 * Una ventana de limite que no caduca deja al cliente bloqueado PARA SIEMPRE.
 *
 * EL DEFECTO
 * ----------
 * El contador de Upstash se montaba con DOS peticiones:
 *
 *     INCR clave                 <- atomica, correcta
 *     if (count === 1) EXPIRE clave ventana   <- segunda peticion, sin comprobar
 *
 * La segunda no miraba `.ok` ni tenia `.catch`. Si fallaba —un corte de red, un
 * 500 de Upstash, el proceso reciclado justo en medio— la clave se quedaba SIN
 * CADUCIDAD. Y una clave de ventana fija sin caducidad no vuelve a cero nunca:
 * cada peticion siguiente la incrementa, el contador pasa el techo y esa IP
 * recibe 429 de forma permanente para esa regla.
 *
 * Peor en las reglas de autenticacion: el cliente afectado no puede volver a
 * entrar, y nada en el sistema lo delata, porque desde fuera se ve exactamente
 * igual que un limite funcionando.
 *
 * EL ARREGLO
 * ----------
 * `INCR` y `EXPIRE ... NX` en una sola llamada al endpoint `pipeline` de
 * Upstash. Una peticion en vez de dos, sin ventana entre ellas donde perder el
 * `EXPIRE`, y `NX` deja intacta la caducidad ya puesta en vez de reiniciarla
 * —que convertiria la ventana fija en una ventana deslizante que no acaba nunca.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkIpRateLimit } from "../rateLimit";

const REGLA = { id: "prueba", limit: 3, windowSec: 60 } as const;

/** Un Upstash de mentira que apunta lo que se le pide. */
function upstashFalso(opciones: { fallaExpire?: boolean } = {}) {
  const llamadas: string[] = [];
  const contadores = new Map<string, number>();
  const caducidad = new Map<string, number>();
  /** Cada vez que se ESCRIBE una caducidad. Sirve para ver si se refresca. */
  const refrescos: string[] = [];

  const fetchFalso = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    llamadas.push(u);

    if (u.includes("/pipeline")) {
      // Se EJECUTAN los comandos que vienen en el cuerpo, no se dan por hechos.
      //
      // La primera version daba por supuesto «INCR y luego EXPIRE NX» y ponia la
      // caducidad solo si faltaba, hiciera lo que hiciera el codigo real. Con eso,
      // quitar el `NX` no rompia ninguna prueba: el comentario afirmaba que el NX
      // importaba y nada lo comprobaba. Lo encontro la mutacion.
      const comandos = JSON.parse(String(init?.body ?? "[]")) as string[][];
      const salida = comandos.map(([cmd, clave, arg, bandera]) => {
        if (cmd === "INCR") {
          const n = (contadores.get(clave) ?? 0) + 1;
          contadores.set(clave, n);
          return { result: n };
        }
        if (cmd === "EXPIRE") {
          if (opciones.fallaExpire) return { error: "ERR simulado" };
          // `NX` = solo si no habia caducidad. Sin la bandera, se pisa.
          if (bandera === "NX" && caducidad.has(clave)) return { result: 0 };
          caducidad.set(clave, Number(arg));
          refrescos.push(clave);
          return { result: 1 };
        }
        return { result: null };
      });
      return new Response(JSON.stringify(salida), { status: 200 });
    }
    if (u.includes("/incr/")) {
      const clave = "k";
      const n = (contadores.get(clave) ?? 0) + 1;
      contadores.set(clave, n);
      return new Response(JSON.stringify({ result: n }), { status: 200 });
    }
    if (u.includes("/expire/")) {
      if (opciones.fallaExpire) return new Response("boom", { status: 500 });
      caducidad.set("k", REGLA.windowSec);
      return new Response(JSON.stringify({ result: 1 }), { status: 200 });
    }
    return new Response("{}", { status: 200 });
  });

  /** La caducidad de la unica clave en juego, sin tener que escribirla a mano.
   *
   * Las aserciones usaban la constante `"k"` de cuando el simulador inventaba la
   * clave. Al pasar a ejecutar los comandos de verdad, la clave real es
   * `ratelimit:<regla>:<ip>` y `caducidad.get("k")` devolvia `undefined`
   * SIEMPRE — con lo que la prueba de fallo-cerrado habria pasado por el motivo
   * equivocado. Lo delato el control positivo. */
  const caducidadDeLaClave = () => [...caducidad.values()][0];

  return { fetchFalso, llamadas, caducidad, contadores, refrescos, caducidadDeLaClave };
}

const ENTORNO = { ...process.env };
beforeEach(() => {
  process.env.UPSTASH_REDIS_REST_URL = "https://falso.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "t";
  delete process.env.RATE_LIMIT_DISABLED;
});
afterEach(() => {
  process.env = { ...ENTORNO };
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("la ventana del limite siempre caduca", () => {
  it("un EXPIRE con error NO se da por bueno", async () => {
    // La afirmacion original era «la clave nace con caducidad aunque falle el
    // segundo paso». Con la tuberia ya no HAY segundo paso que perder, asi que
    // esa frase dejo de significar nada: la reemplaza lo que si es observable.
    //
    // Si la respuesta dice que el EXPIRE fallo, la ventana no caducaria, y una
    // regla critica tiene que CERRARSE en vez de seguir contando sobre ella.
    vi.stubEnv("NODE_ENV", "production");
    process.env.NELVYON_DEPLOY_ENV = "production";
    const { fetchFalso, caducidadDeLaClave } = upstashFalso({ fallaExpire: true });
    vi.stubGlobal("fetch", fetchFalso);

    const veredicto = await checkIpRateLimit({
      ip: "203.0.113.7",
      rule: { ...REGLA, requireSharedStoreInProduction: true } as never,
    });

    expect(caducidadDeLaClave()).toBeUndefined();  // en efecto, no hay caducidad
    expect(veredicto.allowed).toBe(false);    // y por eso no se deja pasar
  });

  it("EL CONTROL de la anterior: con el EXPIRE bien, esa misma regla SI pasa", async () => {
    // Sin este control, un limitador que cerrara siempre en produccion aprobaria
    // la prueba de arriba y dejaria la aplicacion entera fuera de servicio.
    vi.stubEnv("NODE_ENV", "production");
    process.env.NELVYON_DEPLOY_ENV = "production";
    const { fetchFalso, caducidadDeLaClave } = upstashFalso();
    vi.stubGlobal("fetch", fetchFalso);

    const veredicto = await checkIpRateLimit({
      ip: "203.0.113.7",
      rule: { ...REGLA, requireSharedStoreInProduction: true } as never,
    });

    expect(caducidadDeLaClave()).toBe(REGLA.windowSec);
    expect(veredicto.allowed).toBe(true);
  });

  it("se pide la caducidad en la MISMA llamada que el contador", async () => {
    const { fetchFalso, llamadas } = upstashFalso();
    vi.stubGlobal("fetch", fetchFalso);

    await checkIpRateLimit({ ip: "203.0.113.7", rule: REGLA as never });

    // Dos peticiones separadas dejan un hueco donde se puede perder el EXPIRE.
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0]).toContain("/pipeline");
  });

  it("la caducidad se pone UNA vez, no se renueva en cada peticion", async () => {
    // Sin `NX`, cada peticion volveria a poner la ventana entera y la ventana
    // fija se convertiria en una deslizante: quien siguiera llamando no se
    // desbloquearia NUNCA, porque el reloj se le reinicia con cada intento.
    const { fetchFalso, refrescos } = upstashFalso();
    vi.stubGlobal("fetch", fetchFalso);

    for (let i = 0; i < 4; i++) {
      await checkIpRateLimit({ ip: "203.0.113.7", rule: REGLA as never });
    }
    expect(refrescos).toHaveLength(1);
  });

  it("EL CONTROL: el limite sigue limitando de verdad", async () => {
    // Sin esto, un limitador que dejara pasar TODO aprobaria lo de arriba.
    const { fetchFalso } = upstashFalso();
    vi.stubGlobal("fetch", fetchFalso);

    const veredictos = [];
    for (let i = 0; i < 5; i++) {
      veredictos.push(
        (await checkIpRateLimit({ ip: "203.0.113.7", rule: REGLA as never })).allowed,
      );
    }
    // Techo 3: las tres primeras pasan, las siguientes no.
    expect(veredictos).toEqual([true, true, true, false, false]);
  });

  it("EL OTRO CONTROL: peticiones concurrentes no se cuelan por el hueco", async () => {
    // El contador es atomico, asi que cinco a la vez con techo 3 dan
    // exactamente tres permitidas — ni una mas por llegar simultaneas.
    const { fetchFalso } = upstashFalso();
    vi.stubGlobal("fetch", fetchFalso);

    const veredictos = await Promise.all(
      Array.from({ length: 5 }, () =>
        checkIpRateLimit({ ip: "203.0.113.7", rule: REGLA as never })),
    );
    expect(veredictos.filter((v) => v.allowed)).toHaveLength(3);
  });
});
