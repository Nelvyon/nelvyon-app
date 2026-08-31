/**
 * NINGÚN AGENTE LE MANDA AL MODELO UNA PLANTILLA A MEDIO RELLENAR.
 *
 * QUÉ MIDE, Y POR QUÉ AHORA SE PUEDE MEDIR. Al escribir las pruebas de
 * `fillPromptTemplate` apareció que un hueco sin valor viajaba al modelo con
 * las llaves puestas —`{clientDomain}`— y en silencio. Se arregló el aviso,
 * pero el aviso sólo cubre una de las formas de construir un prompt. En este
 * repositorio conviven al menos dos convenciones:
 *
 *     {loQueSea}     — `fillPromptTemplate`, biblioteca élite
 *     {{LO_QUE_SEA}} — `buildPrompt`, plantillas del lote 2
 *
 * Así que esto no comprueba una función: comprueba **el texto que de verdad
 * sale hacia el modelo**, se haya construido como se haya construido. Es la
 * única forma de que una convención nueva no se escape sin que nadie se entere.
 *
 * POR QUÉ IMPORTA. Un hueco sin rellenar no es un fallo cosmético: es el dato
 * del cliente que no llegó. Y este sistema se juzga por no ser genérico. Un
 * prompt que le dice al modelo «CLIENTE: {clientDomain}» está pidiendo
 * exactamente el entregable de nadie.
 *
 * EL INVENTARIO SALE DEL ÁRBOL. Los agentes se descubren recorriendo
 * `backend/os-agents/agents`, así que un servicio nuevo entra solo. Una lista a
 * mano diría «todos» sobre unos cuantos.
 *
 * LO QUE NO MIDE: si el contenido del prompt es bueno. Sólo si está completo.
 * Un prompt sin huecos puede seguir siendo malo; uno con huecos es malo seguro.
 *
 * COSTE EXTERNO: 0 €. El modelo va doblado y no se llama a ningún proveedor.
 */
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { ModeloQueSoloEscucha, type AgenteMedible } from "../bancoAntiGenerico";
import { CLIENTES, cargaDe } from "../clientesSinteticos";

/** Plazo del fichero: recorre el árbol de agentes y los ejecuta uno a uno. */
vi.setConfig({ testTimeout: 120_000 });

const RAIZ = path.resolve(__dirname, "..", "..", "..");
const DIR = path.join(RAIZ, "backend", "os-agents", "agents");

function ficherosDeAgentes(): string[] {
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith("Agent.ts"))
    .map((f) => path.join(DIR, f))
    .sort();
}

function fabricaDe(mod: Record<string, unknown>): ((llm: ModeloQueSoloEscucha) => AgenteMedible) | null {
  const clase = Object.entries(mod).find(([k, v]) => k.endsWith("Agent") && typeof v === "function");
  if (!clase) return null;
  return (llm) => new (clase[1] as new (l: unknown) => AgenteMedible)(llm);
}

/**
 * Los huecos que quedan en un texto ya construido.
 *
 * Se buscan las DOS convenciones. El orden importa: `{{X}}` contiene `{X}`, así
 * que primero se saca la doble y luego se mira lo que queda, o la misma
 * ausencia se contaría dos veces con dos nombres distintos.
 */
export function huecosQueQuedan(texto: string): string[] {
  const dobles = [...texto.matchAll(/\{\{(\w+)\}\}/g)].map((m) => `{{${m[1]}}}`);
  const sinDobles = texto.replace(/\{\{\w+\}\}/g, " ");
  const simples = [...sinDobles.matchAll(/\{(\w+)\}/g)].map((m) => `{${m[1]}}`);
  return [...new Set([...dobles, ...simples])];
}

/** Ejecuta el primer paso de un agente y devuelve lo que le pidió al modelo. */
async function loQuePideAlModelo(
  crear: (llm: ModeloQueSoloEscucha) => AgenteMedible,
  cliente = CLIENTES[0],
): Promise<string | null> {
  const doble = new ModeloQueSoloEscucha();
  let agente: AgenteMedible;
  try {
    agente = crear(doble);
  } catch {
    return null;
  }
  const primero = agente.steps?.[0];
  if (!primero) return null;
  try {
    await primero.run(cargaDe(cliente), { stepResults: {}, clientId: cliente.id, jobId: "huecos" });
  } catch {
    // Puede fallar DESPUÉS de pedir. Si pidió, lo pedido vale.
  }
  return doble.recibido.length > 0 ? doble.recibido.join("\n") : null;
}

describe("el detector de huecos distingue las dos convenciones", () => {
  it("encuentra las llaves simples y las dobles", () => {
    expect(huecosQueQuedan("CLIENTE: {clientDomain}")).toEqual(["{clientDomain}"]);
    expect(huecosQueQuedan("CLIENTE: {{CLIENT_NAME}}")).toEqual(["{{CLIENT_NAME}}"]);
  });

  it("no cuenta dos veces el mismo hueco doble", () => {
    // `{{X}}` contiene `{X}`: sin quitar primero las dobles, una sola ausencia
    // saldría como dos huecos con dos nombres.
    expect(huecosQueQuedan("{{SECTOR}}")).toEqual(["{{SECTOR}}"]);
  });

  it("EL CONTROL: un texto ya relleno no tiene huecos", () => {
    // Sin esto, un detector que devolviera siempre algo pasaría las de arriba.
    expect(huecosQueQuedan("CLIENTE: Acme SECTOR: salud dental")).toEqual([]);
    // Y una llave suelta que no es un hueco tampoco cuenta.
    expect(huecosQueQuedan("usa el formato { clave: valor }")).toEqual([]);
  });
});

describe("lo que de verdad sale hacia el modelo", () => {
  it("el inventario de agentes sale del árbol y no está vacío", () => {
    // Un inventario vacío pondría verde la prueba de abajo sin haber mirado
    // ningún agente, que es el aprobado falso más fácil de conseguir.
    expect(ficherosDeAgentes().length).toBeGreaterThan(20);
  });

  it("LA REGLA: ningún agente manda una plantilla a medio rellenar", async () => {
    const conHuecos: Array<{ agente: string; huecos: string[] }> = [];
    let medidos = 0;

    for (const fichero of ficherosDeAgentes()) {
      let mod: Record<string, unknown>;
      try {
        mod = (await import(/* @vite-ignore */ fichero)) as Record<string, unknown>;
      } catch {
        continue;
      }
      const crear = fabricaDe(mod);
      if (!crear) continue;

      const pedido = await loQuePideAlModelo(crear);
      if (pedido === null) continue;
      medidos += 1;

      const huecos = huecosQueQuedan(pedido);
      if (huecos.length > 0) {
        conHuecos.push({ agente: path.basename(fichero, ".ts"), huecos: huecos.slice(0, 6) });
      }
    }

    // El denominador se comprueba: sin él, «0 agentes con huecos» podría
    // significar «0 agentes medidos».
    expect(medidos, "no se ha llegado a medir ningún agente").toBeGreaterThan(10);

    const detalle = conHuecos
      .map((c) => `  ${c.agente}: ${c.huecos.join(" ")}`)
      .join("\n");
    expect(
      conHuecos,
      `${conHuecos.length} de ${medidos} agentes mandan al modelo un prompt con huecos:\n${detalle}`,
    ).toEqual([]);
  });
});
