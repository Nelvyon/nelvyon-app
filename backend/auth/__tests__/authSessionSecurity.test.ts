import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Auth / sesiones — controles críticos, ejecutables.
 *
 * No es una auditoría estática: se firma y verifica con la implementación real,
 * se manipulan tokens y se comprueba el comportamiento observable.
 */
import jwt from "jsonwebtoken";

const SECRETO = "un-secreto-de-pruebas-con-mas-de-32-caracteres";

const consulta = vi.fn();
vi.mock("../../db/DbClient", () => ({
  DbClient: { getInstance: () => ({ query: consulta }) },
}));

describe("JWT — algoritmo y manipulación", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = SECRETO;
  });

  it("rechaza un token firmado con OTRO secreto", () => {
    const ajeno = jwt.sign({ userId: "u1" }, "otro-secreto-igualmente-largo-de-32-chars");
    expect(() => jwt.verify(ajeno, SECRETO, { algorithms: ["HS256"] })).toThrow();
  });

  it("rechaza alg=none: el downgrade de algoritmo no cuela", () => {
    // Token con cabecera alg:none y sin firma — el ataque clásico.
    const cabecera = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const cuerpo = Buffer.from(JSON.stringify({ userId: "atacante" })).toString("base64url");
    const tokenNone = `${cabecera}.${cuerpo}.`;
    expect(() => jwt.verify(tokenNone, SECRETO, { algorithms: ["HS256"] })).toThrow();
  });

  it("rechaza un token con el payload alterado (firma inválida)", () => {
    const valido = jwt.sign({ userId: "u1", plan: "starter" }, SECRETO, { algorithm: "HS256" });
    const [h, , s] = valido.split(".");
    const cuerpoFalso = Buffer.from(JSON.stringify({ userId: "u1", plan: "agency" })).toString(
      "base64url",
    );
    expect(() => jwt.verify(`${h}.${cuerpoFalso}.${s}`, SECRETO, { algorithms: ["HS256"] })).toThrow();
  });

  it("un usuario NO puede convertirse en otro alterando claims", () => {
    const deA = jwt.sign({ userId: "usuario-A", tenantId: "tenant-A" }, SECRETO, { algorithm: "HS256" });
    const [h, , s] = deA.split(".");
    const suplantado = Buffer.from(
      JSON.stringify({ userId: "usuario-B", tenantId: "tenant-B" }),
    ).toString("base64url");
    expect(() => jwt.verify(`${h}.${suplantado}.${s}`, SECRETO, { algorithms: ["HS256"] })).toThrow();
  });

  it("rechaza un token expirado", () => {
    const caducado = jwt.sign({ userId: "u1" }, SECRETO, { algorithm: "HS256", expiresIn: -10 });
    expect(() => jwt.verify(caducado, SECRETO, { algorithms: ["HS256"] })).toThrow(/expired/i);
  });

  it("rechaza un token emitido en el futuro (nbf)", () => {
    const futuro = jwt.sign(
      { userId: "u1", nbf: Math.floor(Date.now() / 1000) + 3600 },
      SECRETO,
      { algorithm: "HS256" },
    );
    expect(() => jwt.verify(futuro, SECRETO, { algorithms: ["HS256"] })).toThrow(/not active/i);
  });

  it("un token válido verifica y conserva sus claims", () => {
    const t = jwt.sign({ userId: "u1", tenantId: "t1" }, SECRETO, { algorithm: "HS256" });
    const d = jwt.verify(t, SECRETO, { algorithms: ["HS256"] }) as Record<string, unknown>;
    expect(d.userId).toBe("u1");
    expect(d.tenantId).toBe("t1");
  });
});

describe("JWT_SECRET — fail-closed", () => {
  const original = process.env.JWT_SECRET;
  afterEach(() => {
    process.env.JWT_SECRET = original;
    vi.resetModules();
  });

  it("sin JWT_SECRET el servicio no arranca", async () => {
    delete process.env.JWT_SECRET;
    vi.resetModules();
    const { getAuthService } = await import("../AuthService");
    expect(() => getAuthService()).toThrow(/JWT_SECRET/);
  });

  it("un secreto corto (<32) se rechaza: nada de defaults débiles", async () => {
    process.env.JWT_SECRET = "corto";
    vi.resetModules();
    const { getAuthService } = await import("../AuthService");
    expect(() => getAuthService()).toThrow(/32 characters/i);
  });

  it("un secreto vacío o de espacios se rechaza", async () => {
    process.env.JWT_SECRET = "     ";
    vi.resetModules();
    const { getAuthService } = await import("../AuthService");
    expect(() => getAuthService()).toThrow(/JWT_SECRET/);
  });
});

