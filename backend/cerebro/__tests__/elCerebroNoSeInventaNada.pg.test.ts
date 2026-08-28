/**
 * EL CEREBRO NO SE INVENTA NADA.
 *
 * Antes del cerebro, el contexto de un cliente vivía en `os_clients`: 23
 * columnas `text`. `ideal_customer` era un párrafo, `competition` era otro
 * párrafo, y **ningún agente sectorial lo leía** — `grep os_clients
 * backend/os-agents/sectors/` no devuelve nada. Los 1.994 agentes recibían un
 * `brief` armado a mano en la ruta.
 *
 * Un cerebro sólo mejora eso si cumple tres cosas, y estas pruebas atacan las
 * tres formas de incumplirlas:
 *
 *   1. Lo que falta se dice, no se rellena.
 *   2. No se mezcla el contexto de dos clientes. Nunca.
 *   3. Al convertir texto libre, no se inventa estructura.
 *
 * Contra PostgreSQL real porque el aislamiento, el UNIQUE por dimensión y el
 * histórico viven en el esquema, no en el código.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import pg from "pg";

import {
  CerebroDeNegocioService,
  ErrorDeCerebro,
  confianzaPorProcedencia,
} from "../CerebroDeNegocioService";
import { DIMENSIONES, dimensionesDeServicio, dimensionesImprescindibles } from "../dimensiones";
import { aLista, importarClienteAlCerebro, pareceLista, type FilaOsClient } from "../importarDesdeOsClients";

const DSN = process.env.NELVYON_COLA_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

const WS_A = 980001;
const WS_B = 980002;
const CLI_A = "cerebro-cert-a";
const CLI_B = "cerebro-cert-b";

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

conBase("el cerebro de negocio", () => {
  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DSN, max: 6 });
    const { rows } = await pool.query(`SELECT to_regclass('public.os_client_brain') t`);
    if (!rows[0].t) throw new Error("falta la migración 581 en la base de pruebas");
    cerebro = new CerebroDeNegocioService(almacen());
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM os_client_brain_history WHERE workspace_id = ANY($1)`, [[WS_A, WS_B]]);
    await pool.query(`DELETE FROM os_client_brain WHERE workspace_id = ANY($1)`, [[WS_A, WS_B]]);
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query(`DELETE FROM os_client_brain_history WHERE workspace_id = ANY($1)`, [[WS_A, WS_B]]);
    await pool.query(`DELETE FROM os_client_brain WHERE workspace_id = ANY($1)`, [[WS_A, WS_B]]);
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("lo que falta se dice, no se rellena", () => {
    it("un cliente sin nada no devuelve dimensiones vacías", async () => {
      const c = await cerebro.leer(WS_A, CLI_A);
      expect(c.dimensiones.size).toBe(0);
      // Y NO devuelve las 28 con valor por defecto, que es la forma silenciosa
      // de convertir "no lo sé" en "lo sé".
      expect([...c.dimensiones.keys()]).toEqual([]);
    });

    it("leer una dimensión ausente devuelve null, no un objeto vacío", async () => {
      expect(await cerebro.leerDimension(WS_A, CLI_A, "icp")).toBeNull();
    });

    it("la completitud dice exactamente qué falta y quién lo aporta", async () => {
      const e = await cerebro.completitud(WS_A, CLI_A);
      expect(e.listoParaOperar).toBe(false);
      expect(e.presentes).toBe(0);
      expect(e.requeridas).toBe(dimensionesImprescindibles().length);
      for (const h of e.huecos) {
        expect(h.pregunta.length, `${h.dimension} sin pregunta`).toBeGreaterThan(0);
        expect(h.motivo).toBe("ausente");
      }
    });

    it("con todas las imprescindibles, se puede operar", async () => {
      for (const d of dimensionesImprescindibles()) {
        await cerebro.escribir({
          workspaceId: WS_A,
          clientId: CLI_A,
          dimension: d.id,
          valor: valorDeEjemplo(d.forma),
          procedencia: "cliente_intake",
          origen: "prueba",
        });
      }
      const e = await cerebro.completitud(WS_A, CLI_A);
      expect(e.listoParaOperar).toBe(true);
      expect(e.huecos).toEqual([]);
    });

    it("una dimensión CADUCADA cuenta como hueco, no como presente", async () => {
      // Un ICP de hace dos años no es un ICP. Tratar lo caducado como presente
      // es lo que hace que un agente trabaje con datos que ya no valen.
      await cerebro.escribir({
        workspaceId: WS_A,
        clientId: CLI_A,
        dimension: "objetivos",
        valor: { objetivos: [{ metrica: "leads" }] },
        procedencia: "cliente_intake",
        origen: "prueba",
      });
      await pool.query(
        `UPDATE os_client_brain SET vigente_hasta = NOW() - interval '1 day'
          WHERE workspace_id = $1 AND client_id = $2 AND dimension = 'objetivos'`,
        [WS_A, CLI_A],
      );

      const c = await cerebro.leer(WS_A, CLI_A);
      expect(c.caducadas).toContain("objetivos");
      expect(await cerebro.leerDimension(WS_A, CLI_A, "objetivos")).toBeNull();

      const e = await cerebro.completitud(WS_A, CLI_A);
      expect(e.huecos.find((h) => h.dimension === "objetivos")?.motivo).toBe("caducada");
    });

    it("sólo se pide lo que el SERVICIO usa", async () => {
      // Pedirle a un cliente de SEO su presupuesto de publicidad es ruido, y el
      // ruido es lo que hace que un onboarding no se termine.
      const deSeo = dimensionesDeServicio("seo_premium").map((d) => d.id);
      const deAds = dimensionesDeServicio("ads_premium").map((d) => d.id);
      expect(deSeo).toContain("keywords");
      expect(deSeo).not.toContain("presupuestos");
      expect(deAds).toContain("presupuestos");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("el contexto de un cliente no llega a otro", () => {
    it("LA GARANTÍA: dos workspaces no comparten cerebro", async () => {
      await cerebro.escribir({
        workspaceId: WS_A,
        clientId: CLI_A,
        dimension: "icp",
        valor: { texto: "SECRETO DE A" },
        procedencia: "cliente_intake",
        origen: "prueba",
      });
      const b = await cerebro.leer(WS_B, CLI_A);
      expect(b.dimensiones.size, "el cerebro de A se vio desde B").toBe(0);
    });

    it("el mismo id de cliente en otro workspace es otro cliente", async () => {
      await cerebro.escribir({
        workspaceId: WS_A, clientId: CLI_A, dimension: "sector",
        valor: { texto: "dental" }, procedencia: "cliente_intake", origen: "p",
      });
      await cerebro.escribir({
        workspaceId: WS_B, clientId: CLI_A, dimension: "sector",
        valor: { texto: "fitness" }, procedencia: "cliente_intake", origen: "p",
      });
      const a = await cerebro.leerDimension(WS_A, CLI_A, "sector");
      const b = await cerebro.leerDimension(WS_B, CLI_A, "sector");
      expect(a?.valor.texto).toBe("dental");
      expect(b?.valor.texto).toBe("fitness");
    });

    it("no hay forma de leer sin workspace", async () => {
      await expect(
        cerebro.leer(Number.NaN as number, CLI_A),
      ).rejects.toThrow(ErrorDeCerebro);
    });

    it("dos clientes del MISMO workspace tampoco se mezclan", async () => {
      await cerebro.escribir({
        workspaceId: WS_A, clientId: CLI_A, dimension: "icp",
        valor: { texto: "de A" }, procedencia: "cliente_intake", origen: "p",
      });
      const b = await cerebro.leer(WS_A, CLI_B);
      expect(b.dimensiones.size).toBe(0);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("la procedencia dice la verdad", () => {
    it("lo que dice el cliente vale más que lo que deduce un agente", async () => {
      // Ponerlos al mismo nivel es cómo una suposición acaba tratada como hecho.
      expect(confianzaPorProcedencia("cliente_intake")).toBe(1);
      expect(confianzaPorProcedencia("agente_deducido")).toBeLessThan(
        confianzaPorProcedencia("cliente_intake"),
      );
      expect(confianzaPorProcedencia("agente_deducido")).toBeLessThan(
        confianzaPorProcedencia("medido"),
      );
    });

    it("un agente puede exigir confianza mínima y descartar lo dudoso", async () => {
      await cerebro.escribir({
        workspaceId: WS_A, clientId: CLI_A, dimension: "icp",
        valor: { texto: "deducido" }, procedencia: "agente_deducido", origen: "agente-x",
      });
      const flojo = await cerebro.paraAgente(WS_A, CLI_A, { confianzaMinima: 0 });
      expect(flojo.contexto.icp).toBeDefined();

      const exigente = await cerebro.paraAgente(WS_A, CLI_A, { confianzaMinima: 0.9 });
      expect(exigente.contexto.icp).toBeUndefined();
      expect(exigente.faltan).toContain("icp");
    });

    it("el agente recibe la procedencia junto al valor", async () => {
      await cerebro.escribir({
        workspaceId: WS_A, clientId: CLI_A, dimension: "sector",
        valor: { texto: "dental" }, procedencia: "cliente_intake", origen: "intake",
      });
      const r = await cerebro.paraAgente(WS_A, CLI_A);
      expect(r.procedencias.sector.procedencia).toBe("cliente_intake");
      expect(r.procedencias.sector.confianza).toBe(1);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("el histórico permite explicar por qué se decidió algo", () => {
    it("sobrescribir guarda el valor anterior", async () => {
      await cerebro.escribir({
        workspaceId: WS_A, clientId: CLI_A, dimension: "brand_voice",
        valor: { texto: "formal, de usted" }, procedencia: "cliente_intake", origen: "intake",
      });
      const segunda = await cerebro.escribir({
        workspaceId: WS_A, clientId: CLI_A, dimension: "brand_voice",
        valor: { texto: "cercano, de tú" }, procedencia: "cliente_portal", origen: "portal",
      });
      expect(segunda.version).toBe(2);

      const { rows } = await pool.query(
        `SELECT valor, version FROM os_client_brain_history
          WHERE workspace_id = $1 AND client_id = $2 AND dimension = 'brand_voice'`,
        [WS_A, CLI_A],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].valor.texto).toBe("formal, de usted");
    });

    it("una dimensión, un valor vigente: la base lo impide", async () => {
      await cerebro.escribir({
        workspaceId: WS_A, clientId: CLI_A, dimension: "sector",
        valor: { texto: "uno" }, procedencia: "cliente_intake", origen: "p",
      });
      await expect(
        pool.query(
          `INSERT INTO os_client_brain (workspace_id, client_id, dimension, valor, procedencia, origen)
           VALUES ($1, $2, 'sector', '{"texto":"dos"}'::jsonb, 'cliente_intake', 'p')`,
          [WS_A, CLI_A],
        ),
      ).rejects.toThrow();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("un valor tiene que tener la forma que dice", () => {
    it("una dimensión desconocida se rechaza", async () => {
      await expect(
        cerebro.escribir({
          workspaceId: WS_A, clientId: CLI_A, dimension: "inventada",
          valor: { texto: "x" }, procedencia: "cliente_intake", origen: "p",
        }),
      ).rejects.toThrow(/no está en el catálogo/);
    });

    it("una forma equivocada se rechaza", async () => {
      // Sin esto, el cerebro sería `os_clients` otra vez: un sitio donde cabe
      // cualquier cosa y quien lo lee tiene que adivinar.
      await expect(
        cerebro.escribir({
          workspaceId: WS_A, clientId: CLI_A, dimension: "competidores",
          valor: { texto: "Zara" }, procedencia: "cliente_intake", origen: "p",
        }),
      ).rejects.toThrow(/forma "competidores"/);
    });

    it("un texto vacío no es un texto", async () => {
      await expect(
        cerebro.escribir({
          workspaceId: WS_A, clientId: CLI_A, dimension: "icp",
          valor: { texto: "   " }, procedencia: "cliente_intake", origen: "p",
        }),
      ).rejects.toThrow(/no vacío/);
    });

    it("todas las dimensiones del catálogo tienen pregunta y forma", () => {
      for (const d of DIMENSIONES) {
        expect(d.pregunta.trim().length, d.id).toBeGreaterThan(5);
        expect(d.forma.length, d.id).toBeGreaterThan(0);
      }
      // Y las imprescindibles son POCAS: si todo es imprescindible, el
      // onboarding se vuelve un muro que nadie termina.
      expect(dimensionesImprescindibles().length).toBeLessThanOrEqual(10);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("importar de os_clients sin inventar estructura", () => {
    it("una lista de verdad se parte", () => {
      expect(pareceLista("Zara, Mango, H&M")).toBe(true);
      expect(aLista("Zara, Mango, H&M")).toEqual(["Zara", "Mango", "H&M"]);
    });

    it("LA DECISIÓN QUE IMPORTA: una frase NO se parte", () => {
      // Trocear una frase por comas produce competidores llamados «sobre todo
      // la tienda del centro», que es peor que no tener el dato.
      const frase = "los de siempre, sobre todo la tienda que abrieron en el centro el año pasado";
      expect(pareceLista(frase)).toBe(false);
      expect(aLista(frase)).toEqual([frase]);
    });

    it("un campo vacío no produce dimensión", async () => {
      const r = await importarClienteAlCerebro(cerebro, fila({ sector: "  " }));
      expect(r.escritas).not.toContain("sector");
      expect(r.vacios).toContain("sector");
      expect(await cerebro.leerDimension(WS_A, CLI_A, "sector")).toBeNull();
    });

    it("el presupuesto NO se convierte a céntimos adivinando", async () => {
      // Un presupuesto mal leído es dinero mal gastado. Se conserva la frase y
      // el importe queda a null, que obliga a preguntarlo antes de gastar.
      await importarClienteAlCerebro(cerebro, fila({ budget: "unos 500 al mes" }));
      const v = await cerebro.leerDimension(WS_A, CLI_A, "presupuestos");
      expect(v?.valor.mensualCents).toBeNull();
      expect(v?.valor.declaradoPorElCliente).toBe("unos 500 al mes");
    });

    it("los objetivos no reciben una métrica inventada", async () => {
      await importarClienteAlCerebro(cerebro, fila({ objectives: "quiero vender más" }));
      const v = await cerebro.leerDimension(WS_A, CLI_A, "objetivos");
      const objetivos = v?.valor.objetivos as Array<Record<string, unknown>>;
      expect(objetivos[0].metrica).toBe("quiero vender más");
      expect(objetivos[0].valorObjetivo).toBeNull();
    });

    it("no se pierde `differentiator` al unirlo con la propuesta de valor", async () => {
      await importarClienteAlCerebro(
        cerebro,
        fila({ value_proposition: "Entregamos en 24h", differentiator: "Somos los únicos con taller propio" }),
      );
      const v = await cerebro.leerDimension(WS_A, CLI_A, "propuesta_de_valor");
      expect(v?.valor.texto).toContain("24h");
      expect(v?.valor.texto).toContain("taller propio");
    });

    it("todo lo importado se marca como dicho por el cliente", async () => {
      await importarClienteAlCerebro(cerebro, fila({}));
      const c = await cerebro.leer(WS_A, CLI_A);
      for (const [id, v] of c.dimensiones) {
        expect(v.procedencia, id).toBe("cliente_intake");
      }
    });

    it("importar dos veces es idempotente en contenido", async () => {
      await importarClienteAlCerebro(cerebro, fila({}));
      const antes = await cerebro.leerDimension(WS_A, CLI_A, "sector");
      await importarClienteAlCerebro(cerebro, fila({}));
      const despues = await cerebro.leerDimension(WS_A, CLI_A, "sector");
      expect(despues?.valor).toEqual(antes?.valor);
      expect(despues?.version).toBe(2);
    });
  });
});

// ── Utilidades ──────────────────────────────────────────────────────────────

function fila(extra: Partial<FilaOsClient>): FilaOsClient {
  return {
    id: CLI_A,
    workspace_id: WS_A,
    business_name: "Clínica Ejemplo",
    sector: "dental",
    country: "España",
    city: "Valencia",
    ideal_customer: "familias del barrio",
    value_proposition: "Sin lista de espera",
    differentiator: null,
    services: "limpieza, ortodoncia, implantes",
    objectives: "más pacientes nuevos",
    brand_tone: "cercano pero profesional",
    visual_style: "limpio",
    brand_colors: "#0063c2, #ffffff",
    logo_url: "https://ejemplo.test/logo.png",
    competition: "Clínica Norte, Dental Centro",
    budget: null,
    language: "es",
    market: "local",
    website_url: "https://ejemplo.test",
    ...extra,
  };
}

function valorDeEjemplo(forma: string): Record<string, unknown> {
  switch (forma) {
    case "texto": return { texto: "valor de prueba" };
    case "lista": return { items: ["a", "b"] };
    case "personas": return { personas: [{ nombre: "X", rol: "compra" }] };
    case "competidores": return { competidores: [{ nombre: "X" }] };
    case "ubicaciones": return { ubicaciones: [{ nombre: "X", ciudad: "V", pais: "ES" }] };
    case "objetivos": return { objetivos: [{ metrica: "leads" }] };
    case "presupuesto": return { moneda: "EUR" };
    case "booleano": return { valor: true };
    default: return { cualquiera: 1 };
  }
}
