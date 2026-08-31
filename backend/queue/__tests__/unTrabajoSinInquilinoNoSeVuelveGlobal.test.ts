/**
 * UN TRABAJO SIN INQUILINO NO SE EJECUTA POR DESCUIDO.
 *
 * DE DÓNDE SALE. Auditando por qué `nelvyon_jobs` tiene `BYPASSRLS`. El motivo
 * resultó legítimo —los barridos de fondo cruzan inquilinos por definición: un
 * webhook de Stripe llega sin sesión de nadie— y hay defensa en profundidad
 * real: el rol alcanza 62 tablas de 733, y `DbJobsClient` se niega a trabajar
 * si hay un inquilino en el contexto de la petición.
 *
 * EL AGUJERO ESTABA EN EL OTRO EXTREMO. `os_jobs.tenant_id` es `NULL`-able, y
 * el trabajador hacía:
 *
 *     conInquilino({ tenantId: trabajo.tenantId ?? undefined }, …)
 *
 * Con `tenant_id` nulo eso instala un contexto VACÍO — y un contexto vacío es
 * exactamente el que el guardián de `DbJobsClient` deja pasar, porque comprueba
 * si HAY inquilino, no si falta. Así que el trabajo se ejecutaba con la
 * conexión que salta RLS.
 *
 * El resultado estaba del revés: **cuanta menos información llevaba un trabajo,
 * más lejos llegaba**. Uno que perdiera su `tenant_id` no fallaba: se volvía
 * global.
 *
 * MEDIDO: las 12 filas de `os_jobs` en producción tienen `tenant_id IS NULL`.
 * Todas en `cancelled` y ninguna reclamable, así que no había exposición viva —
 * pero el siguiente trabajo encolado sin inquilino la habría tenido, callando.
 *
 * EL PRINCIPIO YA ESTABA ESCRITO EN ESTE REPOSITORIO, en
 * `sinInquilinoAPropósito`: «lo global tiene que escribirse, porque "me olvidé"
 * y "lo quiero todo" no pueden parecerse». Esto hace que el trabajador lo
 * cumpla.
 *
 * POR QUÉ ESTE FICHERO NO NECESITA POSTGRESQL. El trabajador sólo se probaba en
 * ficheros `.pg.test.ts`, que se omiten sin base — así que su lógica de
 * ejecución, incluida ésta, no se comprobaba en una ejecución normal. La cola
 * va doblada: lo que se mide es la DECISIÓN del trabajador, no la base.
 *
 * COSTE EXTERNO: 0 €.
 */
import { describe, expect, it, vi } from "vitest";

import { inquilinoActual } from "../../db/contextoDeInquilino";
import {
  SERVICIOS_ENTRE_INQUILINOS,
  TrabajadorDeCola,
  type ManejadorDeTrabajo,
} from "../trabajadorDeCola";
import type { ColaDeTrabajos, TrabajoReclamado } from "../colaDeTrabajos";

function trabajo(parcial: Partial<TrabajoReclamado> = {}): TrabajoReclamado {
  return {
    jobId: "j1",
    serviceId: "seo_premium",
    clientId: "c1",
    tenantId: "11111111-1111-1111-1111-111111111111",
    payload: {},
    intake: null,
    attempts: 1,
    maxAttempts: 3,
    ...parcial,
  };
}

/** Una cola doblada: entrega UN trabajo y apunta cómo acabó. */
function colaConUnTrabajo(t: TrabajoReclamado) {
  const fallos: Array<{ causa: string; intentos: number; max: number }> = [];
  const completados: string[] = [];
  let entregado = false;
  const cola = {
    identidad: "prueba",
    reclamar: vi.fn(async () => {
      if (entregado) return [];
      entregado = true;
      return [t];
    }),
    latir: vi.fn(async () => true),
    completar: vi.fn(async (id: string) => {
      completados.push(id);
    }),
    dejarEsperandoAprobacion: vi.fn(async () => undefined),
    fallar: vi.fn(async (_id: string, causa: unknown, intentos: number, max: number) => {
      fallos.push({
        causa: causa instanceof Error ? causa.message : String(causa),
        intentos,
        max,
      });
      return intentos >= max ? "dead_letter" : "reintento";
    }),
    rescatarArriendosVencidos: vi.fn(async () => ({ devueltos: 0, agotados: 0 })),
  };
  return { cola: cola as unknown as ColaDeTrabajos, fallos, completados };
}