describe("login — no revela si el usuario existe", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = SECRETO;
    consulta.mockReset();
    vi.resetModules();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("usuario inexistente y contraseña incorrecta dan EL MISMO mensaje", async () => {
    const { getAuthService } = await import("../AuthService");
    const svc = getAuthService();

    consulta.mockResolvedValueOnce([]); // no existe
    const inexistente = await svc.login("nadie@nelvyon.test", "x").catch((e) => String(e.message));

    consulta.mockResolvedValueOnce([
      {
        user_id: "u1",
        email: "existe@nelvyon.test",
        // hash bcrypt válido de otra contraseña
        password_hash: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
        full_name: "X",
        plan: "starter",
        tenant_id: "t1",
      },
    ]);
    const malaPassword = await svc
      .login("existe@nelvyon.test", "incorrecta")
      .catch((e) => String(e.message));

    // Mismo texto: sin enumeración por el mensaje.
    expect(inexistente).toBe(malaPassword);
    expect(inexistente).toMatch(/Invalid credentials/);
  });
});

/**
 * Oráculo de enumeración por TEMPORIZACIÓN.
 *
 * El mensaje ya era idéntico, pero el ramal "usuario no existe" retornaba sin
 * ejecutar bcrypt, así que respondía en el tiempo de una consulta mientras que
 * "contraseña incorrecta" pagaba un bcrypt de coste 12. La diferencia es
 * medible desde fuera y delata qué emails existen.
 *
 * No se busca igualdad nanosegundo a nanosegundo — eso sería frágil en CI. Se
 * comprueba lo estructural: que el camino sin usuario TAMBIÉN ejecuta bcrypt, y
 * que los tiempos quedan en el mismo orden de magnitud.
 */
describe("login — sin oráculo de enumeración por temporización", () => {
  const HASH_REAL = "$2a$12$N9qo8uLOickgx2ZMRZoMyeGZ8b4H1JfQ0Q6h1qk1pQ8k4Wt0eOJmS";
  const previo = process.env.JWT_SECRET;
  afterEach(() => {
    if (previo === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previo;
    vi.resetModules();
  });

  beforeEach(() => {
    process.env.JWT_SECRET = SECRETO;
    consulta.mockReset();
    vi.resetModules();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  async function medir(fn: () => Promise<unknown>): Promise<number> {
    const t0 = performance.now();
    await fn().catch(() => undefined);
    return performance.now() - t0;
  }

  it("el ramal sin usuario ejecuta bcrypt igualmente", async () => {
    const { getAuthService } = await import("../AuthService");
    const svc = getAuthService();
    const spy = vi.spyOn(svc, "comparePassword");

    consulta.mockResolvedValueOnce([]); // el email no existe
    await svc.login("nadie@nelvyon.test", "x").catch(() => undefined);

    // Lo esencial: se pagó el coste criptográfico aunque no hubiera usuario.
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("ambos ramales quedan en el mismo orden de magnitud", async () => {
    const { getAuthService } = await import("../AuthService");
    const svc = getAuthService();

    consulta.mockResolvedValue([]);
    const sinUsuario = await medir(() => svc.login("nadie@nelvyon.test", "x"));

    consulta.mockResolvedValue([
      {
        user_id: "u1",
        email: "existe@nelvyon.test",
        password_hash: HASH_REAL,
        full_name: "X",
        plan: "starter",
        tenant_id: "t1",
      },
    ]);
    const malaPassword = await medir(() => svc.login("existe@nelvyon.test", "incorrecta"));

    // Antes del arreglo la relación era de dos órdenes de magnitud (retorno
    // inmediato frente a bcrypt coste 12). Un factor < 5 elimina la señal
    // estructural sin exigir una igualdad frágil en CI.
    const mayor = Math.max(sinUsuario, malaPassword);
    const menor = Math.max(1, Math.min(sinUsuario, malaPassword));
    expect(mayor / menor).toBeLessThan(5);
  });

});
