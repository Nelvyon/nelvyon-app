/**
 * Las ocho que esperaban una ficha ya no esperan.
 *
 * ── QUÉ SE DEMUESTRA AQUÍ ───────────────────────────────────────────────────
 *
 * Que la cadena existe de punta a punta y que cada eslabón hace su parte:
 *
 *   qué campos necesita esta disciplina  → se deriva del motor, no de una lista
 *   cómo se le piden a un modelo         → una instrucción con esos y ninguno más
 *   qué se acepta de lo que conteste     → solo lo que tiene la forma correcta
 *   qué pasa si no contesta              → ficha vacía, y las ocho lo dicen
 *   qué pasa si costaría dinero          → no se pide
 *
 * Y, lo que de verdad importa: que con la ficha delante las ocho DEVUELVEN
 * VEREDICTO en vez de `undefined`. Mientras devolvían `undefined` estaban vivas
 * en el código y muertas en la práctica.
 *
 * COSTE EXTERNO: 0 EUR. El modelo es un doble; la comprobación con el modelo
 * REAL vive en `laFichaLaEmiteUnModeloDeVerdad.test.ts`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  camposQuePide,
  instruccionDeFicha,
  pedirLaFicha,
  sePuedePedirSinCoste,
  textoDelResultado,
  PLAZO_DE_LA_FICHA_MS,
  TOPE_DE_TEXTO,
} from "../laFichaQueFaltaba";
import { comprobacionesDe, type Pieza } from "../MotorDeCalidad";
import { QUE_ES_CADA_CAMPO, QUIEN_LEE_CADA_CAMPO } from "../contratoDeSalidaEstructurada";

/** Las ocho, con la disciplina que las tiene y el campo que leen. */
const LAS_OCHO = [
  ["seo", "canibalizacion", "paginas"],
  ["crm", "cualificacion-explicada", "criteriosDeCualificacion"],
  ["web", "una-idea-por-pantalla", "ctasPrincipales"],
  ["web", "formulario-pide-lo-justo", "camposDelFormulario"],
  ["ecommerce", "el-precio-no-aparece-tarde", "pasoDondeApareceElPrecio"],
  ["ecommerce", "gastos-de-envio-sin-sorpresas", "cuandoSeMuestranGastosDeEnvio"],
  ["creatividad", "se-puede-leer-lo-que-pone", "contrasteTextoFondo"],
  ["reporting", "empieza-por-lo-que-el-cliente-queria", "primeraSeccion"],
] as const;

