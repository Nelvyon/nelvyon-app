/**
 * CON EL MODO DE COSTE CERO, EL PUENTE NO DEJA PASAR NADA QUE PUEDA COSTAR.
 *
 * POR QUÉ EN UN FICHERO APARTE. `ningunAgenteGastaSinPasarLasPuertas` prueba
 * las puertas que AUTORIZAN un gasto: que exista autorización, que quepa en el
 * tope, que no se ejecute dos veces. Para poder probarlas hay que dejar llegar
 * la acción hasta ellas, así que allí el modo de coste cero está apagado.
 *
 * Aquí se prueba lo contrario: que con el modo encendido esa acción **no llega**
 * a ninguna de esas puertas. Son dos protecciones distintas y se prueban por
 * separado; mezclarlas dejaría una de las dos sin comprobar de verdad, porque
 * la primera que denegara taparía a la otra.
 *
 * LO QUE ESTA PUERTA PROTEGE Y LA DE GASTO NO. La de gasto sabe de importes.
 * Ésta sabe de proveedores y operaciones, que es por donde se va el dinero que
 * nadie declara: una llamada a un modelo que factura por token, una
 * conversación de WhatsApp que se cobra por abrirse, una réplica de más. Y
 * sobre todo protege lo que no parece nada: un proveedor cuyo coste no se sabe.
 *
 * NO HACE FALTA BASE DE DATOS. La puerta de coste va antes que la de gasto, así
 * que se deniega sin consultar autorizaciones. Esa es justo la propiedad que se
 * comprueba abajo.
 *
 * COSTE EXTERNO: 0 €.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MotorDeCalidad } from "../../calidad/MotorDeCalidad";
import { CATALOGO } from "../../agentes/catalogo";
import type { ContratoDeAgente } from "../../agentes/contratoDeAgente";
import { GuardaDeGasto } from "../../gasto/guardaDeGasto";
import {
  EjecutorSimulado,
  PuenteDeEjecucion,
  type AccionPropuesta,
  type RegistroDeAprobaciones,
} from "../PuenteDeEjecucion";

const TENANT = "dddddddd-0009-4009-8009-000000000009";
const WS = 940009;
const CLI = "aaaaaaaa-b21d-4009-8009-000000000009";

const planificador = (): ContratoDeAgente => CATALOGO.find((a) => a.id === "planificador-de-medios")!;
/** El único del catálogo cuyo contrato permite escribir a una persona. */
const emailLifecycle = (): ContratoDeAgente => CATALOGO.find((a) => a.id === "email-lifecycle")!;

/**
 * Un almacén de gasto que EXPLOTA si alguien lo consulta.
 *
 * Es la forma de demostrar que la puerta de coste va de verdad antes: si la
 * acción llegara a la puerta de gasto, esta prueba no fallaría por una
 * aserción, fallaría por una excepción — y eso es imposible de confundir con
 * un despiste en el `expect`.
 */
function almacenQueNoDeberiaUsarse() {
  return {
    async query() {
      throw new Error("la puerta de gasto no debería haberse consultado siquiera");
    },
  };
}

const aprobaciones = (): RegistroDeAprobaciones => ({
  async estaAprobada() {
    return true;
  },
  async solicitar() {},
});

const piezaLimpia = () => ({
  dominio: "ads",
  autor: "planificador-de-medios",
  contenido: {
    urlDestino: "https://cliente-real.es/oferta",
    presupuestoDiarioCents: 5_000,
    negativas: ["gratis", "empleo"],
  },
});

function accion(extra: Partial<AccionPropuesta> = {}): AccionPropuesta {
  return {
    ejecutor: "meta_ads",
    operacion: "crear_campana",
    consecuencias: ["gasta_dinero"],
    argumentos: { nombre: "campaña de prueba" },
    pieza: piezaLimpia(),
    tenantId: TENANT,
    workspaceId: WS,
    serviceId: "ads_premium",
    clientId: CLI,
    importeCents: 5_000,
    idempotencyKey: `k-${Math.random().toString(36).slice(2)}`,
    ...extra,
  };
}

let puente: PuenteDeEjecucion;
let ejecutados: string[];

beforeEach(() => {
  vi.stubEnv("NELVYON_GASTO_EXTERNO_HABILITADO", "1");
  ejecutados = [];
  puente = new PuenteDeEjecucion(
    new GuardaDeGasto(almacenQueNoDeberiaUsarse()),
    aprobaciones(),
    () => {},
    new MotorDeCalidad(),
  );
  for (const id of ["meta_ads", "google_ads", "whatsapp", "ses", "ollama", "railway"]) {
    const e = new EjecutorSimulado(id);
    const original = e.ejecutar.bind(e);
    e.ejecutar = async (op, args) => {
      ejecutados.push(`${id}/${op}`);
      return original(op, args);
    };
    puente.registrarEjecutor(e);
  }
});

