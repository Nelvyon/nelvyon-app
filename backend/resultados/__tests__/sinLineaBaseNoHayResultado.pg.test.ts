/**
 * SIN LÍNEA BASE NO HAY RESULTADO.
 *
 * NELVYON ha entregado 5.050 entregables y no sabe de ninguno si sirvió de
 * algo. Optimizar «cantidad de entregables» es fácil y no es el negocio.
 *
 * Un motor de resultados falla de tres maneras, y las tres producen informes
 * que se leen bien y no significan nada:
 *
 *   1. Dar un veredicto cuando no hay datos. «0 %» no es lo mismo que «no se
 *      sabe», y presentarlos igual convierte la ignorancia en un dato.
 *   2. Leer la dirección al revés. Bajar el coste por lead es un éxito; bajar
 *      los leads es un desastre. El mismo −20 % significa lo contrario.
 *   3. Llamar causa a una coincidencia. Es lo que hace la mayoría de los
 *      informes de agencia.
 *
 * Cada prueba de aquí abajo mata una de esas tres.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import pg from "pg";

import {
  ErrorDeResultados,
  MotorDeResultados,
  atribucionMaxima,
  mejoraPorcentual,
} from "../MotorDeResultados";

const DSN = process.env.NELVYON_COLA_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

const WS = 920001;
const WS_OTRO = 920002;
const CLI = "aaaaaaaa-4e50-4001-8001-000000000001";

let pool: pg.Pool;
let motor: MotorDeResultados;

function almacen() {
  return {
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      const r = await pool.query(sql, params);
      return r.rows as T[];
    },
  };
}

const ayer = (dias: number): Date => new Date(Date.now() - dias * 86_400_000);

conBase("el motor de resultados", () => {
  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DSN, max: 6 });
    const { rows } = await pool.query(`SELECT to_regclass('public.os_objetivos') t`);
    if (!rows[0].t) throw new Error("falta la migración 583 en la base de pruebas");
    motor = new MotorDeResultados(almacen());
  });

  afterAll(async () => {
    for (const t of ["os_aprendizajes", "os_acciones", "os_mediciones", "os_objetivos"]) {
      await pool.query(`DELETE FROM ${t} WHERE workspace_id = ANY($1)`, [[WS, WS_OTRO]]);
    }
    await pool.end();
  });

  beforeEach(async () => {
    for (const t of ["os_aprendizajes", "os_acciones", "os_mediciones", "os_objetivos"]) {
      await pool.query(`DELETE FROM ${t} WHERE workspace_id = ANY($1)`, [[WS, WS_OTRO]]);
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("1 · sin datos se dice que no se sabe", () => {
    it("un objetivo recién declarado NO tiene veredicto", async () => {
      const { id } = await motor.declararObjetivo({
        workspaceId: WS, clientId: CLI, metrica: "leads", direccion: "subir",
      });
      const v = await motor.veredicto(WS, CLI, id);
      expect(v.estado).toBe("desconocido");
      if (v.estado === "desconocido") {
        expect(v.motivo).toBe("sin_linea_base");
        // Y explica por qué, no sólo que no.
        expect(v.explicacion).toContain("cifra suelta");
      }
    });

    it("con línea base pero sin nada después, tampoco", async () => {
      const { id } = await motor.declararObjetivo({
        workspaceId: WS, clientId: CLI, metrica: "leads", direccion: "subir",
      });
      await motor.medir({
        workspaceId: WS, clientId: CLI, objetivoId: id, metrica: "leads",
        valor: 10, desde: ayer(60), hasta: ayer(30),
        fuente: "google_analytics", esLineaBase: true,
      });
      const v = await motor.veredicto(WS, CLI, id);
      expect(v.estado).toBe("desconocido");
      if (v.estado === "desconocido") expect(v.motivo).toBe("sin_medicion_posterior");
    });

    it("un objetivo que no existe no produce un veredicto inventado", async () => {
      const v = await motor.veredicto(WS, CLI, "11111111-1111-4111-8111-111111111111");
      expect(v.estado).toBe("desconocido");
      if (v.estado === "desconocido") expect(v.motivo).toBe("sin_objetivo");
    });

    it("EL CONTROL: con las dos cosas, SÍ hay veredicto", async () => {
      // Sin este caso, un motor que siempre dijera "desconocido" pasaría todo
      // lo anterior y no serviría para nada.
      const { id } = await motor.declararObjetivo({
        workspaceId: WS, clientId: CLI, metrica: "leads", direccion: "subir",
      });
      await motor.medir({
        workspaceId: WS, clientId: CLI, objetivoId: id, metrica: "leads",
        valor: 10, desde: ayer(60), hasta: ayer(30),
        fuente: "google_analytics", esLineaBase: true,
      });
      await motor.medir({
        workspaceId: WS, clientId: CLI, objetivoId: id, metrica: "leads",
        valor: 15, desde: ayer(30), hasta: ayer(0), fuente: "google_analytics",
      });

      const v = await motor.veredicto(WS, CLI, id);
      expect(v.estado).toBe("medido");
      if (v.estado === "medido") {
        expect(v.lineaBase).toBe(10);
        expect(v.actual).toBe(15);
        expect(v.mejoraPorcentual).toBe(50);
      }
    });

    it("dos líneas base son imposibles: lo impide la base", async () => {
      // Con dos puntos de partida, cualquier comparación podría elegir el que
      // más conviniera.
      const { id } = await motor.declararObjetivo({
        workspaceId: WS, clientId: CLI, metrica: "leads", direccion: "subir",
      });
      await motor.medir({
        workspaceId: WS, clientId: CLI, objetivoId: id, metrica: "leads",
        valor: 10, desde: ayer(60), hasta: ayer(30),
        fuente: "google_analytics", esLineaBase: true,
      });
      await expect(
        motor.medir({
          workspaceId: WS, clientId: CLI, objetivoId: id, metrica: "leads",
          valor: 5, desde: ayer(90), hasta: ayer(60),
          fuente: "google_analytics", esLineaBase: true,
        }),
      ).rejects.toThrow();
    });

    it("una medición 'calculada' tiene que decir de qué", async () => {
      // Si no, nadie puede rehacer la cuenta y deja de ser una medición.
      const { id } = await motor.declararObjetivo({
        workspaceId: WS, clientId: CLI, metrica: "cpl", direccion: "bajar",
      });
      await expect(
        motor.medir({
          workspaceId: WS, clientId: CLI, objetivoId: id, metrica: "cpl",
          valor: 12, desde: ayer(30), hasta: ayer(0), fuente: "calculado",
        }),
      ).rejects.toThrow();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("2 · la dirección se lee bien", () => {
    it("bajar el coste por lead es una MEJORA", async () => {
      // El mismo −20 % significa lo contrario según la métrica. Un motor que no
      // lo sepa presentará desastres como logros.
      const { id } = await motor.declararObjetivo({
        workspaceId: WS, clientId: CLI, metrica: "coste_por_lead", direccion: "bajar",
      });
      await motor.medir({
        workspaceId: WS, clientId: CLI, objetivoId: id, metrica: "coste_por_lead",
        valor: 50, desde: ayer(60), hasta: ayer(30),
        fuente: "google_ads", esLineaBase: true,
      });
      await motor.medir({
        workspaceId: WS, clientId: CLI, objetivoId: id, metrica: "coste_por_lead",
        valor: 40, desde: ayer(30), hasta: ayer(0), fuente: "google_ads",
      });

      const v = await motor.veredicto(WS, CLI, id);
      expect(v.estado).toBe("medido");
      if (v.estado === "medido") {
        expect(v.mejoraPorcentual, "bajar el coste se leyó como empeorar").toBe(20);
      }
    });

    it("bajar los leads es un EMPEORAMIENTO", async () => {
      const { id } = await motor.declararObjetivo({
        workspaceId: WS, clientId: CLI, metrica: "leads", direccion: "subir",
      });
      await motor.medir({
        workspaceId: WS, clientId: CLI, objetivoId: id, metrica: "leads",
        valor: 50, desde: ayer(60), hasta: ayer(30),
        fuente: "crm_propio", esLineaBase: true,
      });
      await motor.medir({
        workspaceId: WS, clientId: CLI, objetivoId: id, metrica: "leads",
        valor: 40, desde: ayer(30), hasta: ayer(0), fuente: "crm_propio",
      });

      const v = await motor.veredicto(WS, CLI, id);
      if (v.estado === "medido") expect(v.mejoraPorcentual).toBe(-20);
    });

    it("una línea base de CERO no produce un porcentaje inventado", () => {
      // Presentar «+∞ %» o «+100 %» al pasar de 0 a 5 leads es la clase de
      // cifra que hace que un informe deje de creerse.
      expect(mejoraPorcentual(0, 5, "subir")).toBeNull();
      expect(mejoraPorcentual(0, 0, "bajar")).toBeNull();
    });

    it("el objetivo cumplido se lee según su dirección", async () => {
      const { id } = await motor.declararObjetivo({
        workspaceId: WS, clientId: CLI, metrica: "cpa", direccion: "bajar", valorObjetivo: 30,
      });
      await motor.medir({
        workspaceId: WS, clientId: CLI, objetivoId: id, metrica: "cpa",
        valor: 50, desde: ayer(60), hasta: ayer(30), fuente: "meta_ads", esLineaBase: true,
      });
      await motor.medir({
        workspaceId: WS, clientId: CLI, objetivoId: id, metrica: "cpa",
        valor: 28, desde: ayer(30), hasta: ayer(0), fuente: "meta_ads",
      });
      const v = await motor.veredicto(WS, CLI, id);
      if (v.estado === "medido") expect(v.cumplido).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("3 · coincidir en el tiempo no es causar", () => {
    it("sin acciones, la atribución es desconocida", () => {
      expect(atribucionMaxima({ acciones: 0, huboExperimento: false, periodosMedidos: 5 }))
        .toBe("desconocida");
    });

    it("una acción y UN periodo después es sólo coincidencia temporal", () => {
      // Lo único que se sabe es que pasó después. Llamarlo «correlación» ya es
      // decir más de lo que se sabe.
      expect(atribucionMaxima({ acciones: 1, huboExperimento: false, periodosMedidos: 1 }))
        .toBe("coincidencia_temporal");
    });

    it("hacen falta varios periodos para hablar de correlación", () => {
      expect(atribucionMaxima({ acciones: 2, huboExperimento: false, periodosMedidos: 3 }))
        .toBe("correlacion");
    });

    it("sólo un experimento permite la palabra mayor", () => {
      expect(atribucionMaxima({ acciones: 1, huboExperimento: true, periodosMedidos: 1 }))
        .toBe("experimento");
    });

    it("el veredicto NUNCA devuelve más atribución de la que sostiene", async () => {
      const { id } = await motor.declararObjetivo({
        workspaceId: WS, clientId: CLI, metrica: "trafico", direccion: "subir",
      });
      await motor.medir({
        workspaceId: WS, clientId: CLI, objetivoId: id, metrica: "trafico",
        valor: 100, desde: ayer(60), hasta: ayer(30),
        fuente: "google_analytics", esLineaBase: true,
      });
      await motor.registrarAccion({
        workspaceId: WS, clientId: CLI, objetivoId: id,
        descripcion: "publicadas 4 páginas nuevas", actor: "agente:seo-estratega",
        efectivaDesde: ayer(25),
      });
      await motor.medir({
        workspaceId: WS, clientId: CLI, objetivoId: id, metrica: "trafico",
        valor: 180, desde: ayer(30), hasta: ayer(0), fuente: "google_analytics",
      });

      const v = await motor.veredicto(WS, CLI, id);
      expect(v.estado).toBe("medido");
      if (v.estado === "medido") {
        expect(v.accionesEnMedio).toBe(1);
        // Subió un 80 % después de la acción. Y aun así, lo máximo que se puede
        // afirmar es que pasó después.
        expect(v.mejoraPorcentual).toBe(80);
        expect(v.atribucionMaxima).toBe("coincidencia_temporal");
      }
    });

    it("un aprendizaje sin método declarado se rechaza", async () => {
      // Una conclusión que no se puede revisar es una opinión con formato de
      // dato.
      const { id } = await motor.declararObjetivo({
        workspaceId: WS, clientId: CLI, metrica: "leads", direccion: "subir",
      });
      await expect(
        motor.aprender({
          workspaceId: WS, clientId: CLI, objetivoId: id,
          conclusion: "el SEO funciona", acciones: [], mediciones: [],
          confianza: "correlacion", metodo: "   ",
        }),
      ).rejects.toThrow(ErrorDeResultados);
    });

    it("la base sólo admite los cuatro niveles de atribución", async () => {
      const { id } = await motor.declararObjetivo({
        workspaceId: WS, clientId: CLI, metrica: "leads", direccion: "subir",
      });
      await expect(
        pool.query(
          `INSERT INTO os_aprendizajes
             (workspace_id, client_id, objetivo_id, conclusion, confianza_atribucion, metodo)
           VALUES ($1, $2::uuid, $3::uuid, 'x', 'causalidad_probada', 'me lo parece')`,
          [WS, CLI, id],
        ),
      ).rejects.toThrow();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("no se mezclan clientes", () => {
    it("el panel de un workspace no ve los objetivos de otro", async () => {
      await motor.declararObjetivo({
        workspaceId: WS, clientId: CLI, metrica: "leads_secretos", direccion: "subir",
      });
      const otro = await motor.panel(WS_OTRO, CLI);
      expect(otro).toEqual([]);
    });

    it("no se puede leer sin workspace", async () => {
      await expect(motor.panel(Number.NaN as number, CLI)).rejects.toThrow(ErrorDeResultados);
    });
  });
});
