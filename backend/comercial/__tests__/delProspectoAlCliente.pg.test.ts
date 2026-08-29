/**
 * DEL PROSPECTO AL CLIENTE, DE PUNTA A PUNTA.
 *
 * La máquina comercial preparaba el contacto y ahí se acababa: si alguien
 * contestaba, la respuesta se quedaba en el correo de una persona. Estas
 * pruebas recorren la segunda mitad de la cadena:
 *
 *   respuesta → oportunidad → cierre → cliente dado de alta con sus servicios
 *
 * Y comprueban sobre todo lo que la cadena DEBE IMPEDIR, que es más importante
 * que lo que permite: que un «no» se trate como un «todavía no», que el embudo
 * se llene de oportunidades que nadie confirmó, y que aparezca un cliente sin
 * que nadie haya cerrado nada.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import { CicloComercial, type AltaDeCliente } from "../CicloComercial";
import { ProspeccionResponsable } from "../ProspeccionResponsable";

const DSN = process.env.NELVYON_COLA_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

const WS = 998001;
const USUARIO = "aaaaaaaa-9f1d-4001-8001-00000000001a";

let pool: pg.Pool;
let ciclo: CicloComercial;
let prospeccion: ProspeccionResponsable;

/** Registra lo que se le pide, para poder afirmar que el alta se DELEGA. */
const pedidos: Array<{ clientId: string; serviceId: string }> = [];
const altaDeCliente: AltaDeCliente = {
  async pedirServicio({ clientId, serviceId }) {
    pedidos.push({ clientId, serviceId });
    return { id: `req-${serviceId}`, yaExistia: false };
  },
};

const almacen = () => ({
  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const r = await pool.query(sql, params);
    return r.rows as T[];
  },
});

const OBSERVACION = {
  hecho: "su ficha de Google no tiene horario de agosto y aparecen cerrados",
  fuente: "Google Maps, 2026-08-20",
  vistoEn: "2026-08-20",
};
const MOTIVO =
  "Su ficha de Google no tiene horario de agosto y aparecen como cerrados justo " +
  "cuando su calle está llena de turistas.";

