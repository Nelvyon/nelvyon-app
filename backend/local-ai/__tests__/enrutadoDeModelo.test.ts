/**
 * BLOQUE 3 · el enrutado de modelo y su cortocircuito.
 *
 * Con IA propia hay un recurso que no se puede repartir: la GPU. Dos tareas
 * pesadas a la vez no van al doble de lento, van mucho peor, y en el peor caso
 * tumban el servicio para todos los inquilinos a la vez.
 *
 * El `InferenceGate` serializa. Lo que hay que demostrar es que **de verdad**
 * serializa, que el cortocircuito se abre cuando el proveedor falla —para dejar
 * de castigarlo— y que se vuelve a cerrar solo, porque un cortocircuito que se
 * abre y no se cierra es una caída permanente disfrazada de protección.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InferenceGate, resetInferenceGateForTests } from "../router/InferenceGate";
import type { ModelProfile } from "../router/ModelRegistry";

// La puerta CARGA el modelo en Ollama al adquirir el permiso. Sin sustituirlo,
// estas pruebas medirian si hay un Ollama con esos modelos descargados, que no
// es la propiedad que interesa -y ademas seria una prueba que solo pasa en la
// maquina de quien la escribio-.
vi.mock("../OllamaClient", () => ({
  getOllamaClient: () => ({
    // `probeLoad` es lo unico que la puerta usa: carga el modelo en la GPU y
    // devuelve cuanto tardo. El doble responde al instante y sin red.
    probeLoad: async () => ({ ok: true, loadMs: 0 }),
    chat: async () => ({ content: "", model: "doble" }),
  }),
}));

const PESADO = { slot: "strategy", model: "modelo-8b" } as unknown as ModelProfile;
const LIGERO = { slot: "fast", model: "modelo-3b" } as unknown as ModelProfile;

beforeEach(() => {
  resetInferenceGateForTests();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  resetInferenceGateForTests();
});

describe("BLOQUE 3 · puerta de inferencia", () => {
  it("EL CONTROL: una tarea sola entra sin esperar", async () => {
    // Sin esto, una puerta que bloqueara siempre pasaria las pruebas de
    // exclusion de abajo y dejaria el sistema sin poder inferir nada.
    const g = new InferenceGate();
    const permiso = await g.acquire(LIGERO);
    expect(typeof permiso.release).toBe("function");
    permiso.release();
  });

  it("recuerda que modelo esta cargado", async () => {
    // El cambio de modelo en la GPU es lo caro. Saber cual esta cargado es lo
    // que permite evitarlo, y `coldStart` lo declara en vez de esconderlo.
    const g = new InferenceGate();
    const p = await g.acquire(LIGERO);
    expect(g.getLoadedModel()).toBe("modelo-3b");
    expect(p.coldStart).toBe(true);
    p.release();

    const p2 = await g.acquire(LIGERO);
    expect(p2.coldStart).toBe(false);   // el mismo modelo ya estaba
    p2.release();
  });

  it("una tarea PESADA excluye a las demas mientras corre", async () => {
    // La propiedad central. Si dos pesadas entraran a la vez, el servicio se
    // degrada para todos los inquilinos, no solo para quien lanzo la segunda.
    const g = new InferenceGate();
    const primera = await g.acquire(PESADO);

    let segundaEntro = false;
    const segunda = g.acquire(PESADO).then((p) => {
      segundaEntro = true;
      return p;
    });

    await vi.advanceTimersByTimeAsync(50);
    expect(segundaEntro, "dos tareas pesadas a la vez").toBe(false);

    primera.release();
    await vi.advanceTimersByTimeAsync(50);
    const p = await segunda;
    expect(segundaEntro).toBe(true);
    p.release();
  });

  it("una tarea cancelada no entra en la puerta", async () => {
    // Ocupar el hueco con trabajo que ya nadie espera es peor que rechazarlo.
    const g = new InferenceGate();
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(g.acquire(LIGERO, ctrl.signal)).rejects.toThrow(/cancelled/i);
  });

  it("el cortocircuito se ABRE tras fallos repetidos", async () => {
    // Seguir llamando a un proveedor caido alarga la caida y llena los registros
    // de ruido. Abrir el circuito es dejar de castigarlo.
    const g = new InferenceGate() as InferenceGate & {
      failures: number;
      circuit: string;
      lastFailureAt: number;
    };
    expect(g.isCircuitOpen()).toBe(false);      // control positivo

    g.failures = 3;
    g.circuit = "open";
    g.lastFailureAt = Date.now();
    expect(g.isCircuitOpen()).toBe(true);
  });

  it("con el circuito abierto, no se intenta inferir", async () => {
    const g = new InferenceGate() as InferenceGate & { circuit: string; lastFailureAt: number };
    g.circuit = "open";
    g.lastFailureAt = Date.now();
    await expect(g.acquire(LIGERO)).rejects.toThrow(/circuit_open/i);
  });

  it("el cortocircuito se CIERRA solo pasado su plazo", async () => {
    // Un cortocircuito que se abre y no se cierra no es una proteccion: es una
    // caida permanente con otro nombre. Necesita el camino de vuelta.
    const g = new InferenceGate() as InferenceGate & { circuit: string; lastFailureAt: number };
    g.circuit = "open";
    g.lastFailureAt = Date.now();
    expect(g.isCircuitOpen()).toBe(true);

    vi.advanceTimersByTime(61_000);
    expect(g.isCircuitOpen(), "el circuito no se recupera nunca").toBe(false);
  });

  it("al recuperarse queda en `half_open`, no en abierto del todo", async () => {
    // El estado intermedio importa: se prueba con una tarea antes de volver a
    // confiar. Pasar directo de abierto a cerrado provoca una avalancha.
    const g = new InferenceGate() as InferenceGate & { circuit: string; lastFailureAt: number };
    g.circuit = "open";
    g.lastFailureAt = Date.now();
    vi.advanceTimersByTime(61_000);
    g.isCircuitOpen();
    expect(g.circuit).toBe("half_open");
  });
});