afterEach(() => vi.unstubAllEnvs());

describe("con el modo encendido, la puerta de coste cierra antes que ninguna otra", () => {
  it("LA REGLA: una campaña publicitaria se deniega, y no se consulta el gasto", async () => {
    const r = await puente.cruzar(planificador(), accion());
    expect(r.estado).toBe("denegado");
    if (r.estado !== "denegado") return;
    expect(r.puerta).toBe("coste");
    expect(r.motivo).toMatch(/gasto_publicitario/);
    expect(ejecutados, "se ha ejecutado algo").toEqual([]);
  });

  it("un mensaje facturable tampoco pasa", async () => {
    // Con `email-lifecycle`, que SÍ puede contactar personas: si se usara un
    // agente sin ese permiso, denegaría la puerta 1 y esta prueba estaría
    // comprobando la autonomía en vez del coste.
    const r = await puente.cruzar(
      emailLifecycle(),
      accion({
        ejecutor: "whatsapp",
        operacion: "enviar_mensaje",
        consecuencias: ["contacta_personas"],
        importeCents: 0,
        pieza: { dominio: "email", autor: "email-lifecycle", contenido: { asunto: "Hola", cuerpo: "Un mensaje corto y correcto para el cliente que lo pidió." } },
      }),
    );
    expect(r.estado).toBe("denegado");
    if (r.estado !== "denegado") return;
    expect(r.puerta).toBe("coste");
    expect(r.motivo).toMatch(/mensaje_facturable/);
  });

  it("ampliar un recurso de infraestructura tampoco", async () => {
    // No es una operación de negocio, así que no declara importe ni
    // consecuencias de negocio: por eso ninguna de las otras puertas la ve.
    const r = await puente.cruzar(
      planificador(),
      accion({ ejecutor: "railway", operacion: "escalar", consecuencias: [], importeCents: 0, pieza: undefined }),
    );
    expect(r.estado).toBe("denegado");
    if (r.estado !== "denegado") return;
    expect(r.puerta).toBe("coste");
    expect(r.motivo).toMatch(/ampliacion_de_recurso/);
  });

  it("un proveedor que nadie ha clasificado tampoco", async () => {
    // El caso que cierra el sistema: no hace falta enumerar todos los
    // proveedores caros del mundo, basta con que lo que no esté en la tabla
    // no pase.
    puente.registrarEjecutor(new EjecutorSimulado("un_proveedor_nuevo"));
    const r = await puente.cruzar(
      planificador(),
      accion({ ejecutor: "un_proveedor_nuevo", operacion: "hacer_algo", consecuencias: [], importeCents: 0, pieza: undefined }),
    );
    expect(r.estado).toBe("denegado");
    if (r.estado !== "denegado") return;
    expect(r.puerta).toBe("coste");
    expect(r.motivo).toMatch(/coste_desconocido/);
  });

  it("EL CONTROL: una acción realmente gratuita SÍ cruza la puerta de coste", async () => {
    // Sin esto, todo lo de arriba seguiría en verde con un puente que denegara
    // absolutamente todo. Un puente que no deja pasar nada no es una
    // protección: es un sistema apagado, y alguien lo desactivará en dos días.
    //
    // Se usa `ollama` con una operación sin consecuencias: la puerta de coste
    // la deja pasar, y la siguiente que decide ya no es ésta.
    const r = await puente.cruzar(
      planificador(),
      accion({ ejecutor: "ollama", operacion: "generar", consecuencias: [], importeCents: 0, pieza: undefined }),
    );
    if (r.estado === "denegado") {
      expect(r.puerta, "la puerta de coste ha denegado algo gratuito").not.toBe("coste");
    }
    expect(ejecutados).toContain("ollama/generar");
  });
});

describe("con el modo apagado, la puerta se aparta", () => {
  it("la campaña llega hasta la puerta de gasto", async () => {
    // Y se nota porque el almacén de gasto explota al ser consultado: es la
    // prueba de que la acción ha llegado más allá de la puerta de coste.
    vi.stubEnv("NELVYON_MODO_COSTE_CERO", "0");
    const r = await puente.cruzar(planificador(), accion());

    // Llegó a la puerta de gasto: se sabe porque el almacén explota al ser
    // consultado y su excepción aparece en el motivo. Y la guarda hace lo
    // correcto con ella —`error_al_comprobar` y denegar—: una comprobación que
    // no se puede hacer no se da por buena. Aquí se ven las dos cosas de
    // golpe: que la puerta de coste se apartó, y que la de gasto falla cerrada.
    expect(r.estado).toBe("denegado");
    if (r.estado !== "denegado") return;
    expect(r.puerta, "sigue denegando la puerta de coste con el modo apagado").not.toBe("coste");
    expect(r.puerta).toBe("autorizacion_de_gasto");
    expect(r.motivo).toMatch(/no debería haberse consultado/);
  });
});