/** Corre una vuelta del trabajador y devuelve lo que pasó. */
async function unaVuelta(t: TrabajoReclamado, manejador: ManejadorDeTrabajo) {
  const { cola, fallos, completados } = colaConUnTrabajo(t);
  const eventos: Array<Record<string, unknown>> = [];
  const trabajador = new TrabajadorDeCola(cola, {
    concurrencia: 1,
    esperaEntreVueltasMs: 5,
    latidoMs: 10_000,
    rescateMs: 10_000,
    tiempoMaximoPorTrabajoMs: 5_000,
    registrar: (e) => eventos.push(e),
  });
  trabajador.registrarManejador(t.serviceId, manejador);
  trabajador.arrancar();
  // Se espera a que la cola haya sido consultada y el trabajo resuelto.
  for (let i = 0; i < 200; i += 1) {
    if (fallos.length > 0 || completados.length > 0) break;
    await new Promise((r) => setTimeout(r, 10));
  }
  await trabajador.parar();
  return { fallos, completados, eventos };
}

describe("la lista de servicios entre inquilinos es blanca y nace vacía", () => {
  it("no hay ningún servicio declarado como global", () => {
    // Lista BLANCA: un servicio nuevo nace con inquilino obligatorio. Con una
    // lista negra habría que acordarse de excluir cada servicio nuevo, y el que
    // se olvidara sería global sin que nadie lo decidiera.
    expect(SERVICIOS_ENTRE_INQUILINOS.size).toBe(0);
  });
});

describe("un trabajo CON inquilino se ejecuta con su inquilino", () => {
  it("LA REGLA: el manejador ve el tenantId del trabajo", async () => {
    let visto: string | null | undefined = "no se llamó";
    const { completados } = await unaVuelta(trabajo(), async () => {
      visto = inquilinoActual()?.tenantId;
      return { tipo: "completado", resultado: "ok" };
    });
    expect(visto).toBe("11111111-1111-1111-1111-111111111111");
    expect(completados).toEqual(["j1"]);
  });
});

describe("un trabajo SIN inquilino no se ejecuta", () => {
  it("LA REGLA: con tenant_id nulo, el manejador NO llega a correr", async () => {
    let corrio = false;
    const { fallos } = await unaVuelta(trabajo({ tenantId: null }), async () => {
      corrio = true;
      return { tipo: "completado", resultado: "ok" };
    });
    expect(corrio, "el manejador se ejecutó sin inquilino").toBe(false);
    expect(fallos).toHaveLength(1);
    expect(fallos[0].causa).toMatch(/no tiene inquilino/);
  });

  it("cae a dead_letter en la PRIMERA vuelta, no tras tres intentos", async () => {
    // Reintentarlo no le va a poner un `tenant_id`. Y dejarlo reintentando
    // esconde el problema en la cola en vez de enseñarlo.
    const { fallos } = await unaVuelta(
      trabajo({ tenantId: null, attempts: 1, maxAttempts: 3 }),
      async () => ({ tipo: "completado", resultado: "ok" }),
    );
    expect(fallos[0].intentos).toBe(3);
    expect(fallos[0].max).toBe(3);
  });

  it("una cadena vacía o de espacios cuenta como sin inquilino", async () => {
    // `""` no es un inquilino. Sin esto, bastaría con encolar el trabajo con la
    // cadena vacía para saltarse la comprobación entera.
    for (const vacio of ["", "   "]) {
      let corrio = false;
      const { fallos } = await unaVuelta(trabajo({ tenantId: vacio }), async () => {
        corrio = true;
        return { tipo: "completado", resultado: "ok" };
      });
      expect(corrio, `«${vacio}» dejó correr el manejador`).toBe(false);
      expect(fallos[0].causa).toMatch(/no tiene inquilino/);
    }
  });

  it("EL CONTROL: el rechazo NO se convierte en éxito", async () => {
    // La comprobación que de verdad importa. Un rechazo de aislamiento que
    // termina en `completar()` es peor que el fallo que evitaba: deja el
    // sistema creyendo que el trabajo salió bien.
    const { completados, fallos } = await unaVuelta(
      trabajo({ tenantId: null }),
      async () => ({ tipo: "completado", resultado: "ok" }),
    );
    expect(completados).toEqual([]);
    expect(fallos).toHaveLength(1);
  });

  it("y queda registrado como dead_letter, no en silencio", async () => {
    const { eventos } = await unaVuelta(trabajo({ tenantId: null }), async () => ({
      tipo: "completado",
      resultado: "ok",
    }));
    const dl = eventos.find((e) => e.evento === "dead_letter");
    expect(dl, "no se registra el rechazo").toBeDefined();
    expect(String(dl!.causa)).toMatch(/inquilino/);
  });
});

describe("el contexto no se filtra de un trabajo al siguiente", () => {
  it("tras un trabajo con inquilino, fuera del trabajador no queda ninguno", async () => {
    // `conInquilino` usa `almacen.run`, que se cierra solo. Si alguien lo
    // cambiara por `enterWith`, el inquilino de un trabajo quedaría pegado al
    // proceso y lo heredaría el siguiente — que es un cruce de inquilinos
    // silencioso y de los peores de diagnosticar.
    await unaVuelta(trabajo(), async () => ({ tipo: "completado", resultado: "ok" }));
    expect(inquilinoActual()?.tenantId).toBeUndefined();
  });
});