async function unaPreparacion(dominio: string): Promise<string> {
  const p = await prospeccion.preparar({
    workspaceId: WS,
    baseLegal: "interes_legitimo",
    baseLegalDesde: "2026-08-01",
    porQueEstaEmpresa: MOTIVO,
    prospecto: { empresa: "Ejemplo SL", dominio, observaciones: [OBSERVACION] },
  });
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO comercial_preparaciones
       (workspace_id, empresa, dominio, base_legal, base_legal_desde,
        por_que_esta_empresa, se_apoya_en, creada_por)
     VALUES ($1, $2, $3, 'interes_legitimo', NOW(), $4, $5::jsonb, 'prueba')
     RETURNING id`,
    [WS, p.prospecto.empresa, dominio, MOTIVO, JSON.stringify([OBSERVACION])],
  );
  return rows[0].id;
}

conBase("del prospecto al cliente", () => {
  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DSN, max: 6 });
    const { rows } = await pool.query(`SELECT to_regclass('public.comercial_oportunidades') t`);
    if (!rows[0].t) throw new Error("falta la migración 589 en la base de pruebas");
    ciclo = new CicloComercial(almacen(), altaDeCliente);
    prospeccion = new ProspeccionResponsable(almacen());
  });

  afterAll(async () => {
    await limpiar();
    await pool.end();
  });

  async function limpiar(): Promise<void> {
    await pool.query(`DELETE FROM comercial_oportunidades WHERE workspace_id = $1`, [WS]);
    await pool.query(`DELETE FROM comercial_respuestas WHERE workspace_id = $1`, [WS]);
    await pool.query(`DELETE FROM comercial_preparaciones WHERE workspace_id = $1`, [WS]);
    await pool.query(`DELETE FROM os_clients WHERE workspace_id = $1`, [WS]);
    await pool.query(`DELETE FROM comercial_bajas WHERE dominio LIKE '%.cadena'`);
    pedidos.length = 0;
  }

  afterEach(limpiar);

  // ═══════════════════════════════════════════════════════════════════════
  describe("EL RECORRIDO COMPLETO", () => {
    it("de un contacto preparado a un cliente con sus servicios pedidos", async () => {
      const prep = await unaPreparacion("interesado.cadena");

      const respuesta = await ciclo.registrarRespuesta({
        workspaceId: WS,
        preparacionId: prep,
        sentido: "interesado",
        canal: "email",
        literal: "Nos interesa, ¿podemos hablar el martes?",
        registradaPor: "daniel",
      });
      expect(respuesta.sentido).toBe("interesado");

      const oportunidad = await ciclo.abrirOportunidad({
        workspaceId: WS,
        respuestaId: respuesta.id,
        serviciosDeInteres: ["seo_premium"],
      });
      expect(oportunidad.estado).toBe("conversando");

      const ganada = await ciclo.ganar({
        workspaceId: WS,
        oportunidadId: oportunidad.id,
        servicios: ["seo_premium", "social_media_premium"],
        cerradaPor: "daniel",
        creadaPorUsuario: USUARIO,
        sector: "restauración",
      });

      // El cliente existe de verdad.
      const { rows } = await pool.query<{ business_name: string }>(
        `SELECT business_name FROM os_clients WHERE id = $1::uuid`,
        [ganada.clientId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].business_name).toBe("Ejemplo SL");

      // Y EL ALTA SE DELEGÓ, no se reimplementó. Es lo que impide que exista un
      // segundo camino de alta que un día deje de declarar accesos.
      expect(pedidos.map((p) => p.serviceId)).toEqual(["seo_premium", "social_media_premium"]);
      expect(pedidos.every((p) => p.clientId === ganada.clientId)).toBe(true);
    });

    it("y el embudo lo refleja", async () => {
      const prep = await unaPreparacion("embudo.cadena");
      const r = await ciclo.registrarRespuesta({
        workspaceId: WS, preparacionId: prep, sentido: "interesado",
        canal: "email", registradaPor: "daniel",
      });
      await ciclo.abrirOportunidad({ workspaceId: WS, respuestaId: r.id });

      const embudo = await ciclo.embudo(WS);
      expect(embudo).toContainEqual({ estado: "conversando", cuantas: 1 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("un NO es un NO", () => {
    it("de un «no me interesa» NO sale una oportunidad", async () => {
      const prep = await unaPreparacion("nointeresa.cadena");
      const r = await ciclo.registrarRespuesta({
        workspaceId: WS, preparacionId: prep, sentido: "no_interesado",
        canal: "email", registradaPor: "daniel",
      });

      await expect(
        ciclo.abrirOportunidad({ workspaceId: WS, respuestaId: r.id }),
        "se ha abierto una oportunidad de alguien que dijo que no",
      ).rejects.toMatchObject({ codigo: "SIN_RESPUESTA" });
    });

    it("pedir la baja la registra AL MOMENTO, no en un proceso posterior", async () => {
      // Una baja que depende de que alguien se acuerde de apuntarla es una baja
      // que un día no se apunta.
      const prep = await unaPreparacion("baja.cadena");
      await ciclo.registrarRespuesta({
        workspaceId: WS, preparacionId: prep, sentido: "pide_baja",
        canal: "email", literal: "no me escribáis más", registradaPor: "daniel",
      });

      const { rows } = await pool.query(
        `SELECT dominio FROM comercial_bajas WHERE dominio = 'baja.cadena'`,
      );
      expect(rows, "la baja no se registró").toHaveLength(1);
    });

    it("y esa baja impide preparar otro contacto, desde CUALQUIER inquilino", async () => {
      const prep = await unaPreparacion("bajaglobal.cadena");
      await ciclo.registrarRespuesta({
        workspaceId: WS, preparacionId: prep, sentido: "pide_baja",
        canal: "email", registradaPor: "daniel",
      });

      await expect(
        prospeccion.preparar({
          workspaceId: 123456, // otro inquilino cualquiera
          baseLegal: "interes_legitimo",
          baseLegalDesde: "2026-08-01",
          porQueEstaEmpresa: MOTIVO,
          prospecto: {
            empresa: "Ejemplo SL",
            dominio: "bajaglobal.cadena",
            observaciones: [OBSERVACION],
          },
        }),
      ).rejects.toMatchObject({ codigo: "DADO_DE_BAJA" });
    });

    it("«más adelante» SÍ da oportunidad: no es un no", async () => {
      // El control positivo. Un módulo que rechazara todo cumpliría las pruebas
      // de arriba y no serviría para vender nada.
      const prep = await unaPreparacion("masadelante.cadena");
      const r = await ciclo.registrarRespuesta({
        workspaceId: WS, preparacionId: prep, sentido: "mas_adelante",
        canal: "email", registradaPor: "daniel",
      });
      const o = await ciclo.abrirOportunidad({ workspaceId: WS, respuestaId: r.id });
      expect(o.estado).toBe("conversando");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("el embudo no se llena de humo", () => {
    it("no hay oportunidad sin respuesta: lo impide el esquema", async () => {
      await expect(
        pool.query(
          `INSERT INTO comercial_oportunidades (workspace_id, respuesta_id, empresa, dominio)
           VALUES ($1, gen_random_uuid(), 'Inventada SL', 'inventada.cadena')`,
          [WS],
        ),
      ).rejects.toThrow();
    });

    it("no se puede dar por ganada sin persona ni cliente", async () => {
      const prep = await unaPreparacion("sincierre.cadena");
      const r = await ciclo.registrarRespuesta({
        workspaceId: WS, preparacionId: prep, sentido: "interesado",
        canal: "email", registradaPor: "daniel",
      });
      const o = await ciclo.abrirOportunidad({ workspaceId: WS, respuestaId: r.id });

      await expect(
        pool.query(
          `UPDATE comercial_oportunidades SET estado='ganada' WHERE id=$1::uuid`,
          [o.id],
        ),
      ).rejects.toThrow();
    });

    it("no se puede perder sin decir por qué", async () => {
      // Un embudo sin motivos de pérdida no enseña nada: al mes siguiente se
      // repiten los mismos errores porque nadie apuntó cuáles fueron.
      const prep = await unaPreparacion("sinmotivo.cadena");
      const r = await ciclo.registrarRespuesta({
        workspaceId: WS, preparacionId: prep, sentido: "interesado",
        canal: "email", registradaPor: "daniel",
      });
      const o = await ciclo.abrirOportunidad({ workspaceId: WS, respuestaId: r.id });

      await expect(
        pool.query(
          `UPDATE comercial_oportunidades SET estado='perdida', motivo_de_perdida='no' WHERE id=$1::uuid`,
          [o.id],
        ),
      ).rejects.toThrow();
    });

    it("EL CONTROL: con motivo suficiente sí se puede perder", async () => {
      const prep = await unaPreparacion("conmotivo.cadena");
      const r = await ciclo.registrarRespuesta({
        workspaceId: WS, preparacionId: prep, sentido: "interesado",
        canal: "email", registradaPor: "daniel",
      });
      const o = await ciclo.abrirOportunidad({ workspaceId: WS, respuestaId: r.id });

      await expect(
        ciclo.perder({
          workspaceId: WS,
          oportunidadId: o.id,
          motivo: "eligieron a una agencia local por cercanía",
          cerradaPor: "daniel",
        }),
      ).resolves.toBeUndefined();
    });

    it("una oportunidad cerrada no se vuelve a cerrar", async () => {
      const prep = await unaPreparacion("doblecierre.cadena");
      const r = await ciclo.registrarRespuesta({
        workspaceId: WS, preparacionId: prep, sentido: "interesado",
        canal: "email", registradaPor: "daniel",
      });
      const o = await ciclo.abrirOportunidad({ workspaceId: WS, respuestaId: r.id });
      await ciclo.perder({
        workspaceId: WS, oportunidadId: o.id,
        motivo: "eligieron a otra agencia por precio", cerradaPor: "daniel",
      });

      await expect(
        ciclo.ganar({
          workspaceId: WS, oportunidadId: o.id, servicios: ["seo_premium"],
          cerradaPor: "daniel", creadaPorUsuario: USUARIO,
        }),
      ).rejects.toMatchObject({ codigo: "YA_CERRADA" });
    });

    it("ganar sin servicios es un cliente que no ha contratado nada", async () => {
      const prep = await unaPreparacion("sinservicios.cadena");
      const r = await ciclo.registrarRespuesta({
        workspaceId: WS, preparacionId: prep, sentido: "interesado",
        canal: "email", registradaPor: "daniel",
      });
      const o = await ciclo.abrirOportunidad({ workspaceId: WS, respuestaId: r.id });

      await expect(
        ciclo.ganar({
          workspaceId: WS, oportunidadId: o.id, servicios: [],
          cerradaPor: "daniel", creadaPorUsuario: USUARIO,
        }),
      ).rejects.toMatchObject({ codigo: "SIN_SERVICIOS" });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("no se contesta dos veces al mismo contacto", () => {
    it("una preparación, una respuesta", async () => {
      const prep = await unaPreparacion("dosveces.cadena");
      await ciclo.registrarRespuesta({
        workspaceId: WS, preparacionId: prep, sentido: "interesado",
        canal: "email", registradaPor: "daniel",
      });
      await expect(
        ciclo.registrarRespuesta({
          workspaceId: WS, preparacionId: prep, sentido: "no_interesado",
          canal: "email", registradaPor: "daniel",
        }),
      ).rejects.toMatchObject({ codigo: "YA_CONTESTO" });
    });

    it("una respuesta a una preparación que no existe se rechaza", async () => {
      await expect(
        ciclo.registrarRespuesta({
          workspaceId: WS,
          preparacionId: "00000000-0000-4000-8000-000000000000",
          sentido: "interesado", canal: "email", registradaPor: "daniel",
        }),
      ).rejects.toMatchObject({ codigo: "SIN_PREPARACION" });
    });
  });
});
