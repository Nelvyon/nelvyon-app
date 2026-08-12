/**
 * Un reintento del cliente no puede duplicar una mutacion.
 *
 * El bucle de reintento era agnostico al metodo: un POST que devolvia
 * 502/503/504 se reenviaba solo. Un 504 significa que el gateway se canso de
 * esperar, NO que el servidor no hiciera el trabajo — reintentar ahi ejecuta la
 * mutacion dos veces. Es el mismo doble efecto que se cerro en el servidor con
 * claves de idempotencia, amplificado desde este lado.
 *
 * Ademas, tras el cierre de tenencia de proveedores, 503 dejo de ser
 * necesariamente transitorio: es tambien "integracion no configurada", que no
 * mejora por reintentar.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { ApiClient } from "@/core/api/apiClient";

let intentos = 0;

function clienteConRespuesta(status: number) {
  intentos = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      intentos += 1;
      return {
        ok: false,
        status,
        headers: new Headers({ "Content-Type": "application/json" }),
        json: async () => ({ detail: "nope" }),
        text: async () => '{"detail":"nope"}',
      } as unknown as Response;
    }),
  );
  return new ApiClient({ baseUrl: "http://test", maxRetries: 1, retryDelayMs: 0 });
}

beforeEach(() => {
  intentos = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("seguridad del reintento", () => {
  it.each([502, 503, 504])("no reintenta un POST ante %i", async (status) => {
    const c = clienteConRespuesta(status);
    await expect(c.post("/api/v1/entities/contacts", { body: { a: 1 } })).rejects.toThrow();
    expect(intentos).toBe(1);
  });

  it("no reintenta un PATCH: no es idempotente", async () => {
    const c = clienteConRespuesta(503);
    await expect(c.patch("/api/v1/entities/contacts/1", { body: { a: 1 } })).rejects.toThrow();
    expect(intentos).toBe(1);
  });

  it("si reintenta un GET: repetirlo no cambia nada", async () => {
    // Contraprueba: el reintento no se ha desactivado del todo.
    const c = clienteConRespuesta(503);
    await expect(c.get("/api/v1/entities/contacts")).rejects.toThrow();
    expect(intentos).toBe(2);
  });

  it.each(["PUT", "DELETE"] as const)("si reintenta un %s: es idempotente por HTTP", async (m) => {
    const c = clienteConRespuesta(503);
    const llamada = m === "PUT"
      ? c.put("/api/v1/entities/contacts/1", { body: { a: 1 } })
      : c.delete("/api/v1/entities/contacts/1");
    await expect(llamada).rejects.toThrow();
    expect(intentos).toBe(2);
  });

  it("un POST con Idempotency-Key si se reintenta", async () => {
    // Con la clave, el servidor reconoce el reintento — es lo que hace
    // charge-pack contra Stripe.
    const c = clienteConRespuesta(503);
    await expect(
      c.post("/api/v1/payment/intent", {
        body: { a: 1 },
        headers: { "Idempotency-Key": "clave-1" },
      }),
    ).rejects.toThrow();
    expect(intentos).toBe(2);
  });

  it("un 400 no se reintenta con ningun metodo", async () => {
    const c = clienteConRespuesta(400);
    await expect(c.get("/api/v1/entities/contacts")).rejects.toThrow();
    expect(intentos).toBe(1);
  });
});
