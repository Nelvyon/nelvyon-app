/**
 * LO QUE NO SE SABE SI CUESTA, NO SE EJECUTA.
 *
 * QUÉ PROTEGE. La guarda de gasto ya vigila el dinero que alguien DECLARA. Esto
 * vigila el que nadie declara: una llamada a un modelo de pago que factura por
 * token, una conversación de WhatsApp que se cobra por abrirse, una réplica de
 * más que no es una operación de negocio y por eso no pasa por ninguna puerta.
 *
 * Y sobre todo vigila el caso que más se parece a «no pasa nada»: un proveedor
 * cuyo coste sencillamente NO SE SABE. Desconocido no es gratis. Desconocido es
 * desconocido, y bajo este modo eso significa que no.
 *
 * LAS DOS DIRECCIONES. Una política que deniega todo no protege: paraliza, y a
 * los dos días alguien la apaga. Por eso cada regla tiene su control positivo:
 * lo que de verdad es gratuito TIENE que poder ejecutarse.
 *
 * COSTE EXTERNO: 0 €. No llama a ningún proveedor. Decide sobre descripciones.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  COSTE_POR_PROVEEDOR,
  apuntar,
  claseDe,
  decidirCoste,
  modoCosteCeroActivo,
  operacionesQueCuestan,
  proveedoresClasificados,
} from "../PoliticaDeCosteCero";

// DENTRO del `beforeEach`, no al cargar el modulo. Capturarlo al cargar guarda
// lo que hubiera en ese instante —posiblemente lo que dejo OTRO fichero de
// pruebas—, y entonces el `afterEach` restaura un valor que nunca fue el de
// nadie. Es la dependencia de orden que hacia fallar `authSessionSecurity`
// una de cada cinco corridas.
let antes: string | undefined;

beforeEach(() => {
  antes = process.env.NELVYON_MODO_COSTE_CERO;
  delete process.env.NELVYON_MODO_COSTE_CERO;
});

afterEach(() => {
  if (antes === undefined) delete process.env.NELVYON_MODO_COSTE_CERO;
  else process.env.NELVYON_MODO_COSTE_CERO = antes;
});

describe("el modo está encendido salvo que alguien lo apague a propósito", () => {
  it("sin variable, el modo está ENCENDIDO", () => {
    // EL SENTIDO IMPORTA MÁS QUE LA REGLA. Si el modo se encendiera sólo con
    // «1», un despliegue que se olvidara de la variable se quedaría sin
    // protección y nadie se enteraría hasta la factura. El valor por defecto de
    // una protección tiene que ser protegido.
    expect(modoCosteCeroActivo()).toBe(true);
  });

  it("con un valor cualquiera, sigue ENCENDIDO", () => {
    for (const v of ["", " ", "1", "si", "true", "no", "apagado", "00", "0,0"]) {
      process.env.NELVYON_MODO_COSTE_CERO = v;
      expect(modoCosteCeroActivo(), `«${v}» no debería apagarlo`).toBe(true);
    }
  });

  it("sólo el «0» lo apaga, con o sin espacios alrededor", () => {
    // Los espacios se recortan a propósito: una variable de entorno con un
    // espacio de más es un descuido de configuración, no una intención. Lo que
    // no se recorta es el significado — «00» no es «0».
    for (const v of ["0", " 0", "0 ", "  0  "]) {
      process.env.NELVYON_MODO_COSTE_CERO = v;
      expect(modoCosteCeroActivo(), `«${v}» debería apagarlo`).toBe(false);
    }
  });
});

describe("LAS MUTACIONES: todo lo que puede costar, se rechaza", () => {
  const rechaza = (op: Parameters<typeof decidirCoste>[0], motivoEsperado: string) => {
    const v = decidirCoste(op);
    expect(v.permitido, `${op.proveedor}/${op.operacion} se ha permitido`).toBe(false);
    if (v.permitido) return;
    expect(v.motivo).toBe(motivoEsperado);
  };

  it("un proveedor de IA de pago", () => {
    rechaza({ proveedor: "openai", operacion: "generar" }, "proveedor_de_pago");
    rechaza({ proveedor: "anthropic", operacion: "generar" }, "proveedor_de_pago");
    rechaza({ proveedor: "gemini", operacion: "generar" }, "proveedor_de_pago");
  });

  it("un proveedor de coste DESCONOCIDO", () => {
    // El más peligroso de todos, porque no parece peligroso. Un nivel gratuito
    // con límites que pueden cambiar sin aviso no es una garantía de nada.
    rechaza({ proveedor: "groq", operacion: "generar" }, "coste_desconocido");
    rechaza({ proveedor: "together", operacion: "generar" }, "coste_desconocido");
  });

  it("un proveedor que NADIE ha clasificado", () => {
    // Y éste es el que de verdad cierra el sistema: no hace falta acertar a
    // enumerar todos los proveedores caros del mundo. Basta con que lo que no
    // esté en la tabla no pase.
    rechaza({ proveedor: "un-proveedor-que-nadie-ha-visto", operacion: "generar" }, "coste_desconocido");
  });

  it("gasto publicitario, aunque el importe sea cero", () => {
    // Crear una campaña con presupuesto 0 hoy es crear una campaña con
    // presupuesto mañana. La operación es la que cuesta, no el número.
    rechaza({ proveedor: "meta_ads", operacion: "crear_campana", importeCents: 0 }, "gasto_publicitario");
    rechaza({ proveedor: "google_ads", operacion: "cambiar_presupuesto" }, "gasto_publicitario");
  });

  it("un mensaje facturable", () => {
    rechaza({ proveedor: "whatsapp", operacion: "enviar_mensaje" }, "mensaje_facturable");
    rechaza({ proveedor: "twilio", operacion: "enviar_sms" }, "mensaje_facturable");
  });

  it("ampliar un recurso de infraestructura", () => {
    // No es una operación de negocio, así que no pasa por ninguna puerta de
    // gasto. Por eso tiene que pasar por ésta.
    rechaza({ proveedor: "railway", operacion: "escalar" }, "ampliacion_de_recurso");
    rechaza({ proveedor: "railway", operacion: "anadir_replica" }, "ampliacion_de_recurso");
  });

  it("algo que PUEDE subir la factura, aunque hoy no la suba", () => {
    // «Puede» basta. El nivel gratuito de SES incluye envíos, y por encima
    // factura; nada garantiza que no se llegue.
    rechaza({ proveedor: "ses", operacion: "enviar" }, "puede_subir_la_factura");
    rechaza({ proveedor: "upstash", operacion: "escribir" }, "puede_subir_la_factura");
  });

  it("un importe declarado convierte en PAID a cualquier proveedor", () => {
    // Aunque el proveedor esté clasificado como local y gratuito: si la
    // operación mueve céntimos, mueve dinero.
    const v = decidirCoste({ proveedor: "ollama", operacion: "generar", importeCents: 250 });
    expect(v.permitido).toBe(false);
    expect(v.clase).toBe("PAID");
  });
});

describe("EL CONTROL POSITIVO: lo que de verdad es gratis SÍ pasa", () => {
  // Sin esto, todas las pruebas de arriba seguirían en verde con una política
  // que denegara absolutamente todo — y una política que lo deniega todo no es
  // una protección, es un sistema apagado que alguien desactivará en dos días.
  it("el modelo local sobre hardware que ya estaba", () => {
    const v = decidirCoste({ proveedor: "ollama", operacion: "generar" });
    expect(v.permitido).toBe(true);
    expect(v.clase).toBe("FREE_SELF_HOSTED_ON_EXISTING_HARDWARE");
  });

  it("leer metadatos de infraestructura ya encendida", () => {
    expect(decidirCoste({ proveedor: "railway_lectura", operacion: "estado" }).permitido).toBe(true);
    expect(
      decidirCoste({ proveedor: "postgres_produccion_lectura", operacion: "consultar_catalogo" }).permitido,
    ).toBe(true);
  });

  it("lo que ocurre en esta máquina", () => {
    expect(decidirCoste({ proveedor: "local", operacion: "calcular" }).permitido).toBe(true);
  });
});

describe("con el modo apagado, la política se aparta y lo deja escrito", () => {
  it("permite, pero dice que está apagado", () => {
    process.env.NELVYON_MODO_COSTE_CERO = "0";
    const v = decidirCoste({ proveedor: "openai", operacion: "generar" });
    expect(v.permitido).toBe(true);
    expect(v.porQue).toMatch(/APAGADO/);
    // Y la clase NO cambia: sigue siendo de pago. Apagar el modo no convierte
    // en gratis lo que cuesta, sólo deja de impedirlo.
    expect(v.clase).toBe("PAID");
  });
});

describe("el rastro", () => {
  it("una decisión denegada deja apunte con su motivo", () => {
    const op = {
      proveedor: "openai",
      operacion: "generar",
      tenantId: "t-1",
      serviceId: "seo_premium",
      agente: "seo-estratega",
      actor: "agente",
    };
    const a = apuntar(op, decidirCoste(op));
    expect(a.permitido).toBe(false);
    expect(a.motivo).toBe("proveedor_de_pago");
    expect(a.clase).toBe("PAID");
    expect(a.serviceId).toBe("seo_premium");
    expect(a.costeRealCents, "no se sabe el coste real, y `null` es la respuesta honesta").toBeNull();
    expect(Date.parse(a.momento)).not.toBeNaN();
  });

  it("una permitida también deja apunte: se registra lo que pasa, no sólo lo que se impide", () => {
    const op = { proveedor: "ollama", operacion: "generar", serviceId: "geo_ai_search_premium" };
    const a = apuntar(op, decidirCoste(op), 0);
    expect(a.permitido).toBe(true);
    expect(a.motivo).toBeNull();
    expect(a.costeRealCents).toBe(0);
  });
});

describe("la tabla no se queda coja sin que se note", () => {
  it("todo proveedor clasificado dice POR QUÉ cuesta lo que cuesta", () => {
    for (const p of proveedoresClasificados()) {
      const { porQue } = COSTE_POR_PROVEEDOR[p];
      expect(porQue.trim().length, `${p} sin explicación`).toBeGreaterThan(20);
    }
  });

  it("los proveedores de IA que el árbol sabe usar están clasificados", () => {
    // Derivado: si mañana aparece un adaptador de proveedor nuevo y nadie lo
    // clasifica, cae en UNKNOWN_COST y se deniega — que es correcto — pero
    // esta prueba lo dice antes de que alguien pierda una tarde con ello.
    for (const p of ["ollama", "openai"]) {
      expect(proveedoresClasificados(), `falta ${p}`).toContain(p);
    }
  });

  it("ninguna operación que cuesta se cuela por tener un proveedor barato", () => {
    for (const o of operacionesQueCuestan()) {
      const v = claseDe({ proveedor: "ollama", operacion: o });
      expect(v.clase, `«${o}» se ha colado como gratis`).toBe("PAID");
    }
  });
});
