/**
 * UNA SOLA FUENTE DE VERDAD PARA EL CONTEXTO DEL CLIENTE.
 *
 * NELVYON tenía tres almacenes a la vez respondiendo a la misma pregunta:
 * `os_clients` (23 campos de texto), `client_profiles` (12, leído por 253
 * agentes) y el cerebro (28 dimensiones con procedencia). Tres respuestas
 * posibles para «¿cómo habla esta marca?» es una forma garantizada de que dos
 * agentes produzcan cosas incompatibles.
 *
 * Estas pruebas cubren lo que el encargo pide comprobar antes de deprecar nada:
 * cliente nuevo, cliente existente, perfil parcial, datos heredados,
 * actualizaciones concurrentes y aislamiento entre inquilinos. Y una más, que
 * es la que de verdad importa: **que los 253 agentes sigan recibiendo lo que
 * esperan**.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import pg from "pg";

import { CerebroDeNegocioService } from "../CerebroDeNegocioService";
import { construirBrief, contextoCanonico, resolverCliente } from "../fuenteCanonica";

const DSN = process.env.NELVYON_COLA_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

const WS = 910101;
const WS_OTRO = 910102;
const USUARIO = "aaaaaaaa-f0e1-4001-8001-000000000001";
const OTRO_USUARIO = "bbbbbbbb-f0e1-4002-8002-000000000002";
const CLI = "cccccccc-f0e1-4003-8003-000000000003";
const CLI_OTRO = "dddddddd-f0e1-4004-8004-000000000004";
const MARCA = "Clinica Ejemplo";

let pool: pg.Pool;
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
  await pool.query(`DELETE FROM os_client_brain_history WHERE workspace_id = ANY($1)`, [[WS, WS_OTRO]]);
  await pool.query(`DELETE FROM os_client_brain WHERE workspace_id = ANY($1)`, [[WS, WS_OTRO]]);
  await pool.query(`DELETE FROM os_clients WHERE workspace_id = ANY($1)`, [[WS, WS_OTRO]]);
  await pool.query(`DELETE FROM client_profiles WHERE user_id = ANY($1::uuid[])`, [[USUARIO, OTRO_USUARIO]]);
}

async function crearCliente(
  id: string,
  workspaceId: number,
  usuario: string,
  nombre: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO os_clients (id, workspace_id, created_by_user_id, business_name, sector, status)
     VALUES ($1::uuid, $2, $3, $4, 'dental', 'active')
     ON CONFLICT (id) DO NOTHING`,
    [id, workspaceId, usuario, nombre],
  );
}

async function crearPerfilHeredado(usuario: string, marca: string): Promise<void> {
  await pool.query(
    `INSERT INTO client_profiles (user_id, brand_name, brand_voice, target_audience, industry, usp)
     VALUES ($1::uuid, $2, 'HEREDADO: formal', 'familias', 'dental', 'sin espera')`,
    [usuario, marca],
  );
}

conBase("la fuente canónica de contexto", () => {
  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DSN, max: 8 });
    const { rows } = await pool.query(`SELECT to_regclass('public.client_profiles') t`);
    if (!rows[0].t) throw new Error("falta client_profiles en la base de pruebas");
    cerebro = new CerebroDeNegocioService(almacen());
  });

  afterAll(async () => {
    await limpiar();
    await pool.end();
  });

  beforeEach(limpiar);

  // ═════════════════════════════════════════════════════════════════════════
  describe("resolver un cliente por nombre de marca", () => {
    it("un cliente que existe se resuelve", async () => {
      await crearCliente(CLI, WS, USUARIO, MARCA);
      const r = await resolverCliente(almacen(), USUARIO, MARCA);
      expect(r.encontrado).toBe(true);
      if (r.encontrado) {
        expect(r.cliente.workspaceId).toBe(WS);
        expect(r.cliente.clientId).toBe(CLI);
      }
    });

    it("LA GARANTÍA: con DOS clientes del mismo nombre, se niega a adivinar", async () => {
      // Un nombre de marca no es un identificador. Coger el primero mezclaría
      // el contexto de dos clientes distintos, y ese fallo no daría error:
      // daría un texto plausible sobre el negocio equivocado.
      await crearCliente(CLI, WS, USUARIO, MARCA);
      await crearCliente(CLI_OTRO, WS_OTRO, USUARIO, MARCA);

      const r = await resolverCliente(almacen(), USUARIO, MARCA);
      expect(r.encontrado).toBe(false);
      if (!r.encontrado) {
        expect(r.motivo).toBe("ambiguo");
        expect(r.candidatos).toBe(2);
      }
    });

    it("el nombre no distingue mayúsculas, pero el usuario sí", async () => {
      await crearCliente(CLI, WS, USUARIO, MARCA);
      expect((await resolverCliente(almacen(), USUARIO, "clinica ejemplo")).encontrado).toBe(true);
      // El contexto de un usuario no se resuelve para otro, ni con el mismo nombre.
      expect((await resolverCliente(almacen(), OTRO_USUARIO, MARCA)).encontrado).toBe(false);
    });

    it("sin nombre o sin usuario no se resuelve nada", async () => {
      await crearCliente(CLI, WS, USUARIO, MARCA);
      expect((await resolverCliente(almacen(), USUARIO, "  ")).encontrado).toBe(false);
      expect((await resolverCliente(almacen(), "", MARCA)).encontrado).toBe(false);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("el cerebro manda cuando tiene algo", () => {
    it("un cliente CON cerebro se lee del cerebro, no del perfil heredado", async () => {
      await crearCliente(CLI, WS, USUARIO, MARCA);
      await crearPerfilHeredado(USUARIO, MARCA);
      await cerebro.escribir({
        workspaceId: WS, clientId: CLI, dimension: "brand_voice",
        valor: { texto: "CANONICO: cercano" }, procedencia: "cliente_portal", origen: "portal",
      });

      const c = await contextoCanonico(almacen(), cerebro, USUARIO, MARCA);
      expect(c.origen).toBe("cerebro");
      expect(c.campos.clientProfile_brand_voice).toBe("CANONICO: cercano");
      // Y NO se mezcla con el heredado.
      expect(JSON.stringify(c)).not.toContain("HEREDADO");
    });

    it("NO se mezclan las dos fuentes", async () => {
      // Mezclar produciría un contexto que no existe en ninguna de las dos, y
      // ante una contradicción nadie sabría cuál mandó.
      await crearCliente(CLI, WS, USUARIO, MARCA);
      await crearPerfilHeredado(USUARIO, MARCA); // tiene target_audience y usp
      await cerebro.escribir({
        workspaceId: WS, clientId: CLI, dimension: "brand_voice",
        valor: { texto: "sólo esto" }, procedencia: "cliente_portal", origen: "portal",
      });

      const c = await contextoCanonico(almacen(), cerebro, USUARIO, MARCA);
      expect(c.origen).toBe("cerebro");
      // El público estaba SÓLO en el heredado. No debe aparecer.
      expect(c.campos.clientProfile_target_audience).toBeUndefined();
    });

    it("un cliente con cerebro VACÍO cae al respaldo, que es el caso legacy", async () => {
      await crearCliente(CLI, WS, USUARIO, MARCA);
      await crearPerfilHeredado(USUARIO, MARCA);

      const c = await contextoCanonico(almacen(), cerebro, USUARIO, MARCA);
      expect(c.origen).toBe("client_profiles");
      expect(c.campos.clientProfile_brand_voice).toBe("HEREDADO: formal");
    });

    it("un cliente que no existe en ningún sitio devuelve 'ninguno'", async () => {
      const c = await contextoCanonico(almacen(), cerebro, USUARIO, "Marca Inexistente");
      expect(c.origen).toBe("ninguno");
      expect(c.brief).toBeNull();
      expect(c.campos).toEqual({});
    });

    it("un cliente AMBIGUO cae al respaldo, no a un cerebro elegido al azar", async () => {
      await crearCliente(CLI, WS, USUARIO, MARCA);
      await crearCliente(CLI_OTRO, WS_OTRO, USUARIO, MARCA);
      await cerebro.escribir({
        workspaceId: WS, clientId: CLI, dimension: "brand_voice",
        valor: { texto: "DEL PRIMERO" }, procedencia: "cliente_portal", origen: "p",
      });
      await crearPerfilHeredado(USUARIO, MARCA);

      const c = await contextoCanonico(almacen(), cerebro, USUARIO, MARCA);
      expect(c.origen).toBe("client_profiles");
      expect(JSON.stringify(c)).not.toContain("DEL PRIMERO");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("no se cruza contexto entre inquilinos", () => {
    it("el cerebro de un workspace no llega a un cliente de otro", async () => {
      await crearCliente(CLI, WS, USUARIO, MARCA);
      await cerebro.escribir({
        workspaceId: WS, clientId: CLI, dimension: "icp",
        valor: { texto: "SECRETO DE A" }, procedencia: "cliente_portal", origen: "p",
      });
      await crearCliente(CLI_OTRO, WS_OTRO, OTRO_USUARIO, "Otra Marca");

      const c = await contextoCanonico(almacen(), cerebro, OTRO_USUARIO, "Otra Marca");
      expect(JSON.stringify(c)).not.toContain("SECRETO");
    });

    it("dos usuarios con la MISMA marca no comparten contexto", async () => {
      await crearCliente(CLI, WS, USUARIO, MARCA);
      await crearCliente(CLI_OTRO, WS_OTRO, OTRO_USUARIO, MARCA);
      await cerebro.escribir({
        workspaceId: WS, clientId: CLI, dimension: "icp",
        valor: { texto: "SOLO DE USUARIO A" }, procedencia: "cliente_portal", origen: "p",
      });

      const b = await contextoCanonico(almacen(), cerebro, OTRO_USUARIO, MARCA);
      expect(JSON.stringify(b)).not.toContain("SOLO DE USUARIO A");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("lo que los 253 agentes esperan sigue llegando", () => {
    it("los nombres de campo son EXACTAMENTE los de antes", async () => {
      // Renombrarlos ahorraría unas líneas y rompería 253 ficheros.
      await crearCliente(CLI, WS, USUARIO, MARCA);
      for (const [d, v] of [
        ["empresa", { texto: MARCA }],
        ["brand_voice", { texto: "cercano" }],
        ["icp", { texto: "familias" }],
        ["sector", { texto: "dental" }],
        ["propuesta_de_valor", { texto: "sin espera" }],
        ["competidores", { competidores: [{ nombre: "Norte" }, { nombre: "Centro" }] }],
      ] as const) {
        await cerebro.escribir({
          workspaceId: WS, clientId: CLI, dimension: d,
          valor: v as Record<string, unknown>, procedencia: "cliente_portal", origen: "p",
        });
      }

      const c = await contextoCanonico(almacen(), cerebro, USUARIO, MARCA);
      expect(Object.keys(c.campos).sort()).toEqual([
        "clientProfile_brand_name",
        "clientProfile_brand_voice",
        "clientProfile_competitors",
        "clientProfile_industry",
        "clientProfile_target_audience",
        "clientProfile_usp",
      ]);
      // Y las listas llegan como texto, que es lo que un prompt consume.
      expect(c.campos.clientProfile_competitors).toBe("Norte, Centro");
    });

    it("el brief se construye y se entiende", async () => {
      const brief = construirBrief({
        clientProfile_brand_name: "Clínica Ejemplo",
        clientProfile_industry: "dental",
        clientProfile_brand_voice: "cercano",
      });
      expect(brief).toContain("Marca: Clínica Ejemplo");
      expect(brief).toContain("Voz: cercano");
    });

    it("sin ningún campo NO se inventa un brief vacío", async () => {
      expect(construirBrief({})).toBeNull();
    });

    it("un perfil PARCIAL no produce campos vacíos", async () => {
      await crearCliente(CLI, WS, USUARIO, MARCA);
      await cerebro.escribir({
        workspaceId: WS, clientId: CLI, dimension: "sector",
        valor: { texto: "dental" }, procedencia: "cliente_portal", origen: "p",
      });
      const c = await contextoCanonico(almacen(), cerebro, USUARIO, MARCA);
      expect(Object.keys(c.campos)).toEqual(["clientProfile_industry"]);
      // Y no aparece ninguna clave con undefined o cadena vacía.
      for (const v of Object.values(c.campos)) expect(v).not.toBe("");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("actualizaciones concurrentes", () => {
    it("dos escrituras a la vez dejan UN valor vigente, no dos", async () => {
      await crearCliente(CLI, WS, USUARIO, MARCA);
      await Promise.allSettled([
        cerebro.escribir({
          workspaceId: WS, clientId: CLI, dimension: "brand_voice",
          valor: { texto: "A" }, procedencia: "cliente_portal", origen: "p1",
        }),
        cerebro.escribir({
          workspaceId: WS, clientId: CLI, dimension: "brand_voice",
          valor: { texto: "B" }, procedencia: "cliente_portal", origen: "p2",
        }),
      ]);

      const { rows } = await pool.query(
        `SELECT count(*)::int n FROM os_client_brain
          WHERE workspace_id = $1 AND client_id = $2::uuid AND dimension = 'brand_voice'`,
        [WS, CLI],
      );
      expect(rows[0].n, "quedaron dos valores vigentes de la misma dimensión").toBe(1);
    });
  });
});
