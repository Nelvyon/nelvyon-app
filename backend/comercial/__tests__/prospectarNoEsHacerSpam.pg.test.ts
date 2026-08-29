/**
 * PROSPECTAR NO ES HACER SPAM.
 *
 * La diferencia no es el volumen: es si cada mensaje tiene una razón propia que
 * se pueda enseñar. Estas pruebas comprueban las dos direcciones, porque un
 * módulo que rechaza TODO cumpliría igual de bien una suite que sólo mire los
 * rechazos — y no serviría para nada, que es la otra forma de fracasar.
 *
 * Y una comprobación que no es de cumplimiento sino de decencia: que una baja
 * valga para todos los canales y para todos los espacios de trabajo. Aislarla
 * por inquilino convertiría cada workspace nuevo en una segunda oportunidad
 * para molestar a quien ya dijo que no.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import {
  DIAS_ENTRE_INTENTOS,
  ErrorDeProspeccion,
  INTENTOS_MAXIMOS,
  ProspeccionResponsable,
  esGenerico,
  type Observacion,
} from "../ProspeccionResponsable";

const DSN = process.env.NELVYON_COLA_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

const WS = 960001;
let pool: pg.Pool;
let prospeccion: ProspeccionResponsable;

const almacen = () => ({
  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const r = await pool.query(sql, params);
    return r.rows as T[];
  },
});

const OBSERVACION: Observacion = {
  hecho: "su tienda tarda 6,2 s en cargar en móvil y no tiene ficha de Google actualizada",
  fuente: "PageSpeed Insights, 2026-08-20",
  vistoEn: "2026-08-20",
};

const MOTIVO =
  "Su tienda tarda 6,2 s en móvil y la ficha de Google lleva año y medio sin tocarse: " +
  "las dos cosas les están costando reservas hoy.";

const prospecto = (dominio: string, obs: Observacion[] = [OBSERVACION]) => ({
  empresa: "Ejemplo SL",
  dominio,
  sector: "hostelería",
  observaciones: obs,
});

async function insertarPreparacion(dominio: string, hace: string): Promise<void> {
  await pool.query(
    `INSERT INTO comercial_preparaciones
       (workspace_id, empresa, dominio, base_legal, base_legal_desde,
        por_que_esta_empresa, se_apoya_en, estado, creada_en, creada_por)
     VALUES ($1, 'Ejemplo SL', $2, 'interes_legitimo', NOW(),
             $3, $4::jsonb, 'lista_para_revision', NOW() - $5::interval, 'prueba')`,
    [WS, dominio, MOTIVO, JSON.stringify([OBSERVACION]), hace],
  );
}

conBase("prospectar no es hacer spam", () => {
  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DSN, max: 6 });
    const { rows } = await pool.query(`SELECT to_regclass('public.comercial_bajas') t`);
    if (!rows[0].t) throw new Error("falta la migración 586 en la base de pruebas");
    prospeccion = new ProspeccionResponsable(almacen());
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM comercial_preparaciones WHERE workspace_id = $1`, [WS]);
    await pool.query(`DELETE FROM comercial_bajas WHERE dominio LIKE '%.prueba'`);
    await pool.end();
  });

  afterEach(async () => {
    await pool.query(`DELETE FROM comercial_preparaciones WHERE workspace_id = $1`, [WS]);
    await pool.query(`DELETE FROM comercial_bajas WHERE dominio LIKE '%.prueba'`);
  });

  const base = { baseLegal: "interes_legitimo" as const, baseLegalDesde: "2026-08-01", workspaceId: WS };

  // ═══════════════════════════════════════════════════════════════════════
  describe("EL CONTROL POSITIVO: un contacto con motivo propio SÍ se prepara", () => {
    it("se prepara, y guarda en qué se apoya", async () => {
      const p = await prospeccion.preparar({
        ...base,
        prospecto: prospecto("uno.prueba"),
        porQueEstaEmpresa: MOTIVO,
      });
      expect(p.estado).toBe("investigando");
      expect(p.seApoyaEn).toHaveLength(1);
      expect(p.seApoyaEn[0].fuente).toContain("PageSpeed");
    });

    it("y se le puede poner borrador si lleva la baja dentro", async () => {
      const p = await prospeccion.preparar({
        ...base, prospecto: prospecto("dos.prueba"), porQueEstaEmpresa: MOTIVO,
      });
      const conBorrador = prospeccion.redactar(p, {
        asunto: "6,2 s de carga os están costando reservas",
        cuerpo: "Hola: hemos visto esto. Si no queréis saber más, responde y te damos de baja.",
      });
      expect(conBorrador.estado).toBe("lista_para_revision");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("puerta 1 · base legal", () => {
    it("sin base legal declarada no se prepara nada", async () => {
      await expect(
        prospeccion.preparar({
          ...base,
          baseLegalDesde: "",
          prospecto: prospecto("tres.prueba"),
          porQueEstaEmpresa: MOTIVO,
        }),
      ).rejects.toMatchObject({ codigo: "SIN_BASE_LEGAL" });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("puerta 2 · la baja", () => {
    it("quien pidió la baja no vuelve a recibir nada", async () => {
      await pool.query(
        `INSERT INTO comercial_bajas (dominio, pedida_por, literal)
         VALUES ('baja.prueba', 'email', 'no me escribáis más')`,
      );
      await expect(
        prospeccion.preparar({
          ...base, prospecto: prospecto("baja.prueba"), porQueEstaEmpresa: MOTIVO,
        }),
      ).rejects.toMatchObject({ codigo: "DADO_DE_BAJA" });
    });

    it("LA BAJA VALE PARA TODOS LOS CANALES, no sólo el que la pidió", async () => {
      // Quien pide no recibir correos no está pidiendo que le llamemos. Tratar
      // cada canal por separado es el truco con el que una baja se convierte en
      // un permiso parcial.
      await pool.query(
        `INSERT INTO comercial_bajas (dominio, pedida_por) VALUES ('canal.prueba', 'email')`,
      );
      await expect(
        prospeccion.preparar({
          ...base, prospecto: prospecto("canal.prueba"), porQueEstaEmpresa: MOTIVO,
        }),
      ).rejects.toMatchObject({ codigo: "DADO_DE_BAJA" });
    });

    it("Y VALE PARA TODOS LOS ESPACIOS DE TRABAJO", async () => {
      // La tabla de bajas no tiene inquilino a propósito. Si lo tuviera, cada
      // workspace nuevo sería una segunda oportunidad para molestar.
      await pool.query(
        `INSERT INTO comercial_bajas (dominio, pedida_por) VALUES ('global.prueba', 'email')`,
      );
      await expect(
        prospeccion.preparar({
          ...base,
          workspaceId: 999999, // otro inquilino distinto por completo
          prospecto: prospecto("global.prueba"),
          porQueEstaEmpresa: MOTIVO,
        }),
      ).rejects.toMatchObject({ codigo: "DADO_DE_BAJA" });
    });

    it("la tabla de bajas NO tiene RLS, y eso es a propósito", async () => {
      const { rows } = await pool.query<{ rls: boolean }>(
        `SELECT c.relrowsecurity AS rls
           FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname='public' AND c.relname='comercial_bajas'`,
      );
      expect(
        rows[0]?.rls,
        "si alguien le pone RLS 'por coherencia', cada workspace deja de ver las bajas de los demás",
      ).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("puerta 3 · no se insiste", () => {
    it("no se vuelve a escribir antes de tiempo", async () => {
      await insertarPreparacion("pronto.prueba", "10 days");
      await expect(
        prospeccion.preparar({
          ...base, prospecto: prospecto("pronto.prueba"), porQueEstaEmpresa: MOTIVO,
        }),
      ).rejects.toMatchObject({ codigo: "YA_CONTACTADO" });
    });

    it("EL CONTROL: pasado el plazo, sí se puede", async () => {
      await insertarPreparacion("tarde.prueba", `${DIAS_ENTRE_INTENTOS + 5} days`);
      const p = await prospeccion.preparar({
        ...base, prospecto: prospecto("tarde.prueba"), porQueEstaEmpresa: MOTIVO,
      });
      expect(p.estado).toBe("investigando");
    });

    it("después del máximo de intentos, silencio para siempre", async () => {
      for (let i = 0; i < INTENTOS_MAXIMOS; i += 1) {
        await insertarPreparacion("basta.prueba", `${DIAS_ENTRE_INTENTOS * (i + 2)} days`);
      }
      await expect(
        prospeccion.preparar({
          ...base, prospecto: prospecto("basta.prueba"), porQueEstaEmpresa: MOTIVO,
        }),
      ).rejects.toMatchObject({ codigo: "YA_CONTACTADO" });
    });

    it("una preparación descartada NO cuenta como intento", async () => {
      // Descartar es decidir no escribir. Contarlo como contacto castigaría al
      // que se lo piensa dos veces.
      await pool.query(
        `INSERT INTO comercial_preparaciones
           (workspace_id, empresa, dominio, base_legal, base_legal_desde,
            por_que_esta_empresa, se_apoya_en, estado, creada_por)
         VALUES ($1,'Ejemplo SL','descartada.prueba','interes_legitimo',NOW(),
                 $2,$3::jsonb,'descartada','prueba')`,
        [WS, MOTIVO, JSON.stringify([OBSERVACION])],
      );
      const p = await prospeccion.preparar({
        ...base, prospecto: prospecto("descartada.prueba"), porQueEstaEmpresa: MOTIVO,
      });
      expect(p.estado).toBe("investigando");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("puerta 4 · un motivo que sea de ESTA empresa", () => {
    it("sin ninguna observación no hay motivo que sostener", async () => {
      await expect(
        prospeccion.preparar({
          ...base, prospecto: prospecto("vacio.prueba", []), porQueEstaEmpresa: MOTIVO,
        }),
      ).rejects.toMatchObject({ codigo: "SIN_MOTIVO_PROPIO" });
    });

    it("una observación sin fuente no vale: hay que poder enseñarla", async () => {
      await expect(
        prospeccion.preparar({
          ...base,
          prospecto: prospecto("sinfuente.prueba", [{ ...OBSERVACION, fuente: "" }]),
          porQueEstaEmpresa: MOTIVO,
        }),
      ).rejects.toMatchObject({ codigo: "SIN_MOTIVO_PROPIO" });
    });

    it("un motivo que valdría para cualquiera es un envío masivo con otro nombre", async () => {
      await expect(
        prospeccion.preparar({
          ...base,
          prospecto: prospecto("generico.prueba"),
          porQueEstaEmpresa: "He visto vuestra web y creo que podríamos ayudaros",
        }),
      ).rejects.toMatchObject({ codigo: "SIN_MOTIVO_PROPIO" });
    });

    it("las fórmulas genéricas se reconocen; un motivo concreto no", () => {
      expect(esGenerico("He visto tu web")).toBe(true);
      expect(esGenerico("Somos una agencia de marketing digital")).toBe(true);
      expect(esGenerico("Trabajamos con empresas como la vuestra")).toBe(true);
      // EL CONTROL: algo concreto NO se marca.
      expect(esGenerico(MOTIVO)).toBe(false);
      expect(
        esGenerico("Vuestra ficha de Google no tiene horario de agosto y estáis abiertos"),
      ).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("el borrador y el envío", () => {
    it("un borrador sin forma de darse de baja no se acepta", async () => {
      const p = await prospeccion.preparar({
        ...base, prospecto: prospecto("nobaja.prueba"), porQueEstaEmpresa: MOTIVO,
      });
      expect(() =>
        prospeccion.redactar(p, { asunto: "Hola", cuerpo: "Un mensaje sin salida." }),
      ).toThrow(ErrorDeProspeccion);
    });

    it("ENVIAR NO SE PUEDE, y no es un hueco pendiente", async () => {
      const p = await prospeccion.preparar({
        ...base, prospecto: prospecto("envio.prueba"), porQueEstaEmpresa: MOTIVO,
      });
      await expect(prospeccion.enviar(p)).rejects.toMatchObject({
        codigo: "ENVIO_NO_AUTORIZADO",
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("lo que el esquema impide por sí solo", () => {
    it("no se puede guardar una preparación sin motivo propio", async () => {
      await expect(
        pool.query(
          `INSERT INTO comercial_preparaciones
             (workspace_id, empresa, dominio, base_legal, base_legal_desde,
              por_que_esta_empresa, se_apoya_en, creada_por)
           VALUES ($1,'X','x.prueba','interes_legitimo',NOW(),'corto',$2::jsonb,'prueba')`,
          [WS, JSON.stringify([OBSERVACION])],
        ),
      ).rejects.toThrow();
    });

    it("no se puede guardar una preparación que no se apoye en nada", async () => {
      await expect(
        pool.query(
          `INSERT INTO comercial_preparaciones
             (workspace_id, empresa, dominio, base_legal, base_legal_desde,
              por_que_esta_empresa, se_apoya_en, creada_por)
           VALUES ($1,'X','y.prueba','interes_legitimo',NOW(),$2,'[]'::jsonb,'prueba')`,
          [WS, MOTIVO],
        ),
      ).rejects.toThrow();
    });

    it("no se puede aprobar sin decir quién ni cuándo", async () => {
      await expect(
        pool.query(
          `INSERT INTO comercial_preparaciones
             (workspace_id, empresa, dominio, base_legal, base_legal_desde,
              por_que_esta_empresa, se_apoya_en, estado, borrador_asunto,
              borrador_cuerpo, creada_por)
           VALUES ($1,'X','z.prueba','interes_legitimo',NOW(),$2,$3::jsonb,
                   'aprobada_para_enviar','a','b','prueba')`,
          [WS, MOTIVO, JSON.stringify([OBSERVACION])],
        ),
      ).rejects.toThrow();
    });

    it("EL CONTROL: una preparación bien formada SÍ se guarda", async () => {
      await expect(
        pool.query(
          `INSERT INTO comercial_preparaciones
             (workspace_id, empresa, dominio, base_legal, base_legal_desde,
              por_que_esta_empresa, se_apoya_en, creada_por)
           VALUES ($1,'X','ok.prueba','interes_legitimo',NOW(),$2,$3::jsonb,'prueba')`,
          [WS, MOTIVO, JSON.stringify([OBSERVACION])],
        ),
      ).resolves.toBeDefined();
    });
  });
});
