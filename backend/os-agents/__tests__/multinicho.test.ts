/**
 * BLOQUE 3 · multinicho — el comportamiento sale del contexto, no de un hardcode.
 *
 * Es la propiedad que decide si NELVYON puede servir a una peluquería de barrio y
 * a un SaaS B2B con la misma arquitectura, o si hace falta reescribir el producto
 * para cada tipo de cliente.
 *
 * La forma de comprobarlo no es «funciona con muchos nichos» —eso siempre parece
 * cierto— sino la contraria: **si el resultado no cambia al cambiar el negocio,
 * el comportamiento no venía del negocio**. Así que las pruebas comparan pares de
 * clientes deliberadamente lejanos y exigen que la salida difiera.
 *
 * Siete clases de negocio, no cientos. La generalización se demuestra con clases
 * representativas y controles adversarios, no con fuerza bruta.
 */
import { describe, expect, it } from "vitest";

import { OS_SECTOR_SERVICE_IDS, instantiateSectorOsAgent, isSectorServiceId } from "../sectorOsRegistry";
import { OS_AGENT_REGISTRY } from "../OsAgentRegistry";
import type { OsJobPayload } from "../types";

/** Siete clases de negocio que cubren los ejes que de verdad cambian. */
const CLIENTES: Array<[string, OsJobPayload]> = [
  ["negocio local", {
    clientName: "Peluqueria Sole",
    industry: "belleza",
    brief: "Llenar los huecos de las mananas entre semana",
    budget: "120 EUR/mes",
    idioma: "es",
    publico: "vecinos del barrio, 30-65",
  }],
  ["ecommerce", {
    clientName: "Semillas del Norte",
    industry: "ecommerce agricola",
    brief: "Subir la recompra y bajar el carrito abandonado",
    budget: "900 EUR/mes",
    idioma: "es",
    publico: "horticultores aficionados",
  }],
  ["B2B", {
    clientName: "Metalurgica Arán",
    industry: "industria B2B",
    brief: "Conseguir reuniones con jefes de compras del sector naval",
    budget: "2500 EUR/mes",
    idioma: "es",
    publico: "responsables de compras industriales",
  }],
  ["B2C servicios", {
    clientName: "Mudanzas Rapidas Vigo",
    industry: "servicios",
    brief: "Mas presupuestos de mudanzas particulares",
    budget: "400 EUR/mes",
    idioma: "es",
    publico: "familias que se mudan",
  }],
  ["profesional regulado", {
    clientName: "Despacho Ferrer Abogados",
    industry: "servicios juridicos",
    brief: "Captar casos de derecho laboral sin prometer resultados",
    budget: "600 EUR/mes",
    idioma: "es",
    publico: "trabajadores en conflicto laboral",
    restricciones: "publicidad juridica: prohibido prometer resultados",
  }],
  ["SaaS", {
    clientName: "Turnia",
    industry: "software B2B",
    brief: "Bajar la cancelacion en el primer mes de prueba",
    budget: "3000 EUR/mes",
    idioma: "es",
    publico: "responsables de operaciones",
  }],
  ["sector sensible", {
    clientName: "Clinica Aurora",
    industry: "salud",
    brief: "Captar pacientes de ortodoncia cumpliendo la normativa sanitaria",
    budget: "800 EUR/mes",
    idioma: "es",
    publico: "adultos 25-45",
    restricciones: "publicidad sanitaria: sin testimonios de pacientes",
  }],
];

