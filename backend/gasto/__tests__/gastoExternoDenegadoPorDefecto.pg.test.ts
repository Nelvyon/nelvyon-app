/**
 * GASTO EXTERNO = DENEGADO POR DEFECTO.
 *
 * Hoy `/api/integrations/meta-ads/launch` crea una campaña con presupuesto
 * diario real y lo único que hay entre la petición y el dinero es que haya
 * sesión y que el cuerpo tenga los campos. Ni presupuesto autorizado, ni tope
 * por operación, ni ventana temporal, ni clave de idempotencia, ni interruptor
 * de emergencia, ni rastro de quién decidió gastar.
 *
 * Mientras el botón lo pulsa una persona eso es discutible. En cuanto lo pulse
 * un agente deja de serlo: un fallo de razonamiento se convierte en dinero de
 * un cliente.
 *
 * Estas pruebas van contra PostgreSQL real porque dos de las garantías —el
 * UNIQUE de idempotencia y las restricciones de la tabla— NO existen en el
 * código: existen en el esquema. Probarlas contra un doble sería probar el
 * doble.
 *
 * NINGUNA hace una llamada externa. La guarda decide y deja rastro; ejecutar es
 * de quien la llama, y esa separación es justo lo que permite probarla entera
 * sin gastar un céntimo.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import pg from "pg";

import { GuardaDeGasto, gastoExternoHabilitado, type PeticionDeGasto } from "../guardaDeGasto";

const DSN = process.env.NELVYON_COLA_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

const TENANT = "cccccccc-0003-4003-8003-000000000003";
const WS = 970001;
const SERVICIO = "ads_premium";
const PROVEEDOR = "meta_ads";

let pool: pg.Pool;
let guarda: GuardaDeGasto;

function almacen() {
  return {
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      const r = await pool.query(sql, params);
      return r.rows as T[];
    },
  };
}

function peticion(extra: Partial<PeticionDeGasto> = {}): PeticionDeGasto {
  return {
    tenantId: TENANT,
    workspaceId: WS,
    serviceId: SERVICIO,
    proveedor: PROVEEDOR,
    actor: "agent-ads-launcher",
    operacion: "crear_campana",
    importeCents: 5_000,
    idempotencyKey: `k-${Math.random().toString(36).slice(2)}`,
    ...extra,
  };
}

/** Crea una autorización. Por defecto aprobada, vigente y holgada. */
async function autorizar(
  extra: Partial<{
    estado: string;
    presupuesto: number;
    topeOperacion: number;
    consumido: number;
    desde: string;
    hasta: string;
    proveedor: string;
  }> = {},
): Promise<string> {
  const estado = extra.estado ?? "aprobada";
  const { rows } = await pool.query(
    `INSERT INTO autorizaciones_de_gasto
       (tenant_id, workspace_id, service_id, proveedor, presupuesto_cents,
        tope_por_operacion_cents, consumido_cents, vigente_desde, vigente_hasta,
        estado, solicitada_por, aprobada_por, aprobada_en)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz,
             $10, 'daniel', $11, $12)
     RETURNING id`,
    [
      TENANT,
      WS,
      SERVICIO,
      extra.proveedor ?? PROVEEDOR,
      extra.presupuesto ?? 100_000,
      extra.topeOperacion ?? 20_000,
      extra.consumido ?? 0,
      extra.desde ?? new Date(Date.now() - 3_600_000).toISOString(),
      extra.hasta ?? new Date(Date.now() + 30 * 86_400_000).toISOString(),
      estado,
      estado === "aprobada" ? "daniel" : null,
      estado === "aprobada" ? new Date().toISOString() : null,
    ],
  );
  return rows[0].id;
}

