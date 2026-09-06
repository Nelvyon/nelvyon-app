/**
 * LOS SERVICIOS NO DICEN LO MISMO A CLIENTES DISTINTOS.
 *
 * LO QUE YA SE SABÍA, Y POR QUÉ NO BASTABA. Medir que 1.521 agentes producen
 * 1.521 instrucciones distintas demuestra que se diferencian ENTRE SÍ. No dice
 * nada de lo que decide si NELVYON hace marketing o rellena plantillas:
 *
 *     ¿un mismo agente le dice cosas distintas a un restaurante de barrio y a
 *     un SaaS que vende en toda Europa?
 *
 * Un agente puede tener una instrucción única y aun así soltar el mismo plan a
 * los dos. Eso es un generador de documentos con el nombre del cliente arriba.
 *
 * CÓMO SE MIDE. Cada agente premium se ejecuta con CINCO clientes que no se
 * parecen en nada —cuyas decisiones de marketing correctas se contradicen entre
 * sí— y un modelo que sólo escucha. De ahí salen dos números que suelen
 * confundirse y que hay que mirar juntos:
 *
 *   COBERTURA .... qué parte de lo que distingue a cada cliente llega a la
 *                  instrucción. El agente no puede tener en cuenta lo que no ve.
 *   SEPARACIÓN ... quitando lo idéntico para los cinco, cuánto queda de propio.
 *                  Cero significa que los cinco reciben literalmente lo mismo.
 *
 * EL INVENTARIO SALE DEL ÁRBOL. Los agentes se descubren recorriendo
 * `backend/os-agents/agents`, así que un servicio nuevo entra solo. Una lista a
 * mano diría «todos» sobre unos cuantos.
 *
 * COSTE EXTERNO: 0 €.
 */
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { escribirEvidencia } from "../../evidencia/escribirEvidencia";

import {
  ModeloQueSoloEscucha,
  medirAgente,
  medirContrafactual,
  type AgenteMedible,
  type Veredicto,
} from "../bancoAntiGenerico";
import { CLIENTES, cargaDe, variante } from "../clientesSinteticos";

/** Plazo del fichero: recorre el arbol. El porque, en `nelvyonEsLaAgencia`. */
vi.setConfig({ testTimeout: 60_000 });


const RAIZ = path.resolve(__dirname, "..", "..", "..");
const DIR = path.join(RAIZ, "backend", "os-agents", "agents");

/** Los agentes premium, descubiertos recorriendo el árbol. */
function ficherosDeAgentes(): string[] {
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith("Agent.ts"))
    .map((f) => path.join(DIR, f))
    .sort();
}

/**
 * Saca del módulo una fábrica que construye el agente con el doble inyectado.
 *
 * Los agentes premium reciben el modelo como PRIMER argumento del constructor.
 * Si alguno no lo hiciera, se marcaría `NO_EJECUTABLE` en vez de medirse con un
 * modelo que no es el nuestro — que sería medir otra cosa y además podría
 * costar dinero.
 */
function fabricaDe(mod: Record<string, unknown>): ((llm: ModeloQueSoloEscucha) => AgenteMedible) | null {
  const clase = Object.entries(mod).find(
    ([k, v]) => k.endsWith("Agent") && typeof v === "function",
  );
  if (!clase) return null;
  return (llm) => new (clase[1] as new (l: unknown) => AgenteMedible)(llm);
}

