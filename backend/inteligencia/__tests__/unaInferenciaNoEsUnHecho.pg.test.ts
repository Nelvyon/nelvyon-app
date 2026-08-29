/**
 * UNA INFERENCIA NO ES UN HECHO, Y DOS AGENTES NO SE HABLAN SIN FIN.
 *
 * Lo que un departamento aprende le sirve a otro: los términos que convierten
 * en Ads dicen qué contenido escribir, las objeciones de ventas dicen qué
 * responder en el copy. Hoy todo eso se pierde donde ocurrió.
 *
 * Pero un canal entre agentes falla de cuatro maneras, y las cuatro producen
 * algo que parece inteligencia y no lo es:
 *
 *   1. Una observación se cita como hecho.
 *   2. El contexto de un cliente aparece en el de otro.
 *   3. Dos agentes se retroalimentan y generan ruido creciente.
 *   4. El mismo hallazgo entra veinte veces y parece veinte pruebas.
 *
 * Cada prueba de aquí abajo mata una.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import pg from "pg";

import {
  ErrorDeInsight,
  InteligenciaEntreDepartamentos,
  PROFUNDIDAD_MAXIMA,
  RUTAS,
  huellaDe,
  rutaPermitida,
} from "../InteligenciaEntreDepartamentos";
import { esDepartamentoConocido } from "../../agentes/departamentos";

const DSN = process.env.NELVYON_COLA_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

const WS = 900101;
const WS_OTRO = 900102;
const CLI = "aaaaaaaa-1e11-4001-8001-000000000001";
const CLI_OTRO = "bbbbbbbb-1e11-4002-8002-000000000002";

let pool: pg.Pool;
let inteligencia: InteligenciaEntreDepartamentos;

function almacen() {
  return {
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      const r = await pool.query(sql, params);
      return r.rows as T[];
    },
  };
}

function publicar(extra: Record<string, unknown> = {}) {
  return inteligencia.publicar({
    workspaceId: WS,
    clientId: CLI,
    origenDep: "paid_media",
    destinoDep: "seo",
    autor: "agente:planificador-de-medios",
    afirmacion: "la búsqueda «dentista urgencias valencia» convierte en Ads y no se trabaja en orgánico",
    evidencia: { conversiones: 14, coste: 210, periodo: "30d" },
    confianza: 0.8,
    procedencia: "medido",
    ...extra,
  } as Parameters<InteligenciaEntreDepartamentos["publicar"]>[0]);
}

conBase("la inteligencia entre departamentos", () => {
  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DSN, max: 8 });
    const { rows } = await pool.query(`SELECT to_regclass('public.os_insights') t`);
    if (!rows[0].t) throw new Error("falta la migración 584 en la base de pruebas");
    inteligencia = new InteligenciaEntreDepartamentos(almacen());
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM os_insights WHERE workspace_id = ANY($1)`, [[WS, WS_OTRO]]);
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query(`DELETE FROM os_insights WHERE workspace_id = ANY($1)`, [[WS, WS_OTRO]]);
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("1 · una inferencia no se convierte en un hecho", () => {
    it("todo insight lleva confianza, procedencia y evidencia", async () => {
      const { id } = await publicar();
      const [i] = await inteligencia.bandeja({
        workspaceId: WS, clientId: CLI, departamento: "seo",
      });
      expect(i.id).toBe(id);
      expect(i.confianza).toBe(0.8);
      expect(i.procedencia).toBe("medido");
      expect(i.evidencia.conversiones).toBe(14);
    });

    it("SIN EVIDENCIA se rechaza", async () => {
      // Un insight sin evidencia es una corazonada con formato de dato.
      await expect(publicar({ evidencia: {} })).rejects.toThrow(ErrorDeInsight);
    });

    it("el destinatario puede exigir confianza mínima", async () => {
      await publicar({ confianza: 0.4, procedencia: "observado" });
      const flojo = await inteligencia.bandeja({
        workspaceId: WS, clientId: CLI, departamento: "seo",
      });
      expect(flojo).toHaveLength(1);

      const exigente = await inteligencia.bandeja({
        workspaceId: WS, clientId: CLI, departamento: "seo", confianzaMinima: 0.7,
      });
      expect(exigente).toHaveLength(0);
    });

    it("la bandeja ordena por confianza: lo más sólido primero", async () => {
      await publicar({ afirmacion: "flojo", confianza: 0.3, procedencia: "observado" });
      await publicar({ afirmacion: "sólido", confianza: 0.95, procedencia: "medido" });
      const b = await inteligencia.bandeja({ workspaceId: WS, clientId: CLI, departamento: "seo" });
      expect(b.map((i) => i.afirmacion)).toEqual(["sólido", "flojo"]);
    });

    it("una confianza de cero o mayor que uno la rechaza la base", async () => {
      await expect(publicar({ confianza: 0 })).rejects.toThrow();
      await expect(publicar({ confianza: 1.5 })).rejects.toThrow();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("2 · no se cruzan inquilinos", () => {
    it("LA GARANTÍA: la bandeja de un workspace no ve los insights de otro", async () => {
      await publicar({ afirmacion: "SECRETO DEL CLIENTE A" });
      const b = await inteligencia.bandeja({
        workspaceId: WS_OTRO, clientId: CLI, departamento: "seo",
      });
      expect(b).toEqual([]);
    });

    it("ni los de otro cliente del mismo workspace", async () => {
      await publicar({ afirmacion: "SOLO DE A" });
      const b = await inteligencia.bandeja({
        workspaceId: WS, clientId: CLI_OTRO, departamento: "seo",
      });
      expect(b).toEqual([]);
    });

    it("no se puede leer sin workspace", async () => {
      await expect(
        inteligencia.bandeja({
          workspaceId: Number.NaN as number, clientId: CLI, departamento: "seo",
        }),
      ).rejects.toThrow(ErrorDeInsight);
    });

    it("consumir un insight de otro workspace no hace nada", async () => {
      const { id } = await publicar();
      const ok = await inteligencia.consumir({
        workspaceId: WS_OTRO, clientId: CLI, insightId: id, consumidoPor: "intruso",
      });
      expect(ok).toBe(false);

      const [sigue] = await inteligencia.bandeja({
        workspaceId: WS, clientId: CLI, departamento: "seo",
      });
      expect(sigue.estado).toBe("nuevo");
    });

    it("derivar de un insight de OTRO workspace se rechaza", async () => {
      // Es la vía por la que el contexto de un cliente podría colarse en el de
      // otro sin que ninguna consulta cruzara inquilinos a la vista.
      const { id } = await publicar();
      await expect(
        inteligencia.publicar({
          workspaceId: WS_OTRO, clientId: CLI_OTRO,
          origenDep: "paid_media", destinoDep: "seo", autor: "a",
          afirmacion: "derivado indebido", evidencia: { x: 1 },
          confianza: 0.5, procedencia: "derivado", derivadoDe: id,
        }),
      ).rejects.toThrow(ErrorDeInsight);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("3 · dos agentes no se hablan sin fin", () => {
    it("un insight sin padre está a profundidad cero", async () => {
      await publicar();
      const [i] = await inteligencia.bandeja({ workspaceId: WS, clientId: CLI, departamento: "seo" });
      expect(i.profundidad).toBe(0);
      expect(i.derivadoDe).toBeNull();
    });

    it("EL CORTE: dos departamentos rebotándose se paran en seco", async () => {
      // Éste es el escenario exacto que la guarda existe para cortar: SEO le
      // manda algo a Paid Media, Paid Media deriva y se lo devuelve a SEO, y
      // así indefinidamente. Cada vuelta parece actividad y no aporta nada.
      //
      // Las dos rutas están declaradas y son legítimas por separado. Lo que no
      // puede es encadenarse sin fin.
      let padre = (await publicar({ afirmacion: "raíz: término que convierte" })).id;
      const rebote: Array<[string, string]> = [
        ["seo", "paid_media"],
        ["paid_media", "seo"],
        ["seo", "paid_media"],
      ];

      for (let n = 0; n < PROFUNDIDAD_MAXIMA; n += 1) {
        const [origen, destino] = rebote[n];
        const r = await inteligencia.publicar({
          workspaceId: WS, clientId: CLI,
          origenDep: origen, destinoDep: destino, autor: `agente:vuelta${n + 1}`,
          afirmacion: `vuelta ${n + 1} del rebote`, evidencia: { de: padre },
          confianza: 0.6, procedencia: "derivado", derivadoDe: padre,
        });
        expect(r.duplicado, `la vuelta ${n + 1} no se creó`).toBe(false);
        padre = r.id;
      }

      // La cuarta vuelta usa una ruta perfectamente válida y aun así se corta.
      await expect(
        inteligencia.publicar({
          workspaceId: WS, clientId: CLI,
          origenDep: "paid_media", destinoDep: "seo", autor: "agente:vuelta4",
          afirmacion: "una vuelta de más", evidencia: { de: padre },
          confianza: 0.6, procedencia: "derivado", derivadoDe: padre,
        }),
      ).rejects.toThrow(/ruido creciente/);
    });

    it("la base también lo impide, no sólo el código", async () => {
      await expect(
        pool.query(
          `INSERT INTO os_insights
             (workspace_id, client_id, origen_dep, destino_dep, autor, afirmacion,
              evidencia, confianza, procedencia, profundidad, huella, vigente_hasta)
           VALUES ($1, $2::uuid, 'seo', 'contenido', 'a', 'x', '{}'::jsonb, 0.5,
                   'derivado', 9, 'h', NOW() + interval '1 day')`,
          [WS, CLI],
        ),
      ).rejects.toThrow();
    });

    it("un insight derivado SIN padre lo rechaza la base", async () => {
      // Con profundidad > 0 y sin padre no se puede auditar hacia atrás.
      await expect(
        pool.query(
          `INSERT INTO os_insights
             (workspace_id, client_id, origen_dep, destino_dep, autor, afirmacion,
              evidencia, confianza, procedencia, profundidad, huella, vigente_hasta)
           VALUES ($1, $2::uuid, 'seo', 'contenido', 'a', 'x', '{"e":1}'::jsonb, 0.5,
                   'derivado', 2, 'h2', NOW() + interval '1 day')`,
          [WS, CLI],
        ),
      ).rejects.toThrow();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("4 · el mismo hallazgo no entra veinte veces", () => {
    it("publicar dos veces lo mismo devuelve el que ya había", async () => {
      const a = await publicar();
      const b = await publicar();
      expect(b.duplicado).toBe(true);
      expect(b.id).toBe(a.id);

      const bandeja = await inteligencia.bandeja({
        workspaceId: WS, clientId: CLI, departamento: "seo",
      });
      expect(bandeja).toHaveLength(1);
    });

    it("la huella ignora espacios y mayúsculas, que no cambian el hallazgo", () => {
      expect(huellaDe("Los usuarios buscan X")).toBe(huellaDe("  los   usuarios BUSCAN x  "));
      expect(huellaDe("Los usuarios buscan X")).not.toBe(huellaDe("Los usuarios buscan Y"));
    });

    it("dos publicaciones SIMULTÁNEAS crean una sola", async () => {
      const [a, b] = await Promise.all([publicar(), publicar()]);
      expect(a.id).toBe(b.id);
      const { rows } = await pool.query(
        `SELECT count(*)::int n FROM os_insights WHERE workspace_id = $1`, [WS],
      );
      expect(rows[0].n).toBe(1);
    });

    it("EL CONTROL: hallazgos distintos SÍ conviven", async () => {
      // Sin esto, un deduplicador que bloqueara todo pasaría lo anterior.
      await publicar({ afirmacion: "uno" });
      await publicar({ afirmacion: "dos" });
      const b = await inteligencia.bandeja({ workspaceId: WS, clientId: CLI, departamento: "seo" });
      expect(b).toHaveLength(2);
    });

    it("tras descartarlo, el mismo hallazgo puede volver a proponerse", async () => {
      // El índice es PARCIAL: prohíbe duplicados vivos, no en toda la historia.
      const { id } = await publicar();
      await inteligencia.descartar({
        workspaceId: WS, clientId: CLI, insightId: id, porQue: "ya lo trabajamos",
      });
      const otra = await publicar();
      expect(otra.duplicado).toBe(false);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("las rutas son una lista cerrada", () => {
    it("una ruta no declarada se rechaza", async () => {
      // Sin ruta, el destinatario no sabe qué está recibiendo y la bandeja se
      // llena de cosas que no sabe usar.
      await expect(
        publicar({ origenDep: "compliance", destinoDep: "creatividad" }),
      ).rejects.toThrow(/no hay ruta declarada/);
    });

    it("un departamento inventado se rechaza", async () => {
      await expect(publicar({ destinoDep: "departamento_fantasma" })).rejects.toThrow(
        ErrorDeInsight,
      );
    });

    it("todas las rutas declaradas apuntan a departamentos que existen", () => {
      for (const [origen, destinos] of Object.entries(RUTAS)) {
        expect(esDepartamentoConocido(origen), origen).toBe(true);
        for (const d of destinos) {
          expect(esDepartamentoConocido(d.a), `${origen} → ${d.a}`).toBe(true);
          // Y cada una dice QUÉ viaja: sin eso el destinatario no puede usarlo.
          expect(d.que.length, `${origen} → ${d.a}`).toBeGreaterThan(20);
        }
      }
    });

    it("las rutas de los ejemplos del encargo existen", () => {
      expect(rutaPermitida("paid_media", "seo")).toBe(true);
      expect(rutaPermitida("seo", "paid_media")).toBe(true);
      expect(rutaPermitida("crm", "estrategia")).toBe(true);
      expect(rutaPermitida("reputacion", "copy")).toBe(true);
      expect(rutaPermitida("cro", "web")).toBe(true);
      expect(rutaPermitida("social", "contenido")).toBe(true);
      expect(rutaPermitida("customer_success", "estrategia")).toBe(true);
      expect(rutaPermitida("analitica", "estrategia")).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("se cierra el círculo", () => {
    it("consumir deja quién y cuándo", async () => {
      const { id } = await publicar();
      expect(
        await inteligencia.consumir({
          workspaceId: WS, clientId: CLI, insightId: id, consumidoPor: "agente:seo-estratega",
        }),
      ).toBe(true);

      const { rows } = await pool.query(
        `SELECT estado, consumido_por, consumido_en FROM os_insights WHERE id = $1`, [id],
      );
      expect(rows[0].estado).toBe("consumido");
      expect(rows[0].consumido_por).toBe("agente:seo-estratega");
      expect(rows[0].consumido_en).not.toBeNull();
    });

    it("la base impide 'consumido' sin decir por quién", async () => {
      const { id } = await publicar();
      await expect(
        pool.query(`UPDATE os_insights SET estado='consumido' WHERE id=$1`, [id]),
      ).rejects.toThrow();
    });

    it("consumir dos veces sólo cuenta una", async () => {
      const { id } = await publicar();
      expect(await inteligencia.consumir({ workspaceId: WS, clientId: CLI, insightId: id, consumidoPor: "a" })).toBe(true);
      expect(await inteligencia.consumir({ workspaceId: WS, clientId: CLI, insightId: id, consumidoPor: "b" })).toBe(false);
    });

    it("un insight caducado desaparece de la bandeja", async () => {
      const { id } = await publicar();
      await pool.query(
        `UPDATE os_insights SET vigente_hasta = NOW() - interval '1 day' WHERE id = $1`, [id],
      );
      expect(await inteligencia.bandeja({ workspaceId: WS, clientId: CLI, departamento: "seo" })).toEqual([]);
      expect(await inteligencia.caducar(WS)).toBe(1);
    });

    it("la utilidad dice si esto sirve de algo", async () => {
      // Un flujo con muchos insights y cero consumidos no es inteligencia
      // compartida: es un vertedero.
      const a = await publicar({ afirmacion: "uno" });
      await publicar({ afirmacion: "dos" });
      await inteligencia.consumir({ workspaceId: WS, clientId: CLI, insightId: a.id, consumidoPor: "x" });

      const u = await inteligencia.utilidad(WS);
      const ruta = u.find((r) => r.ruta === "paid_media → seo")!;
      expect(ruta.publicados).toBe(2);
      expect(ruta.consumidos).toBe(1);
    });

    it("descartar exige un motivo, que es información sobre quien lo emitió", async () => {
      const { id } = await publicar();
      await inteligencia.descartar({
        workspaceId: WS, clientId: CLI, insightId: id, porQue: "ya trabajábamos esa búsqueda",
      });
      const { rows } = await pool.query(`SELECT resultado FROM os_insights WHERE id=$1`, [id]);
      expect(rows[0].resultado).toContain("ya trabajábamos");
    });
  });
});