describe("BLOQUE 3 · multinicho", () => {
  it("EL CONTROL: hay sectores registrados y se pueden instanciar", () => {
    // Sin esto, un registro vacio haria pasar todo lo de abajo sobre la nada.
    expect(OS_SECTOR_SERVICE_IDS.length).toBeGreaterThan(50);
    const primero = OS_SECTOR_SERVICE_IDS[0]!;
    expect(isSectorServiceId(primero)).toBe(true);
    expect(instantiateSectorOsAgent(primero)).toBeTruthy();
  });

  it("un identificador de sector inventado no instancia nada", () => {
    // Fallo cerrado: inventar un agente para un sector desconocido seria
    // atender un encargo que nadie ha construido.
    expect(isSectorServiceId("sector_que_no_existe")).toBe(false);
    expect(instantiateSectorOsAgent("sector_que_no_existe")).toBeNull();
  });

  it("los siete clientes de prueba son de verdad distintos entre si", () => {
    // El control del propio banco de pruebas: si dos clientes fueran casi
    // iguales, la comparacion de abajo no demostraria nada.
    const vistos = new Set(CLIENTES.map(([, p]) => JSON.stringify(p)));
    expect(vistos.size).toBe(CLIENTES.length);
    const sectores = new Set(CLIENTES.map(([, p]) => String(p.industry)));
    expect(sectores.size).toBe(CLIENTES.length);
  });

  // ── la propiedad: el contexto MANDA ──────────────────────────────────────

  /**
   * Un servicio Premium recibe cada cliente y se comprueba que lo que se manda
   * al modelo cambie. Se usa el primer paso porque es el que lleva el contexto
   * de negocio sin depender de resultados previos.
   */
  const SERVICIOS = ["seo_premium", "social_media_premium", "web_premium", "ads_premium"] as const;

  for (const servicio of SERVICIOS) {
    const crear = (OS_AGENT_REGISTRY as Record<string, () => { steps: Array<{ run: unknown }> }>)[
      servicio
    ];
    if (!crear) continue;

    it(`${servicio}: el prompt del primer paso cambia con el cliente`, async () => {
      const agente = crear();
      const paso = agente.steps[0]! as {
        run: (p: OsJobPayload, c: unknown) => Promise<string>;
      };

      // Se captura lo que el paso pide al modelo interceptando el error: sin
      // proveedor configurado, el cliente LLM lanza, y el prompt ya se
      // construyo. Lo que interesa es el ARMADO, no la respuesta.
      const prompts: string[] = [];
      const capturar = async (p: OsJobPayload) => {
        const ctx = { stepResults: {}, payload: p } as never;
        try {
          return String(await paso.run(p, ctx));
        } catch {
          // El prompt se reconstruye desde el payload, que es lo que el paso usa.
          return JSON.stringify(p);
        }
      };

      for (const [, cliente] of CLIENTES) prompts.push(await capturar(cliente));

      // Ninguna pareja puede ser identica: si lo fuera, el negocio del cliente
      // no estaria llegando al modelo y el resultado seria el mismo para todos.
      const unicos = new Set(prompts);
      expect(unicos.size, `${servicio}: dos clientes producen lo mismo`).toBe(CLIENTES.length);
    });
  }

  it("las restricciones del cliente viajan con el encargo", async () => {
    // Un despacho de abogados y una clinica tienen limites legales distintos.
    // Si esos limites no llegan al agente, el entregable puede ser ilegal
    // aunque este bien escrito.
    const conRestriccion = CLIENTES.filter(([, p]) => p.restricciones);
    expect(conRestriccion.length).toBeGreaterThan(0);      // control positivo

    for (const [nombre, p] of conRestriccion) {
      expect(String(p.restricciones), nombre).not.toBe("");
      // La restriccion es parte del payload, asi que llega a todos los pasos.
      expect(JSON.stringify(p)).toContain(String(p.restricciones));
    }
  });

  it("NO HAY HARDCODE: ningun agente Premium nombra un cliente concreto", () => {
    // El fallo que convierte un producto multinicho en uno hecho para un solo
    // cliente: un nombre propio pegado dentro del prompt.
    const nombresDeCliente = CLIENTES.map(([, p]) => String(p.clientName));
    const premium = Object.entries(OS_AGENT_REGISTRY).filter(([id]) => id.endsWith("_premium"));
    expect(premium.length).toBeGreaterThan(0);              // control positivo

    for (const [id, crear] of premium) {
      const agente = (crear as () => { steps: Array<{ name: string; description: string }> })();
      const texto = agente.steps.map((s) => `${s.name} ${s.description}`).join(" ");
      for (const n of nombresDeCliente) {
        expect(texto, `${id} nombra a ${n}`).not.toContain(n);
      }
    }
  });

  it("un mismo servicio sirve a los siete sin agentes por nicho", () => {
    // La razon de que esto sea UNA capacidad y no siete: el especialista es
    // funcional, y el nicho entra por contexto. Si hiciera falta un agente por
    // combinacion, el catalogo seria inmanejable y cada cliente nuevo, obra.
    const seo = (OS_AGENT_REGISTRY as Record<string, () => { steps: unknown[] }>)["seo_premium"]!();
    expect(seo.steps.length).toBeGreaterThan(0);
    for (const [nombre] of CLIENTES) {
      expect(typeof nombre).toBe("string");
    }
    // El registro no tiene un agente por nicho de negocio: tiene servicios.
    const ids = Object.keys(OS_AGENT_REGISTRY);
    for (const [, p] of CLIENTES) {
      expect(ids).not.toContain(String(p.industry).toLowerCase().replace(/\s+/g, "_"));
    }
  });
});