function modeloQueDice(respuesta: string) {
  return { complete: vi.fn(async () => respuesta) };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("qué necesita cada disciplina se deriva del motor", () => {
  it("cada una de las ocho pide el campo que su comprobación lee", () => {
    for (const [dominio, comprobacion, campo] of LAS_OCHO) {
      expect(
        comprobacionesDe(dominio).map((c) => c.id),
        `la disciplina ${dominio} ya no tiene la comprobación ${comprobacion}`,
      ).toContain(comprobacion);
      expect(
        camposQuePide(dominio),
        `${dominio} no pide «${campo}», así que ${comprobacion} seguirá sin poder dispararse`,
      ).toContain(campo);
    }
  });

  it("no se pide un campo que ninguna comprobación de esa disciplina lee", () => {
    // Pedir de más es pagar contexto por nada y darle al modelo ocasiones de
    // inventar. `seo` no mira formularios.
    expect(camposQuePide("seo")).not.toContain("camposDelFormulario");
    expect(camposQuePide("crm")).not.toContain("contrasteTextoFondo");
  });

  it("una disciplina sin campos no gasta una llamada", () => {
    // CONTROL NEGATIVO: si esto devolviera instrucción para cualquier cosa, se
    // estaría llamando al modelo una vez por trabajo sin que nadie lea nada.
    expect(instruccionDeFicha("disciplina-que-no-existe")).toBeNull();
  });
});

describe("la instrucción lleva lo que hay que pedir y cómo", () => {
  it("nombra los campos de la disciplina, con su explicación", () => {
    const texto = instruccionDeFicha("web") ?? "";
    expect(texto).toContain("ctasPrincipales");
    expect(texto).toContain(QUE_ES_CADA_CAMPO.ctasPrincipales);
    expect(texto).not.toContain("contrasteTextoFondo");
  });

  it("prohíbe inventar lo que no esté", () => {
    // Es la línea que separa «no se pudo comprobar» de un veredicto sobre algo
    // que nadie escribió, que es peor que no comprobar.
    expect(instruccionDeFicha("web")).toMatch(/no inventes/i);
  });
});

describe("de lo que conteste el modelo solo entra lo que vale", () => {
  it("una respuesta con la forma correcta llega entera", async () => {
    const modelo = modeloQueDice(
      JSON.stringify({
        ctasPrincipales: ["Ver la carta", "Reservar mesa"],
        camposDelFormulario: [{ nombre: "email", obligatorio: true }],
      }),
    );
    const ficha = await pedirLaFicha("web", { texto: "x".repeat(200) }, modelo, "ollama");
    expect(ficha.ctasPrincipales).toEqual(["Ver la carta", "Reservar mesa"]);
    expect(ficha.camposDelFormulario).toHaveLength(1);
  });

  it("un campo con la forma equivocada se cae solo, sin llevarse los buenos", async () => {
    const modelo = modeloQueDice(
      JSON.stringify({ ctasPrincipales: ["Comprar"], camposDelFormulario: 7 }),
    );
    const ficha = await pedirLaFicha("web", { texto: "x".repeat(200) }, modelo, "ollama");
    expect(ficha.ctasPrincipales).toEqual(["Comprar"]);
    expect(ficha.camposDelFormulario).toBeUndefined();
  });

  it("si el modelo no contesta, ficha vacía y la entrega sigue", async () => {
    const modelo = {
      complete: vi.fn(async () => {
        throw new Error("modelo caído");
      }),
    };
    await expect(
      pedirLaFicha("web", { texto: "x".repeat(200) }, modelo, "ollama"),
    ).resolves.toEqual({});
  });

  it("si contesta prosa en vez de JSON, ficha vacía", async () => {
    const modelo = modeloQueDice("Claro, aquí tienes las llamadas a la acción: comprar y reservar.");
    await expect(
      pedirLaFicha("web", { texto: "x".repeat(200) }, modelo, "ollama"),
    ).resolves.toEqual({});
  });

  it("sin trabajo que leer no se llama al modelo", async () => {
    const modelo = modeloQueDice("{}");
    await pedirLaFicha("web", { texto: "corto" }, modelo, "ollama");
    expect(modelo.complete, "se gastó una llamada sobre un texto vacío").not.toHaveBeenCalled();
  });
});

describe("no se pide si costaría dinero", () => {
  it("con el modelo local se pide", () => {
    expect(sePuedePedirSinCoste("ollama")).toBe(true);
  });

  it("con un proveedor de pago NO se pide, y no se llama a nadie", async () => {
    const modelo = modeloQueDice(JSON.stringify({ ctasPrincipales: ["Comprar"] }));
    const ficha = await pedirLaFicha("web", { texto: "x".repeat(200) }, modelo, "openai");
    expect(ficha).toEqual({});
    expect(
      modelo.complete,
      "se llamó a un proveedor de pago para una ayuda de calidad que nadie autorizó",
    ).not.toHaveBeenCalled();
  });

  it("con el modo de coste cero apagado a propósito, sí se pide", () => {
    // La política ya distingue «gratis» de «alguien lo apagó». Aquí solo se
    // comprueba que esto la respeta en vez de decidir por su cuenta.
    vi.stubEnv("NELVYON_MODO_COSTE_CERO", "0");
    expect(sePuedePedirSinCoste("openai")).toBe(true);
  });
});

describe("un modelo lento no retrasa una entrega ya terminada", () => {
  it("si el modelo no contesta a tiempo, se sigue sin ficha", async () => {
    // El caso que motivo el plazo: en produccion `OLLAMA_HOST` apunta a una IP
    // de red privada. Una IP que RECHAZA falla rapido; una que se traga los
    // paquetes deja la peticion colgada hasta el plazo del cliente —120 s para
    // el modelo rapido—. Eso es un trabajo terminado esperando dos minutos por
    // una ayuda de calidad opcional.
    vi.useFakeTimers();
    try {
      const modelo = { complete: vi.fn(() => new Promise<string>(() => {})) };
      const pedida = pedirLaFicha("web", { texto: "x".repeat(200) }, modelo, "ollama");
      await vi.advanceTimersByTimeAsync(PLAZO_DE_LA_FICHA_MS + 1);
      await expect(pedida).resolves.toEqual({});
    } finally {
      vi.useRealTimers();
    }
  });

  it("el plazo es MUCHO menor que el del cliente de agentes", () => {
    // Si algun dia se igualara al del cliente, el plazo dejaria de servir para
    // lo unico que sirve.
    expect(PLAZO_DE_LA_FICHA_MS).toBeLessThan(120_000);
  });
});

describe("el texto que se le enseña al modelo", () => {
  it("recoge lo anidado, que es donde vive lo que devuelve un agente", () => {
    const texto = textoDelResultado({
      steps: [{ name: "s1", data: { output: "la llamada principal es Comprar" } }],
    });
    expect(texto).toContain("Comprar");
  });

  it("tiene tope: un entregable enorme no convierte esto en el paso más caro", () => {
    const texto = textoDelResultado({ a: "z".repeat(TOPE_DE_TEXTO * 3) });
    expect(texto.length).toBeLessThanOrEqual(TOPE_DE_TEXTO);
  });
});

describe("con la ficha delante, las ocho DEVUELVEN VEREDICTO", () => {
  // Esto es lo que estaba roto. Devolver `undefined` es «no se pudo comprobar»:
  // la comprobación existía en el código y no juzgaba nada.
  const CASOS: Array<[string, string, Record<string, unknown>]> = [
    [
      "seo",
      "canibalizacion",
      {
        paginas: [
          { url: "/a", objetivo: "pan artesano bilbao" },
          { url: "/b", objetivo: "pan artesano bilbao" },
        ],
      },
    ],
    ["crm", "cualificacion-explicada", { criteriosDeCualificacion: [] }],
    ["web", "una-idea-por-pantalla", { ctasPrincipales: ["Comprar", "Reservar", "Llamar"] }],
    [
      "web",
      "formulario-pide-lo-justo",
      {
        camposDelFormulario: [
          { nombre: "nombre", obligatorio: true },
          { nombre: "email", obligatorio: true },
          { nombre: "empresa", obligatorio: true },
          { nombre: "cargo", obligatorio: true },
          { nombre: "presupuesto", obligatorio: true },
        ],
      },
    ],
    ["ecommerce", "el-precio-no-aparece-tarde", { pasoDondeApareceElPrecio: 4, pasosDelProceso: 4 }],
    [
      "ecommerce",
      "gastos-de-envio-sin-sorpresas",
      { cuandoSeMuestranGastosDeEnvio: "en el último paso" },
    ],
    ["creatividad", "se-puede-leer-lo-que-pone", { contrasteTextoFondo: 2.1 }],
    ["reporting", "empieza-por-lo-que-el-cliente-queria", { primeraSeccion: "metodología del análisis" }],
  ];

  for (const [dominio, id, ficha] of CASOS) {
    it(`${id} ya no dice «no se pudo comprobar»`, () => {
      const comprobacion = comprobacionesDe(dominio).find((c) => c.id === id);
      expect(comprobacion, `${id} no existe en ${dominio}`).toBeDefined();

      const sinFicha: Pieza = { dominio, autor: "agente", contenido: { texto: "algo" } };
      expect(
        comprobacion!.evaluar(sinFicha),
        `${id} juzga sin ficha: entonces nunca estuvo bloqueada`,
      ).toBeUndefined();

      const conFicha: Pieza = { dominio, autor: "agente", contenido: { texto: "algo", ...ficha } };
      expect(
        comprobacion!.evaluar(conFicha),
        `${id} sigue sin poder juzgar con la ficha delante`,
      ).not.toBeUndefined();
    });
  }
});

describe("ningún campo del contrato se queda sin explicar ni sin lector", () => {
  it("cada campo dice qué es y quién lo lee", () => {
    // Un campo sin frase no se le puede pedir a un modelo; un campo sin lector
    // es una llamada que se gasta para nada. Las dos cosas dejan la cadena rota
    // igual que estaba.
    for (const campo of Object.keys(QUIEN_LEE_CADA_CAMPO)) {
      expect(
        QUE_ES_CADA_CAMPO[campo as keyof typeof QUE_ES_CADA_CAMPO],
        `el campo «${campo}» no dice cómo se le pide a un modelo`,
      ).toBeTruthy();
    }
    expect(Object.keys(QUE_ES_CADA_CAMPO).sort()).toEqual(Object.keys(QUIEN_LEE_CADA_CAMPO).sort());
  });
});