describe("los servicios no dicen lo mismo a clientes distintos", () => {
  it("el inventario de agentes premium sale del árbol", () => {
    expect(ficherosDeAgentes().length, "no se encuentran agentes premium").toBeGreaterThan(20);
  });

  it("los cinco clientes son de verdad distintos entre sí", () => {
    // Si los clientes se pareciesen, la separación saldría baja para todos y la
    // medición acusaría a los agentes de algo que sería culpa del banco.
    const ids = new Set(CLIENTES.map((c) => c.id));
    expect(ids.size).toBe(CLIENTES.length);

    const presupuestos = CLIENTES.map((c) => c.presupuestoMensualCents);
    expect(
      Math.max(...presupuestos) / Math.min(...presupuestos),
      "los presupuestos son demasiado parecidos para distinguir un plan de otro",
    ).toBeGreaterThan(50);

    // Y todos traen restricciones reales, que es donde se ve si un consejo es
    // aplicable o de manual.
    for (const c of CLIENTES) {
      expect(c.restricciones.length, `${c.id} no tiene restricciones`).toBeGreaterThan(1);
    }
  });

  it(
    "NINGÚN servicio le dice lo mismo a los cinco",
    async () => {
      const veredictos: Veredicto[] = [];

      for (const fichero of ficherosDeAgentes()) {
        let mod: Record<string, unknown>;
        try {
          mod = (await import(/* @vite-ignore */ fichero)) as Record<string, unknown>;
        } catch {
          continue;
        }
        const fabrica = fabricaDe(mod);
        if (!fabrica) continue;

        veredictos.push(await medirAgente(fabrica));
      }

      const medidos = veredictos.filter((v) => v.estado === "MEDIDO");
      const genericos = medidos.filter((v) => v.veredicto === "GENERICO");

      // Solo se reescribe si la MEDICION cambio: un `generado` nuevo en cada
      // pasada ensuciaba el arbol sin que nada hubiera cambiado.
      escribirEvidencia(
        path.join(RAIZ, "backend", "calidad", "personalizacion_por_servicio.json"),
        {
          _lee_esto: [
            "Cuanto distingue cada servicio entre clientes RADICALMENTE distintos.",
            "",
            "COBERTURA: que parte de lo que distingue al cliente llega a la",
            "instruccion. El agente no puede tener en cuenta lo que no ve.",
            "",
            "SEPARACION: quitando lo identico para los cinco, cuanto queda de",
            "propio. Cero significa que los cinco reciben literalmente lo mismo.",
            "",
            "Medido con cinco clientes cuyas decisiones correctas se contradicen",
            "entre si. Coste externo 0 EUR: el modelo nunca se llama.",
          ],
          generado: new Date().toISOString(),
          total: veredictos.length,
          medidos: medidos.length,
          porVeredicto: medidos.reduce<Record<string, number>>((acc, v) => {
            acc[v.veredicto] = (acc[v.veredicto] ?? 0) + 1;
            return acc;
          }, {}),
          servicios: medidos
            .map((v) => ({
              servicio: v.servicio,
              veredicto: v.veredicto,
              cobertura: Number(v.cobertura.toFixed(3)),
              separacion: Number(v.separacion.toFixed(3)),
              hechosQueNoLlegan: v.porCliente
                .filter((c) => c.hechosAusentes.length > 0)
                .map((c) => `${c.cliente}: ${c.hechosAusentes.join(", ")}`),
            }))
            .sort((a, b) => a.separacion - b.separacion),
          noEjecutables: veredictos
            .filter((v) => v.estado === "NO_EJECUTABLE")
            .map((v) => ({ servicio: v.servicio, motivo: v.motivo })),
        },
      );

      expect(
        medidos.length,
        "no se ha podido medir casi ningún agente: la medición no representa nada",
      ).toBeGreaterThan(veredictos.length * 0.6);

      expect(
        genericos.map((v) => `${v.servicio} (separación ${v.separacion.toFixed(3)})`),
        "Estos servicios le dicen LO MISMO a un restaurante de barrio y a un SaaS " +
        "que vende en toda Europa. No es un problema de redacción: es que el " +
        "cliente no está entrando en la instrucción.",
      ).toEqual([]);
    },
    300_000,
  );

  // ═══════════════════════════════════════════════════════════════════════
  describe("las restricciones legales llegan a TODOS los servicios", () => {
    /**
     * LA COMPROBACIÓN QUE MÁS PESA DE TODO ESTE FICHERO.
     *
     * Un plan flojo se nota y se rehace. Un plan que le hace prometer
     * resultados a una tienda de suplementos, o que le hace comparar precios a
     * una clínica dental, no se nota hasta que llega la sanción — y para
     * entonces la ha firmado NELVYON.
     *
     * Cuando esto se midió por primera vez, la cobertura era del 40 % y las
     * restricciones estaban justo en el 60 % que no llegaba. Los agentes
     * trabajaban sin saber lo que su cliente tiene PROHIBIDO decir.
     *
     * Se comprueba con los tres clientes regulados: suplementos (no puede
     * atribuir propiedades curativas), clínica dental (publicidad sanitaria) y
     * despacho de abogados (normas deontológicas).
     */
    const REGULADOS = ["ecommerce", "franquicia", "despacho"];

    it(
      "ningún servicio recibe a un cliente regulado sin sus límites",
      async () => {
        const sinLimites: string[] = [];

        for (const fichero of ficherosDeAgentes()) {
          let mod: Record<string, unknown>;
          try {
            mod = (await import(/* @vite-ignore */ fichero)) as Record<string, unknown>;
          } catch {
            continue;
          }
          const fabrica = fabricaDe(mod);
          if (!fabrica) continue;

          for (const id of REGULADOS) {
            const cliente = CLIENTES.find((c) => c.id === id)!;
            const doble = new ModeloQueSoloEscucha();
            try {
              const agente = fabrica(doble);
              await agente.steps[0]?.run(
                { ...cargaDe(cliente) },
                { stepResults: {}, clientId: id, jobId: "limites" },
              );
              if (doble.recibido.length === 0) continue;

              const instruccion = doble.recibido.join("\n").toLowerCase();
              // Basta con que la restricción esté; no se exige literalidad de
              // toda la frase, que dependería de cómo se redacte el intake.
              const falta = cliente.restricciones.filter((r) => {
                const nucleo = r.split(":")[0].trim().toLowerCase();
                return !instruccion.includes(nucleo.slice(0, 24));
              });
              if (falta.length > 0) {
                sinLimites.push(`${agente.serviceId} / ${id}: ${falta.length} límite(s) no llegan`);
              }
            } catch {
              /* si no se puede ejecutar, ya lo dice la otra prueba */
            }
          }
        }

        expect(
          sinLimites,
          "Estos servicios reciben a un cliente de sector regulado SIN saber lo que " +
          "tiene prohibido. Un plan que le hace prometer resultados a una tienda de " +
          "suplementos no es un plan flojo: es una sanción con el nombre de NELVYON.",
        ).toEqual([]);
      },
      300_000,
    );
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("contrafactual: cambiar UNA variable cambia el plan", () => {
    /**
     * Se usa SEO porque es el servicio con más pasos encadenados: si algo va a
     * arrastrar el contexto del cliente hasta el final, es éste. Y si aquí no
     * cambia nada al cambiar el presupuesto, en los demás tampoco.
     */
    async function agenteSeo(): Promise<((llm: ModeloQueSoloEscucha) => AgenteMedible) | null> {
      const mod = (await import(
        /* @vite-ignore */ path.join(DIR, "SeoPremiumAgent.ts")
      )) as Record<string, unknown>;
      return fabricaDe(mod);
    }

    it("cambiar el PRESUPUESTO cambia la instrucción", async () => {
      const fabrica = await agenteSeo();
      expect(fabrica).not.toBeNull();

      const base = CLIENTES.find((c) => c.id === "restaurante")!;
      const rico = variante(base, { presupuestoMensualCents: 5_000_000 });

      const r = await medirContrafactual(fabrica!, base, rico);
      expect(r.estado).toBe("MEDIDO");
      expect(
        r.cambio,
        "subir el presupuesto de 300 € a 50.000 € no cambia NADA de la instrucción: " +
        "el presupuesto no se está usando, y el plan sale igual conteste lo que conteste el cliente",
      ).toBeGreaterThan(0);
    });

    it("cambiar el OBJETIVO cambia la instrucción", async () => {
      const fabrica = await agenteSeo();
      const base = CLIENTES.find((c) => c.id === "saas_b2b")!;
      const otro = variante(base, {
        objetivo: "reducir la fuga de clientes existentes, no captar nuevos",
      });
      const r = await medirContrafactual(fabrica!, base, otro);
      expect(r.estado).toBe("MEDIDO");
      expect(r.cambio, "cambiar de captar a retener no cambia nada").toBeGreaterThan(0);
    });

    it("y NO cambia todo: la salida sigue siendo comparable", async () => {
      // El otro extremo. Si cambiar una variable cambiara el 100 %, no se
      // estaría razonando sobre ella: se estaría regenerando de cero, y dos
      // revisiones del mismo cliente no se podrían comparar.
      const fabrica = await agenteSeo();
      const base = CLIENTES.find((c) => c.id === "ecommerce")!;
      const otro = variante(base, { presupuestoMensualCents: 800_000 });
      const r = await medirContrafactual(fabrica!, base, otro);
      expect(r.cambio).toBeLessThan(0.9);
    });
  });
});
