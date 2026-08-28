/**
 * EL CLIENTE PUEDE EMPEZAR SOLO.
 *
 * Antes, el portal cubría cinco de las quince cosas que el modelo de agencia
 * necesita. Las tres que faltaban eran justo las del principio —pedir un
 * servicio, contar lo que hace falta saber, dar acceso a sus cuentas—, así que
 * todo alta era manual y `os_clients` lo rellenaba alguien de NELVYON.
 *
 * Estas pruebas atacan las formas de que eso vuelva a fallar, y las de que la
 * solución nueva sea peor que el problema:
 *
 *   - un doble clic creando dos peticiones;
 *   - un cliente escribiendo datos que no le tocan (sus propios resultados);
 *   - un cliente viendo el ciclo de otro;
 *   - una ruta que diga "conectada" sin que lo esté;
 *   - pedirle al cliente preguntas que debemos contestar nosotros.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import pg from "pg";

import { CerebroDeNegocioService } from "../../cerebro/CerebroDeNegocioService";
import { CONEXIONES_POR_SERVICIO, CicloDelClienteService, ErrorDelCiclo } from "../CicloDelClienteService";
import { OS_PREMIUM_SERVICE_IDS } from "../../os-agents/constants";

const DSN = process.env.NELVYON_COLA_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

const WS_A = 990001;
const WS_B = 990002;
const CLI_A = "aaaaaaaa-c1c0-4001-8001-000000000001";
const CLI_B = "bbbbbbbb-c1c0-4002-8002-000000000002";

let pool: pg.Pool;
let ciclo: CicloDelClienteService;
let cerebro: CerebroDeNegocioService;

function almacen() {
  return {
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      const r = await pool.query(sql, params);
      return r.rows as T[];
    },
  };
}

async function limpiar(): Promise<void> {
  for (const t of [
    "os_client_connections",
    "os_service_requests",
    "os_client_brain_history",
    "os_client_brain",
  ]) {
    await pool.query(`DELETE FROM ${t} WHERE workspace_id = ANY($1)`, [[WS_A, WS_B]]);
  }
}

conBase("el ciclo del cliente", () => {
  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DSN, max: 8 });
    const { rows } = await pool.query(`SELECT to_regclass('public.os_service_requests') t`);
    if (!rows[0].t) throw new Error("falta la migración 582 en la base de pruebas");
    cerebro = new CerebroDeNegocioService(almacen());
    ciclo = new CicloDelClienteService(almacen(), cerebro);
  });

  afterAll(async () => {
    await limpiar();
    await pool.end();
  });

  beforeEach(limpiar);

  // ═════════════════════════════════════════════════════════════════════════
  describe("pedir un servicio", () => {
    it("un cliente puede pedir un servicio del catálogo", async () => {
      const r = await ciclo.pedirServicio({
        workspaceId: WS_A, clientId: CLI_A, serviceId: "seo_premium",
        solicitadaPor: "portal:u1", motivo: "no aparezco en Google",
      });
      expect(r.yaExistia).toBe(false);

      const mias = await ciclo.solicitudesDe(WS_A, CLI_A);
      expect(mias).toHaveLength(1);
      expect(mias[0].serviceId).toBe("seo_premium");
      expect(mias[0].estado).toBe("solicitado");
    });

    it("PEDIR NO ES COMPRAR: no se pone precio", async () => {
      // El precio es una decisión comercial. Un precio por defecto sería un
      // precio inventado, y el cliente lo leería como el precio real.
      await ciclo.pedirServicio({
        workspaceId: WS_A, clientId: CLI_A, serviceId: "seo_premium", solicitadaPor: "portal:u1",
      });
      const [s] = await ciclo.solicitudesDe(WS_A, CLI_A);
      expect(s.precioCents).toBeNull();
      expect(s.moneda).toBeNull();
      expect(s.alcance).toBeNull();
    });

    it("un doble clic NO crea dos peticiones", async () => {
      const a = await ciclo.pedirServicio({
        workspaceId: WS_A, clientId: CLI_A, serviceId: "ads_premium", solicitadaPor: "portal:u1",
      });
      const b = await ciclo.pedirServicio({
        workspaceId: WS_A, clientId: CLI_A, serviceId: "ads_premium", solicitadaPor: "portal:u1",
      });
      expect(b.yaExistia).toBe(true);
      expect(b.id).toBe(a.id);
      expect(await ciclo.solicitudesDe(WS_A, CLI_A)).toHaveLength(1);
    });

    it("dos peticiones SIMULTÁNEAS tampoco: lo impide el índice", async () => {
      // Comprobar antes y escribir después deja una ventana en la que las dos
      // pasan, y esa ventana es exactamente el doble clic.
      const [a, b] = await Promise.all([
        ciclo.pedirServicio({ workspaceId: WS_A, clientId: CLI_A, serviceId: "branding_premium", solicitadaPor: "u" }),
        ciclo.pedirServicio({ workspaceId: WS_A, clientId: CLI_A, serviceId: "branding_premium", solicitadaPor: "u" }),
      ]);
      expect(a.id).toBe(b.id);
      const { rows } = await pool.query(
        `SELECT count(*)::int n FROM os_service_requests WHERE workspace_id=$1 AND client_id=$2`,
        [WS_A, CLI_A],
      );
      expect(rows[0].n).toBe(1);
    });

    it("tras rechazar una, se puede volver a pedir", async () => {
      // El índice es PARCIAL a propósito: prohíbe dos peticiones vivas, no dos
      // peticiones en toda la historia. Un cliente que dijo que no en marzo
      // puede decir que sí en octubre.
      await ciclo.pedirServicio({ workspaceId: WS_A, clientId: CLI_A, serviceId: "web_premium", solicitadaPor: "u" });
      await pool.query(
        `UPDATE os_service_requests SET estado='rechazado' WHERE workspace_id=$1 AND client_id=$2`,
        [WS_A, CLI_A],
      );
      const r = await ciclo.pedirServicio({
        workspaceId: WS_A, clientId: CLI_A, serviceId: "web_premium", solicitadaPor: "u",
      });
      expect(r.yaExistia).toBe(false);
    });

    it("un servicio inventado se rechaza", async () => {
      await expect(
        ciclo.pedirServicio({
          workspaceId: WS_A, clientId: CLI_A, serviceId: "servicio_que_no_existe", solicitadaPor: "u",
        }),
      ).rejects.toThrow(ErrorDelCiclo);
    });

    it("pedir un servicio declara qué cuentas van a hacer falta", async () => {
      // Decirlo el primer día evita descubrirlo tres semanas después, con el
      // trabajo parado y sin que nadie sepa por qué.
      await ciclo.pedirServicio({
        workspaceId: WS_A, clientId: CLI_A, serviceId: "seo_premium", solicitadaPor: "u",
      });
      const cx = await ciclo.conexionesDe(WS_A, CLI_A);
      expect(cx.map((c) => c.proveedor).sort()).toEqual(["google_analytics", "search_console"]);
      for (const c of cx) {
        expect(c.estado).toBe("necesaria");
        // Y cada una explica PARA QUÉ, en el idioma del cliente.
        expect(c.paraQue.length).toBeGreaterThan(20);
      }
    });

    it("dos servicios que comparten cuenta no la duplican", async () => {
      await ciclo.pedirServicio({ workspaceId: WS_A, clientId: CLI_A, serviceId: "seo_premium", solicitadaPor: "u" });
      await ciclo.pedirServicio({ workspaceId: WS_A, clientId: CLI_A, serviceId: "ads_premium", solicitadaPor: "u" });
      const cx = await ciclo.conexionesDe(WS_A, CLI_A);
      const ga = cx.filter((c) => c.proveedor === "google_analytics");
      expect(ga).toHaveLength(1);
      // Y sabe que la necesitan los dos, que es lo que permite decir "esto
      // bloquea tu SEO y tus campañas".
      expect(ga[0].servicios.sort()).toEqual(["ads_premium", "seo_premium"]);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("contar lo que hace falta saber", () => {
    it("sólo se le piden las preguntas que le tocan a él", async () => {
      // `keywords` y `audiencias` las deducimos nosotros. Pedírselas es pedirle
      // que haga nuestro trabajo.
      const r = await ciclo.preguntasPendientes(WS_A, CLI_A, "seo_premium");
      const ids = r.pendientes.map((p) => p.dimension);
      expect(ids).toContain("icp");
      expect(ids).not.toContain("keywords");
    });

    it("cada pregunta viene en el idioma del cliente, no en el nuestro", async () => {
      const r = await ciclo.preguntasPendientes(WS_A, CLI_A, "seo_premium");
      for (const p of r.pendientes) {
        expect(p.pregunta, p.dimension).toMatch(/\?|\./);
        expect(p.pregunta.toLowerCase(), p.dimension).not.toContain("dimension");
      }
    });

    it("contestar guarda en el cerebro con procedencia de portal", async () => {
      await ciclo.contestar({
        workspaceId: WS_A, clientId: CLI_A, quien: "portal:u1",
        respuestas: [{ dimension: "icp", valor: { texto: "familias del barrio" } }],
      });
      const v = await cerebro.leerDimension(WS_A, CLI_A, "icp");
      expect(v?.valor.texto).toBe("familias del barrio");
      expect(v?.procedencia).toBe("cliente_portal");
    });

    it("lo contestado desaparece de lo pendiente", async () => {
      const antes = await ciclo.preguntasPendientes(WS_A, CLI_A, "seo_premium");
      await ciclo.contestar({
        workspaceId: WS_A, clientId: CLI_A, quien: "portal:u1",
        respuestas: [{ dimension: "icp", valor: { texto: "x" } }],
      });
      const despues = await ciclo.preguntasPendientes(WS_A, CLI_A, "seo_premium");
      expect(despues.pendientes.length).toBe(antes.pendientes.length - 1);
      expect(despues.contestadas).toBe(antes.contestadas + 1);
    });

    it("EL LÍMITE: el cliente NO puede escribir sus propios resultados", async () => {
      // Si el portal pudiera escribir `resultados` o `analytics`, un cliente
      // podría declarar los suyos y el motor de optimización se creería su
      // propio ruido.
      await expect(
        ciclo.contestar({
          workspaceId: WS_A, clientId: CLI_A, quien: "portal:u1",
          respuestas: [{ dimension: "resultados", valor: { ventas: 999 } }],
        }),
      ).rejects.toThrow(/la aporta medicion/);
    });

    it("tampoco puede escribir sus keywords ni sus audiencias", async () => {
      for (const d of ["keywords", "audiencias", "buyer_personas"]) {
        await expect(
          ciclo.contestar({
            workspaceId: WS_A, clientId: CLI_A, quien: "portal:u1",
            respuestas: [{ dimension: d, valor: { items: ["x"] } }],
          }),
          d,
        ).rejects.toThrow(ErrorDelCiclo);
      }
    });

    it("una dimensión inventada se rechaza", async () => {
      await expect(
        ciclo.contestar({
          workspaceId: WS_A, clientId: CLI_A, quien: "portal:u1",
          respuestas: [{ dimension: "loquesea", valor: { texto: "x" } }],
        }),
      ).rejects.toThrow(ErrorDelCiclo);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("las cuentas", () => {
    it("el cliente puede decir que NO a una cuenta", async () => {
      // Es una respuesta legítima. Perseguir para siempre algo que ya ha dicho
      // que no da es la forma más rápida de que deje de leer los avisos.
      await ciclo.pedirServicio({ workspaceId: WS_A, clientId: CLI_A, serviceId: "seo_premium", solicitadaPor: "u" });
      await ciclo.rechazarConexion(WS_A, CLI_A, "google_analytics", "no lo tengo");

      const cx = await ciclo.conexionesDe(WS_A, CLI_A);
      expect(cx.find((c) => c.proveedor === "google_analytics")?.estado).toBe("rechazada");
    });

    it("una cuenta rechazada deja de aparecer como pendiente", async () => {
      await ciclo.pedirServicio({ workspaceId: WS_A, clientId: CLI_A, serviceId: "seo_premium", solicitadaPor: "u" });
      await ciclo.rechazarConexion(WS_A, CLI_A, "google_analytics");
      const r = await ciclo.resumen(WS_A, CLI_A);
      expect(r.loQueFalta.conexiones.map((c) => c.proveedor)).not.toContain("google_analytics");
      expect(r.loQueFalta.conexiones.map((c) => c.proveedor)).toContain("search_console");
    });

    it("la base impide marcar 'conectada' sin decir cuándo", async () => {
      // Sin la fecha no se puede medir el tiempo hasta el primer entregable,
      // que es el KPI de activación.
      await ciclo.pedirServicio({ workspaceId: WS_A, clientId: CLI_A, serviceId: "seo_premium", solicitadaPor: "u" });
      await expect(
        pool.query(
          `UPDATE os_client_connections SET estado='conectada'
            WHERE workspace_id=$1 AND client_id=$2 AND proveedor='search_console'`,
          [WS_A, CLI_A],
        ),
      ).rejects.toThrow();
    });

    it("todo servicio con conexiones declaradas las explica", () => {
      for (const [servicio, cx] of Object.entries(CONEXIONES_POR_SERVICIO)) {
        expect(OS_PREMIUM_SERVICE_IDS as readonly string[], servicio).toContain(servicio);
        for (const c of cx) {
          expect(c.paraQue.trim().length, `${servicio}/${c.proveedor}`).toBeGreaterThan(20);
        }
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("un cliente no ve el ciclo de otro", () => {
    it("las solicitudes no cruzan de workspace", async () => {
      await ciclo.pedirServicio({ workspaceId: WS_A, clientId: CLI_A, serviceId: "seo_premium", solicitadaPor: "u" });
      expect(await ciclo.solicitudesDe(WS_B, CLI_A)).toHaveLength(0);
    });

    it("las conexiones tampoco", async () => {
      await ciclo.pedirServicio({ workspaceId: WS_A, clientId: CLI_A, serviceId: "seo_premium", solicitadaPor: "u" });
      expect(await ciclo.conexionesDe(WS_B, CLI_A)).toHaveLength(0);
    });

    it("ni dos clientes del mismo workspace", async () => {
      await ciclo.pedirServicio({ workspaceId: WS_A, clientId: CLI_A, serviceId: "seo_premium", solicitadaPor: "u" });
      expect(await ciclo.solicitudesDe(WS_A, CLI_B)).toHaveLength(0);
    });

    it("el resumen de uno no filtra nada del otro", async () => {
      await ciclo.pedirServicio({ workspaceId: WS_A, clientId: CLI_A, serviceId: "ads_premium", solicitadaPor: "u" });
      await ciclo.contestar({
        workspaceId: WS_A, clientId: CLI_A, quien: "u",
        respuestas: [{ dimension: "icp", valor: { texto: "SECRETO" } }],
      });
      const otro = await ciclo.resumen(WS_B, CLI_A);
      expect(otro.solicitudes).toEqual([]);
      expect(otro.serviciosActivos).toEqual([]);
      expect(JSON.stringify(otro)).not.toContain("SECRETO");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("el resumen contesta las cuatro preguntas", () => {
    it("qué he pedido, qué falta, y si se puede empezar", async () => {
      await ciclo.pedirServicio({ workspaceId: WS_A, clientId: CLI_A, serviceId: "seo_premium", solicitadaPor: "u" });
      const r = await ciclo.resumen(WS_A, CLI_A);

      expect(r.solicitudes).toHaveLength(1);
      expect(r.listoParaOperar).toBe(false);
      expect(r.loQueFalta.datos.length).toBeGreaterThan(0);
      expect(r.loQueFalta.conexiones.length).toBe(2);
      // Nada de lo que falta se presenta con un valor por defecto.
      for (const d of r.loQueFalta.datos) expect(d.motivo).toBe("ausente");
    });

    it("un servicio aceptado aparece como activo", async () => {
      await ciclo.pedirServicio({ workspaceId: WS_A, clientId: CLI_A, serviceId: "seo_premium", solicitadaPor: "u" });
      await pool.query(
        `UPDATE os_service_requests SET estado='aceptado', decidida_en=NOW()
          WHERE workspace_id=$1 AND client_id=$2`,
        [WS_A, CLI_A],
      );
      const r = await ciclo.resumen(WS_A, CLI_A);
      expect(r.serviciosActivos).toEqual(["seo_premium"]);
    });

    it("una solicitud 'propuesta' sin precio es imposible en la base", async () => {
      // Un precio sin propuesta, o una propuesta sin precio, son estados que
      // después nadie sabe interpretar.
      await ciclo.pedirServicio({ workspaceId: WS_A, clientId: CLI_A, serviceId: "seo_premium", solicitadaPor: "u" });
      await expect(
        pool.query(
          `UPDATE os_service_requests SET estado='propuesto' WHERE workspace_id=$1 AND client_id=$2`,
          [WS_A, CLI_A],
        ),
      ).rejects.toThrow();
    });
  });
});
