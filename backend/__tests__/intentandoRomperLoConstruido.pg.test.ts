/**
 * INTENTANDO ROMPER LO CONSTRUIDO.
 *
 * QUÉ ES ESTO Y EN QUÉ SE DIFERENCIA DE LAS DEMÁS PRUEBAS. Las otras comprueban
 * que cada pieza hace lo que dice. Ésta hace lo contrario: da por sentado que
 * las defensas se pueden esquivar, y busca el camino.
 *
 * No repite ningún caso feliz. Cada bloque de abajo es un intento concreto de
 * saltarse una garantía, escrito desde la posición de quien quiere que pase —
 * porque una defensa sólo se conoce cuando alguien ha intentado rodearla, y las
 * pruebas normales siempre la atacan de frente.
 *
 * LO QUE SE INTENTA:
 *
 *   1. Aprobar contenido malo cambiando quién dice ser el autor.
 *   2. Colar una campaña sin revisión llamándola de otra manera.
 *   3. Sacar el contexto de un cliente pasando por el de otro que se llama igual.
 *   4. Escribir a quien se dio de baja entrando por otro inquilino.
 *   5. Fabricar un insight que parezca un hecho.
 *   6. Hacer que la sala de máquinas diga «todo bien» sin haber mirado.
 *   7. Que una evaluación de reglas se presente como de modelo.
 *
 * Si alguno de estos siete llegara a funcionar, la garantía correspondiente no
 * existe: existiría la apariencia de la garantía.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import pg from "pg";

import { MotorDeCalidad, modoDisponible } from "../calidad/MotorDeCalidad";
import { contextoCanonico, resolverCliente } from "../cerebro/fuenteCanonica";
import { CerebroDeNegocioService } from "../cerebro/CerebroDeNegocioService";
import { InteligenciaEntreDepartamentos } from "../inteligencia/InteligenciaEntreDepartamentos";
import { ProspeccionResponsable } from "../comercial/ProspeccionResponsable";
import { SalaDeMaquinas } from "../operacion/SalaDeMaquinas";
import { GuardaDeGasto } from "../gasto/guardaDeGasto";
import {
  EjecutorSimulado,
  PuenteDeEjecucion,
  type RegistroDeAprobaciones,
} from "../ejecucion/PuenteDeEjecucion";
import { CATALOGO } from "../agentes/catalogo";

const DSN = process.env.NELVYON_COLA_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

const TENANT = "dddddddd-000b-400b-800b-00000000000b";
// Inquilino propio: 990001 lo usaba ya `elClientePuedeEmpezarSolo`, y dos ficheros que se
// borran los datos entre si producen una prueba que falla a veces.
const WS = 994001;
const OTRO_WS = 994002;
const CLI = "aaaaaaaa-e51d-4001-8001-00000000000b";
const SERVICIO = "adversario";

let pool: pg.Pool;

const almacen = () => ({
  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const r = await pool.query(sql, params);
    return r.rows as T[];
  },
});

conBase("intentando romper lo construido", () => {
  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DSN, max: 8 });
  });

  afterAll(async () => {
    await limpiar();
    await pool.end();
  });

  async function limpiar(): Promise<void> {
    for (const ws of [WS, OTRO_WS]) {
      await pool.query(`DELETE FROM gastos_ejecutados WHERE workspace_id = $1`, [ws]);
      await pool.query(`DELETE FROM autorizaciones_de_gasto WHERE workspace_id = $1`, [ws]);
      await pool.query(`DELETE FROM os_insights WHERE workspace_id = $1`, [ws]).catch(() => undefined);
      await pool.query(`DELETE FROM comercial_preparaciones WHERE workspace_id = $1`, [ws]).catch(() => undefined);
      await pool.query(`DELETE FROM os_clients WHERE workspace_id = $1`, [ws]).catch(() => undefined);
    }
    await pool.query(`DELETE FROM comercial_bajas WHERE dominio LIKE '%.adversario'`).catch(() => undefined);
  }

  beforeEach(() => {
    // EL MODO DE COSTE CERO SE APAGA EN TODO ESTE FICHERO, y es a proposito.
    //
    // Aqui se intenta ROMPER las puertas: colar contenido malo, esquivar la
    // revision, sacar datos de otro inquilino. Para poder comprobar que cada
    // puerta aguanta, la accion tiene que llegar hasta ella.
    //
    // Con el modo encendido, una campana se deniega en la puerta de coste
    // —correcto en produccion— y todas las de detras quedarian sin probar. Un
    // ataque que rebota en la primera valla no demuestra que la segunda exista.
    // La puerta de coste tiene su propio fichero.
    vi.stubEnv("NELVYON_MODO_COSTE_CERO", "0");
  });

  afterEach(async () => {
    await limpiar();
    vi.unstubAllEnvs();
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("1 · aprobar contenido malo cambiando quién dice ser el autor", () => {
    it("cambiar el autor NO cambia el veredicto", async () => {
      // La idea del atacante: si el motor se niega cuando el evaluador es el
      // autor, quizá diciendo que lo escribió otro se relaje con el contenido.
      const motor = new MotorDeCalidad();
      const contenido = { cuerpo: "Te garantizamos el primer puesto en Google." };

      const comoUno = motor.evaluar({ dominio: "copy", autor: "a", contenido }, "qa");
      const comoOtro = motor.evaluar({ dominio: "copy", autor: "b", contenido }, "qa");

      expect(comoUno.veredicto).toBe("FAIL");
      expect(
        comoOtro.veredicto,
        "el veredicto depende de QUIÉN firma la pieza en vez de QUÉ dice",
      ).toBe("FAIL");
    });

    it("un autor vacío tampoco abre la puerta", async () => {
      const motor = new MotorDeCalidad();
      const r = motor.evaluar(
        { dominio: "copy", autor: "", contenido: { cuerpo: "Resultados inmediatos garantizados." } },
        "qa",
      );
      expect(r.veredicto).toBe("FAIL");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("2 · colar una campaña sin revisión llamándola de otra manera", () => {
    async function puente(): Promise<{ p: PuenteDeEjecucion; meta: EjecutorSimulado }> {
      const guarda = new GuardaDeGasto(almacen());
      const aprobaciones: RegistroDeAprobaciones = {
        async estaAprobada() {
          return true;
        },
        async solicitar() {},
      };
      const meta = new EjecutorSimulado("meta_ads");
      const p = new PuenteDeEjecucion(guarda, aprobaciones, () => {}, new MotorDeCalidad());
      p.registrarEjecutor(meta);
      return { p, meta };
    }

    const accionBase = () => ({
      ejecutor: "meta_ads",
      operacion: "crear_campana",
      argumentos: {},
      tenantId: TENANT,
      workspaceId: WS,
      serviceId: SERVICIO,
      clientId: CLI,
      importeCents: 5_000,
      idempotencyKey: `adv-${Math.random().toString(36).slice(2)}`,
    });

    it("EL HALLAZGO: declarar CERO consecuencias con un importe se DENIEGA", async () => {
      // El atajo, y funcionaba. Las consecuencias las declara quien llama, así
      // que quien llama puede mentir: con `consecuencias: []` se esquivaban a la
      // vez la puerta de calidad —que mira las consecuencias— y la de gasto
      // —que mira `gasta_dinero`—. Dos puertas con un array vacío.
      //
      // La primera versión de esta prueba aceptaba «ejecutado o denegado», que
      // es una tautología: pasaba con el agujero abierto. Ahora exige la
      // denegación, y por eso el agujero está cerrado.
      vi.stubEnv("NELVYON_GASTO_EXTERNO_HABILITADO", "1");
      const { p, meta } = await puente();
      const agente = CATALOGO.find((a) => a.id === "planificador-de-medios")!;

      const r = await p.cruzar(agente, { ...accionBase(), consecuencias: [] });

      expect(r.estado).toBe("denegado");
      if (r.estado === "denegado") expect(r.puerta).toBe("declaracion_incoherente");
      expect(meta.llamadas, "se ejecutó una acción que se contradice a sí misma").toHaveLength(0);
    });

    it("EL CONTROL: una acción que declara importe CERO y nada más sí puede pasar", async () => {
      // La coherencia se comprueba en un solo sentido: declarar dinero y negar
      // que se gasta. Una acción que de verdad no gasta nada no tiene por qué
      // declarar `gasta_dinero`, y exigírselo convertiría la regla en un
      // estorbo que alguien acabaría quitando.
      const { p } = await puente();
      const agente = CATALOGO.find((a) => a.id === "planificador-de-medios")!;

      const r = await p.cruzar(agente, {
        ...accionBase(),
        consecuencias: ["toca_datos_personales"],
        importeCents: 0,
      });
      expect(r.estado).toBe("ejecutado");
    });

    it("declarar que se publica pero adjuntar una pieza vacía NO pasa", async () => {
      const { p, meta } = await puente();
      const agente = CATALOGO.find((a) => a.id === "social-media")!;

      const r = await p.cruzar(agente, {
        ...accionBase(),
        operacion: "publicar_post",
        consecuencias: ["publica_en_nombre_del_cliente"],
        importeCents: 0,
        pieza: { dominio: "social", autor: "social-media", contenido: {} },
      });

      expect(r.estado).toBe("denegado");
      if (r.estado === "denegado") expect(r.puerta).toBe("calidad");
      expect(meta.llamadas).toHaveLength(0);
    });

    it("una pieza de un dominio inventado NO se salta las comprobaciones comunes", async () => {
      // Otra idea: si las comprobaciones se eligen por dominio, un dominio que
      // no existe podría no tener ninguna.
      const { p, meta } = await puente();
      const agente = CATALOGO.find((a) => a.id === "social-media")!;

      const r = await p.cruzar(agente, {
        ...accionBase(),
        operacion: "publicar_post",
        consecuencias: ["publica_en_nombre_del_cliente"],
        importeCents: 0,
        pieza: {
          dominio: "dominio_que_no_existe",
          autor: "social-media",
          contenido: { texto: "Te garantizamos ventas." },
        },
      });

      expect(
        r.estado,
        "un dominio inventado se ha saltado las comprobaciones comunes",
      ).toBe("denegado");
      expect(meta.llamadas).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("3 · sacar el contexto de un cliente por el de otro que se llama igual", () => {
    it("dos clientes del mismo usuario con el mismo nombre NO devuelven ninguno", async () => {
      // Es el caso que la fuente canónica se niega a resolver. Si devolviera el
      // primero, un agente escribiría sobre el negocio equivocado — y sin dar
      // ningún error, con un texto perfectamente plausible.
      await pool.query(
        `INSERT INTO os_clients (id, workspace_id, created_by_user_id, business_name, sector, status)
         VALUES (gen_random_uuid(), $1, 'adv', 'Clinica Duplicada', 'salud', 'active'),
                (gen_random_uuid(), $2, 'adv', 'Clinica Duplicada', 'salud', 'active')`,
        [WS, OTRO_WS],
      );

      const r = await resolverCliente(almacen(), "adv", "Clinica Duplicada");
      expect(r.encontrado).toBe(false);
      if (!r.encontrado) expect(r.motivo).toBe("ambiguo");
    });

    it("y el contexto que sale es NINGUNO, no el del primero", async () => {
      await pool.query(
        `INSERT INTO os_clients (id, workspace_id, created_by_user_id, business_name, sector, status)
         VALUES (gen_random_uuid(), $1, 'adv', 'Clinica Duplicada', 'salud', 'active'),
                (gen_random_uuid(), $2, 'adv', 'Clinica Duplicada', 'salud', 'active')`,
        [WS, OTRO_WS],
      );
      const ctx = await contextoCanonico(
        almacen(),
        new CerebroDeNegocioService(almacen()),
        "adv",
        "Clinica Duplicada",
      );
      expect(ctx.origen, "se ha mezclado o elegido el contexto de uno de los dos").toBe("ninguno");
    });

    it("un nombre con espacios o mayúsculas distintas NO evita la detección", async () => {
      await pool.query(
        `INSERT INTO os_clients (id, workspace_id, created_by_user_id, business_name, sector, status)
         VALUES (gen_random_uuid(), $1, 'adv', 'Clinica Duplicada', 'salud', 'active'),
                (gen_random_uuid(), $2, 'adv', 'CLINICA DUPLICADA', 'salud', 'active')`,
        [WS, OTRO_WS],
      );
      const r = await resolverCliente(almacen(), "adv", "  clinica duplicada  ");
      expect(r.encontrado, "cambiar mayúsculas o poner espacios esquiva la detección").toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("4 · escribir a quien se dio de baja entrando por otro inquilino", () => {
    it("la baja aguanta desde cualquier espacio de trabajo", async () => {
      await pool.query(
        `INSERT INTO comercial_bajas (dominio, pedida_por) VALUES ('nomas.adversario', 'email')`,
      );
      const prospeccion = new ProspeccionResponsable(almacen());

      for (const ws of [WS, OTRO_WS, 12345, 999999]) {
        await expect(
          prospeccion.preparar({
            workspaceId: ws,
            baseLegal: "interes_legitimo",
            baseLegalDesde: "2026-01-01",
            porQueEstaEmpresa:
              "Su ficha de Google no tiene horario de agosto y aparecen como cerrados.",
            prospecto: {
              empresa: "X",
              dominio: "nomas.adversario",
              observaciones: [{ hecho: "ficha sin horario", fuente: "Google Maps", vistoEn: "2026-08-20" }],
            },
          }),
          `desde el workspace ${ws} se ha podido preparar contacto con quien pidió la baja`,
        ).rejects.toMatchObject({ codigo: "DADO_DE_BAJA" });
      }
    });

    it("cambiar mayúsculas en el dominio tampoco esquiva la baja", async () => {
      await pool.query(
        `INSERT INTO comercial_bajas (dominio, pedida_por) VALUES ('mayus.adversario', 'email')`,
      );
      const prospeccion = new ProspeccionResponsable(almacen());
      await expect(
        prospeccion.preparar({
          workspaceId: WS,
          baseLegal: "interes_legitimo",
          baseLegalDesde: "2026-01-01",
          porQueEstaEmpresa: "Su ficha de Google no tiene horario y aparecen como cerrados hoy.",
          prospecto: {
            empresa: "X",
            dominio: "MAYUS.Adversario",
            observaciones: [{ hecho: "ficha sin horario", fuente: "Google Maps", vistoEn: "2026-08-20" }],
          },
        }),
      ).rejects.toMatchObject({ codigo: "DADO_DE_BAJA" });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("5 · fabricar un insight que parezca un hecho", () => {
    it("no se puede publicar algo medido sin nada que lo mida", async () => {
      const inteligencia = new InteligenciaEntreDepartamentos(almacen());
      await expect(
        inteligencia.publicar({
          workspaceId: WS,
          clientId: CLI,
          origenDep: "paid_media",
          destinoDep: "seo",
          autor: "adversario",
          afirmacion: "los usuarios buscan sobre todo por precio",
          evidencia: {},
          confianza: 1,
          procedencia: "medido",
        }),
      ).rejects.toThrow();
    });

    it("una confianza mayor que la máxima no se acepta", async () => {
      const inteligencia = new InteligenciaEntreDepartamentos(almacen());
      await expect(
        inteligencia.publicar({
          workspaceId: WS,
          clientId: CLI,
          origenDep: "paid_media",
          destinoDep: "seo",
          autor: "adversario",
          afirmacion: "certeza absoluta",
          evidencia: { termino: "x", conversiones: 10 },
          confianza: 99,
          procedencia: "medido",
        }),
      ).rejects.toThrow();
    });

    it("la bandeja de un inquilino no devuelve insights de otro", async () => {
      // La comprobación que impide que lo aprendido del negocio de un cliente
      // acabe orientando el trabajo de otro.
      const inteligencia = new InteligenciaEntreDepartamentos(almacen());
      await inteligencia.publicar({
        workspaceId: WS,
        clientId: CLI,
        origenDep: "paid_media",
        destinoDep: "seo",
        autor: "adversario",
        afirmacion: "el término «urgente» convierte al triple",
        evidencia: { termino: "urgente", conversiones: 31 },
        confianza: 0.8,
        procedencia: "medido",
      });

      const ajena = await inteligencia.bandeja({
        workspaceId: OTRO_WS,
        clientId: CLI,
        departamento: "seo",
      });
      expect(ajena, "un inquilino ve los insights de otro").toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("6 · hacer que la sala de máquinas diga «todo bien» sin mirar", () => {
    it("una base que devuelve vacío a todo NO produce un panel tranquilizador", async () => {
      // Una base que contesta `[]` a cualquier cosa: ni falla ni tiene datos.
      // El panel podría decir «nada parado» y sonar perfecto.
      const muda = new SalaDeMaquinas({
        async query<T>(): Promise<T[]> {
          return [] as T[];
        },
      });
      const p = await muda.pulso();

      // Aquí sí es legítimo decir cero: se miró y no había nada.
      expect(p.atascos).toHaveLength(0);
      expect(p.noMedido).toHaveLength(0);
      // Pero la hora tiene que estar, para que se vea si el panel está congelado.
      expect(p.medidoEn).toBeTruthy();
    });

    it("una base que FALLA a todo produce un panel que dice que no sabe", async () => {
      const rota = new SalaDeMaquinas({
        async query<T>(): Promise<T[]> {
          throw new Error("la base no responde");
        },
      });
      const p = await rota.pulso();

      expect(p.noMedido.length, "un fallo total ha pasado sin dejar rastro").toBeGreaterThan(3);
      expect(p.enMovimiento.trabajosCompletadosUltimas24h).toBeNull();
      expect(p.enMovimiento.entregablesPublicadosUltimas24h).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("7 · que una evaluación de reglas se presente como de modelo", () => {
    it("poner la variable de entorno NO convierte reglas en modelo", () => {
      vi.stubEnv("AUTONOMOUS_LLM_MODE", "real");
      expect(
        modoDisponible(),
        "una variable de entorno ha bastado para sellar una revisión que nadie hizo",
      ).toBe("UNAVAILABLE");
    });

    it("y un veredicto en modo simulado nunca aprueba", () => {
      vi.stubEnv("NELVYON_QA_MODO", "mock");
      const r = new MotorDeCalidad().evaluar(
        { dominio: "copy", autor: "a", contenido: { titular: "Impecable" } },
        "qa",
      );
      expect(r.modo).toBe("MOCK");
      expect(r.veredicto).not.toBe("PASS");
      expect(r.veredicto).not.toBe("PASS_WITH_WARNINGS");
    });

    it("lo que exige modelo y no lo tiene queda como NO COMPROBADO, no como aprobado", () => {
      const r = new MotorDeCalidad().evaluar(
        { dominio: "copy", autor: "a", contenido: { titular: "Un titular correcto" } },
        "qa",
      );
      expect(r.modo).toBe("UNAVAILABLE");
      expect(r.noComprobado.length).toBeGreaterThan(0);
      // Y la puntuación no premia lo que no se pudo mirar.
      expect(r.puntuacion === null || r.puntuacion <= 100).toBe(true);
    });
  });
});