conBase("la guarda de gasto externo", () => {
  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DSN, max: 6 });
    const { rows } = await pool.query(
      `SELECT to_regclass('public.autorizaciones_de_gasto') t`,
    );
    if (!rows[0].t) throw new Error("falta la migración 580 en la base de pruebas");
    guarda = new GuardaDeGasto(almacen());
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM gastos_ejecutados WHERE workspace_id = $1`, [WS]);
    await pool.query(`DELETE FROM autorizaciones_de_gasto WHERE workspace_id = $1`, [WS]);
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query(`DELETE FROM gastos_ejecutados WHERE workspace_id = $1`, [WS]);
    await pool.query(`DELETE FROM autorizaciones_de_gasto WHERE workspace_id = $1`, [WS]);
    vi.stubEnv("NELVYON_GASTO_EXTERNO_HABILITADO", "1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("el interruptor manda sobre todo lo demás", () => {
    it("apagado, deniega aunque la autorización sea perfecta", async () => {
      await autorizar();
      vi.stubEnv("NELVYON_GASTO_EXTERNO_HABILITADO", "");
      const v = await guarda.autorizar(peticion());
      expect(v.permitido).toBe(false);
      if (!v.permitido) expect(v.motivo).toBe("interruptor_apagado");
    });

    it("sólo lo enciende el valor 1; ningún sinónimo vale", async () => {
      await autorizar();
      // "true", "yes" y "on" NO valen. Un interruptor que acepta sinónimos
      // acaba encendido por alguien que creía estar escribiendo otra cosa.
      for (const valor of ["true", "yes", "on", "0", "", "sí", "TRUE"]) {
        vi.stubEnv("NELVYON_GASTO_EXTERNO_HABILITADO", valor);
        expect(gastoExternoHabilitado(), `"${valor}" no debería encender nada`).toBe(false);
      }
      // Los espacios alrededor SÍ se ignoran, como en el resto del árbol
      // (`AUTONOMOUS_ALLOW_OPENAI`, `NELVYON_LLM_ALLOW_DEGRADATION`). Un espacio
      // sobrante al pegar el valor en un panel no cambia la intención de quien
      // lo escribió, y hacerlo fallar produce una caída que nadie entiende.
      for (const valor of ["1", " 1 ", "1 "]) {
        vi.stubEnv("NELVYON_GASTO_EXTERNO_HABILITADO", valor);
        expect(gastoExternoHabilitado(), `"${valor}" debería encenderlo`).toBe(true);
      }
    });

    it("no depender de la base es deliberado: el interruptor decide antes", async () => {
      // Una guarda cuyo interruptor sólo funcione si la base responde no es un
      // interruptor de emergencia.
      const rota = new GuardaDeGasto({
        query: async () => {
          throw new Error("la base no responde");
        },
      });
      vi.stubEnv("NELVYON_GASTO_EXTERNO_HABILITADO", "");
      const v = await rota.autorizar(peticion());
      expect(v.permitido).toBe(false);
      if (!v.permitido) expect(v.motivo).toBe("interruptor_apagado");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("sin autorización aprobada no se gasta", () => {
    it("sin ninguna autorización, deniega", async () => {
      const v = await guarda.autorizar(peticion());
      expect(v.permitido).toBe(false);
      if (!v.permitido) expect(v.motivo).toBe("sin_autorizacion");
    });

    it.each(["pendiente", "revocada", "agotada"])(
      "una autorización en '%s' no sirve",
      async (estado) => {
        await autorizar({ estado });
        const v = await guarda.autorizar(peticion());
        expect(v.permitido).toBe(false);
      },
    );

    it("una autorización de OTRO proveedor no sirve", async () => {
      await autorizar({ proveedor: "google_ads" });
      const v = await guarda.autorizar(peticion({ proveedor: "meta_ads" }));
      expect(v.permitido).toBe(false);
      if (!v.permitido) expect(v.motivo).toBe("sin_autorizacion");
    });

    it("una autorización de OTRO workspace no sirve", async () => {
      await autorizar();
      const v = await guarda.autorizar(peticion({ workspaceId: WS + 1 }));
      expect(v.permitido).toBe(false);
    });

    it("EL CONTROL: con todo en orden, SÍ se autoriza", async () => {
      // Sin este caso, la guarda podría estar denegando siempre y todas las
      // pruebas de arriba pasarían igual.
      await autorizar();
      const v = await guarda.autorizar(peticion());
      expect(v.permitido).toBe(true);
      if (v.permitido) expect(v.restanteCents).toBe(95_000);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("los dos topes, y por qué hacen falta los dos", () => {
    it("el tope por operación corta un solo gasto grande", async () => {
      // Sin este tope, un error de un cero se lleva el presupuesto entero de
      // una vez, y el tope total no lo habría impedido.
      await autorizar({ presupuesto: 100_000, topeOperacion: 20_000 });
      const v = await guarda.autorizar(peticion({ importeCents: 20_001 }));
      expect(v.permitido).toBe(false);
      if (!v.permitido) expect(v.motivo).toBe("supera_tope_por_operacion");
    });

    it("el presupuesto total corta la suma de gastos pequeños", async () => {
      await autorizar({ presupuesto: 100_000, topeOperacion: 20_000, consumido: 90_000 });
      const v = await guarda.autorizar(peticion({ importeCents: 10_001 }));
      expect(v.permitido).toBe(false);
      if (!v.permitido) expect(v.motivo).toBe("supera_presupuesto");
    });

    it("justo en el límite se permite", async () => {
      await autorizar({ presupuesto: 100_000, topeOperacion: 20_000, consumido: 80_000 });
      const v = await guarda.autorizar(peticion({ importeCents: 20_000 }));
      expect(v.permitido).toBe(true);
      if (v.permitido) expect(v.restanteCents).toBe(0);
    });

    it("la base impide declarar un tope por operación mayor que el total", async () => {
      // Es una restricción del esquema, no del código: un tope mayor que el
      // presupuesto es un tope que no lo es.
      await expect(autorizar({ presupuesto: 10_000, topeOperacion: 50_000 })).rejects.toThrow();
    });

    it("la base impide una autorización 'aprobada' sin quién ni cuándo", async () => {
      await expect(
        pool.query(
          `INSERT INTO autorizaciones_de_gasto
             (tenant_id, workspace_id, service_id, proveedor, presupuesto_cents,
              tope_por_operacion_cents, vigente_hasta, estado, solicitada_por)
           VALUES ($1::uuid, $2, 'x', 'y', 100, 100, NOW() + interval '1 day', 'aprobada', 'nadie')`,
          [TENANT, WS],
        ),
      ).rejects.toThrow();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("la ventana temporal", () => {
    it("una autorización caducada no sirve", async () => {
      await autorizar({
        desde: new Date(Date.now() - 10 * 86_400_000).toISOString(),
        hasta: new Date(Date.now() - 86_400_000).toISOString(),
      });
      const v = await guarda.autorizar(peticion());
      expect(v.permitido).toBe(false);
      if (!v.permitido) expect(v.motivo).toBe("fuera_de_ventana");
    });

    it("una autorización que aún no ha empezado tampoco", async () => {
      await autorizar({
        desde: new Date(Date.now() + 86_400_000).toISOString(),
        hasta: new Date(Date.now() + 10 * 86_400_000).toISOString(),
      });
      const v = await guarda.autorizar(peticion());
      expect(v.permitido).toBe(false);
      if (!v.permitido) expect(v.motivo).toBe("fuera_de_ventana");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("idempotencia: el reintento de red no gasta dos veces", () => {
    it("sin clave no se autoriza nada", async () => {
      await autorizar();
      const v = await guarda.autorizar(peticion({ idempotencyKey: "" }));
      expect(v.permitido).toBe(false);
      if (!v.permitido) expect(v.motivo).toBe("clave_idempotencia_ausente");
    });

    it("LA GARANTÍA: dos solicitudes simultáneas con la misma clave, sólo una pasa", async () => {
      // El UNIQUE es lo que lo impide. Comprobar antes y escribir después
      // dejaría una ventana en la que las dos pasan, y esa ventana es
      // exactamente cuando ocurre: dos reintentos a la vez.
      const id = await autorizar();
      const p = peticion({ idempotencyKey: "misma-clave" });

      const [a, b] = await Promise.all([
        guarda.registrarSolicitud(p, id),
        guarda.registrarSolicitud(p, id),
      ]);
      const pasaron = [a, b].filter(Boolean);
      expect(pasaron, "las dos solicitudes crearon un gasto").toHaveLength(1);
    });

    it("repetir una operación ya ejecutada devuelve la de entonces, no gasta de nuevo", async () => {
      const id = await autorizar();
      const p = peticion({ idempotencyKey: "clave-repetida" });
      const solicitud = await guarda.registrarSolicitud(p, id);
      expect(solicitud).not.toBeNull();
      await guarda.marcarEjecutado(solicitud!.gastoId, id, p.importeCents, "campana-123");

      const v = await guarda.autorizar(p);
      expect(v.permitido).toBe(true);
      if (v.permitido) {
        expect(v.yaEjecutado).toBe(true);
        expect(v.referenciaExterna).toBe("campana-123");
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("el rastro y el descuento", () => {
    it("ejecutar descuenta del presupuesto", async () => {
      const id = await autorizar({ presupuesto: 100_000, topeOperacion: 50_000 });
      const p = peticion({ importeCents: 30_000 });
      const s = await guarda.registrarSolicitud(p, id);
      await guarda.marcarEjecutado(s!.gastoId, id, p.importeCents, "ref-1");

      const { rows } = await pool.query(
        `SELECT consumido_cents::int c, estado FROM autorizaciones_de_gasto WHERE id = $1`,
        [id],
      );
      expect(rows[0].c).toBe(30_000);
      expect(rows[0].estado).toBe("aprobada");
    });

    it("al agotar el presupuesto la autorización pasa a 'agotada' sola", async () => {
      const id = await autorizar({ presupuesto: 30_000, topeOperacion: 30_000 });
      const p = peticion({ importeCents: 30_000 });
      const s = await guarda.registrarSolicitud(p, id);
      await guarda.marcarEjecutado(s!.gastoId, id, p.importeCents, "ref-1");

      const { rows } = await pool.query(
        `SELECT estado FROM autorizaciones_de_gasto WHERE id = $1`,
        [id],
      );
      expect(rows[0].estado).toBe("agotada");

      // Y una vez agotada, ya no autoriza.
      const v = await guarda.autorizar(peticion({ importeCents: 1 }));
      expect(v.permitido).toBe(false);
    });

    it("un gasto FALLIDO no descuenta nada", async () => {
      // Descontar por algo que no llegó a ocurrir consume presupuesto del
      // cliente sin haberle dado nada.
      const id = await autorizar({ presupuesto: 100_000, topeOperacion: 50_000 });
      const p = peticion({ importeCents: 30_000 });
      const s = await guarda.registrarSolicitud(p, id);
      await guarda.marcarFallido(s!.gastoId, "el proveedor rechazo la campana");

      const { rows } = await pool.query(
        `SELECT consumido_cents::int c FROM autorizaciones_de_gasto WHERE id = $1`,
        [id],
      );
      expect(rows[0].c).toBe(0);
    });

    it("todo gasto lleva actor, y sin actor no se autoriza", async () => {
      await autorizar();
      const v = await guarda.autorizar(peticion({ actor: "   " }));
      expect(v.permitido).toBe(false);
      if (!v.permitido) expect(v.motivo).toBe("actor_ausente");
    });

    it("una denegación deja rastro", async () => {
      await autorizar({ presupuesto: 10_000, topeOperacion: 1_000 });
      const p = peticion({ importeCents: 9_999 });
      const v = await guarda.autorizar(p);
      expect(v.permitido).toBe(false);
      await guarda.registrarDenegacion(p, v);

      const { rows } = await pool.query(
        `SELECT estado, detalle FROM gastos_ejecutados
          WHERE workspace_id = $1 AND estado = 'denegado'`,
        [WS],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].detalle.motivo).toBe("supera_tope_por_operacion");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("ante la duda, se deniega", () => {
    it("si la base revienta, deniega", async () => {
      const rota = new GuardaDeGasto({
        query: async () => {
          throw new Error("connection terminated");
        },
      });
      const v = await rota.autorizar(peticion());
      expect(v.permitido).toBe(false);
      if (!v.permitido) expect(v.motivo).toBe("error_al_comprobar");
    });

    it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
      "un importe de %s se deniega",
      async (importe) => {
        await autorizar();
        const v = await guarda.autorizar(peticion({ importeCents: importe as number }));
        expect(v.permitido).toBe(false);
        if (!v.permitido) expect(v.motivo).toBe("importe_invalido");
      },
    );
  });
});
