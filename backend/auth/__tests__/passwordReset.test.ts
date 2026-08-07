import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * El contrato de `requestPasswordReset` es de NO ENUMERACIÓN: quien llama no
 * puede distinguir un email inexistente de uno existente, ni cuando el envío
 * falla. Antes, un fallo de SES se propagaba y la ruta devolvía 500 solo para
 * usuarios que SÍ existen, mientras que un email desconocido devolvía 200: el
 * código de estado revelaba qué cuentas hay.
 */

const consulta = vi.fn();
const enviar = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: { getInstance: () => ({ query: consulta }) },
}));
vi.mock("../../email", () => ({ sendEmail: enviar }));
vi.mock("../../email/resolveUserEmailLocale", () => ({
  resolveUserEmailLocale: vi.fn(async () => "es"),
}));
vi.mock("../AuthService", () => ({ getAuthService: () => ({}) }));

const USUARIO = { user_id: "u-1", email: "qa@nelvyon.test", full_name: "QA" };

describe("requestPasswordReset — no enumeración de usuarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("email inexistente: no lanza, no persiste token y no envía nada", async () => {
    consulta.mockResolvedValueOnce([]); // SELECT sin filas
    const { requestPasswordReset } = await import("../passwordReset");

    await expect(requestPasswordReset("nadie@nelvyon.test")).resolves.toBeUndefined();

    expect(consulta).toHaveBeenCalledTimes(1); // solo el SELECT: ningún UPDATE
    expect(enviar).not.toHaveBeenCalled();
  });

  it("usuario existente con SES OK: persiste el token y envía el email", async () => {
    consulta.mockResolvedValueOnce([USUARIO]).mockResolvedValueOnce([]);
    enviar.mockResolvedValueOnce(undefined);
    const { requestPasswordReset } = await import("../passwordReset");

    await expect(requestPasswordReset(USUARIO.email)).resolves.toBeUndefined();

    expect(consulta).toHaveBeenCalledTimes(2); // SELECT + UPDATE del token
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(enviar.mock.calls[0]?.[0]).toBe("password_reset");
  });

  it("usuario existente con SES CAÍDO: no propaga el error", async () => {
    consulta.mockResolvedValueOnce([USUARIO]).mockResolvedValueOnce([]);
    enviar.mockRejectedValueOnce(new Error("SES no configurado"));
    const { requestPasswordReset } = await import("../passwordReset");

    // Esto es lo que fallaba: el rechazo llegaba a la ruta y salía como 500.
    await expect(requestPasswordReset(USUARIO.email)).resolves.toBeUndefined();

    expect(consulta).toHaveBeenCalledTimes(2); // el token SÍ queda persistido
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it("los tres casos son indistinguibles desde fuera", async () => {
    const { requestPasswordReset } = await import("../passwordReset");

    consulta.mockResolvedValueOnce([]);
    const inexistente = await requestPasswordReset("nadie@nelvyon.test").then(
      () => "resuelve",
      () => "lanza",
    );

    consulta.mockResolvedValueOnce([USUARIO]).mockResolvedValueOnce([]);
    enviar.mockResolvedValueOnce(undefined);
    const conEnvio = await requestPasswordReset(USUARIO.email).then(
      () => "resuelve",
      () => "lanza",
    );

    consulta.mockResolvedValueOnce([USUARIO]).mockResolvedValueOnce([]);
    enviar.mockRejectedValueOnce(new Error("SES caído"));
    const sinEnvio = await requestPasswordReset(USUARIO.email).then(
      () => "resuelve",
      () => "lanza",
    );

    expect([inexistente, conEnvio, sinEnvio]).toEqual(["resuelve", "resuelve", "resuelve"]);
  });
});
