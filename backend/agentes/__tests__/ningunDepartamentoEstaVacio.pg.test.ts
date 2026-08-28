/**
 * NINGÚN DEPARTAMENTO ESTÁ VACÍO, Y NINGÚN AGENTE ES UN PROMPT CON NOMBRE.
 *
 * NELVYON llegó a tener 23 especialistas «diseñados» que nadie había
 * instanciado, y 1.994 ficheros de agente que no leen el contexto del cliente:
 * reciben un `brief` armado a mano en la ruta. Un organigrama así se lee bien y
 * no hace nada.
 *
 * Estas pruebas impiden las dos formas de volver a eso:
 *
 *   - Declarar un departamento sin agentes que lo habiten.
 *   - Declarar un agente sin lo que hace falta para saber si su salida vale,
 *     hasta dónde puede llegar solo, y qué necesita saber antes de empezar.
 *
 * Y la tercera, que es la que de verdad importa: un contrato que se escribe y
 * no cambia nada. Por eso `prepararEjecucion` se prueba contra PostgreSQL real
 * con el cerebro vacío y con el cerebro lleno — si el agente arranca igual en
 * los dos casos, el contrato es decorativo.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import pg from "pg";

import { CerebroDeNegocioService } from "../../cerebro/CerebroDeNegocioService";
import { dimension, esDimensionConocida } from "../../cerebro/dimensiones";
import {
  DEPARTAMENTOS,
  ciclosDeDependencia,
  departamentosOperativos,
  departamentosPlaneados,
  dependenciasRotas,
} from "../departamentos";
import { CATALOGO } from "../catalogo";
import {
  ErrorDeContrato,
  agentesDe,
  agentesRegistrados,
  limpiarRegistroParaPruebas,
  prepararEjecucion,
  puedeHacer,
  registrarAgente,
  validarContrato,
  type ContratoDeAgente,
} from "../contratoDeAgente";
import { NIVELES, ordenDe, puedeActuar, sueloDe, aNivelDeRiesgoMcp } from "../autonomia";

const DSN = process.env.NELVYON_COLA_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

const WS = 950001;
const CLI = "aaaaaaaa-a9e0-4001-8001-000000000001";

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

// ── El organigrama, que no necesita base de datos ───────────────────────────

describe("el organigrama se sostiene", () => {
  beforeEach(() => {
    limpiarRegistroParaPruebas();
    for (const c of CATALOGO) registrarAgente(c);
  });

  afterEach(limpiarRegistroParaPruebas);

  it("LA REGLA: ningún departamento operativo está vacío", () => {
    // Un departamento declarado sin agentes es un organigrama de presentación.
    const vacios = departamentosOperativos()
      .filter((d) => agentesDe(d.id).length === 0)
      .map((d) => d.id);
    expect(
      vacios,
      "estos departamentos dicen ser operativos y no tienen un solo agente",
    ).toEqual([]);
  });

  it("los planeados dicen POR QUÉ todavía no", () => {
    // «Planeado» sin motivo es humo con otro nombre.
    for (const d of departamentosPlaneados()) {
      expect(d.motivoSiPlaneado?.trim().length ?? 0, d.id).toBeGreaterThan(30);
      expect(agentesDe(d.id), `${d.id} dice estar planeado pero tiene agentes`).toEqual([]);
    }
  });

  it("todo agente pertenece a un departamento que existe", () => {
    for (const a of agentesRegistrados()) {
      expect(DEPARTAMENTOS.map((d) => d.id), a.id).toContain(a.departamento);
    }
  });

  it("ninguna dependencia apunta a la nada", () => {
    expect(dependenciasRotas()).toEqual([]);
  });

  it("no hay ciclos de dependencia", () => {
    // Dos departamentos que dependen el uno del otro no arrancan nunca: cada
    // uno espera al otro.
    expect(ciclosDeDependencia()).toEqual([]);
  });

  it("cada departamento dice qué decide Y qué no decide", () => {
    // Sin la segunda mitad, dos departamentos se pelean por lo mismo y el
    // trabajo se hace dos veces o ninguna.
    for (const d of DEPARTAMENTOS) {
      expect(d.responsabilidad.trim().length, d.id).toBeGreaterThan(25);
      expect(d.noDecide.trim().length, d.id).toBeGreaterThan(10);
      expect(d.kpis.length, `${d.id} sin KPIs: no se puede saber si va bien`).toBeGreaterThan(0);
    }
  });
});

// ── Los contratos ───────────────────────────────────────────────────────────

describe("un agente no es un prompt con nombre", () => {
  beforeEach(() => {
    limpiarRegistroParaPruebas();
    for (const c of CATALOGO) registrarAgente(c);
  });

  afterEach(limpiarRegistroParaPruebas);

  it("todos los del catálogo declaran contrato completo", () => {
    for (const a of CATALOGO) {
      expect(() => validarContrato(a), a.id).not.toThrow();
      expect(a.rubrica.length, `${a.id} sin rúbrica`).toBeGreaterThan(0);
      expect(a.kpis.length, `${a.id} sin KPIs`).toBeGreaterThan(0);
      expect(a.nuncaHace.length, `${a.id} sin prohibiciones`).toBeGreaterThan(0);
      expect(a.escalaSi.length, `${a.id} nunca escala a una persona`).toBeGreaterThan(0);
    }
  });

  it("todo lo que un agente necesita saber es una dimensión real del cerebro", () => {
    // Un agente que declara necesitar «contexto_general» no puede leerlo de
    // ningún sitio, y acaba recibiendo un brief armado a mano otra vez.
    for (const a of CATALOGO) {
      for (const n of a.necesita) {
        expect(esDimensionConocida(n.dimension), `${a.id} → ${n.dimension}`).toBe(true);
      }
    }
  });

  it("un contrato con departamento inventado se rechaza al registrarlo", () => {
    expect(() =>
      registrarAgente({ ...CATALOGO[0], id: "x", departamento: "departamento_fantasma" }),
    ).toThrow(ErrorDeContrato);
  });

  it("un contrato sin rúbrica se rechaza", () => {
    expect(() => registrarAgente({ ...CATALOGO[0], id: "y", rubrica: [] })).toThrow(
      /rúbrica/,
    );
  });

  it("un contrato que necesita una dimensión inventada se rechaza", () => {
    expect(() =>
      registrarAgente({
        ...CATALOGO[0],
        id: "z",
        necesita: [{ dimension: "lo_que_sea", imprescindible: true }],
      }),
    ).toThrow(ErrorDeContrato);
  });

  it("los imprescindibles son POCOS por agente", () => {
    // Si todo es imprescindible, ningún agente llega a arrancar nunca y el
    // producto no entrega nada — que es una forma de fallar tan mala como
    // entregar cualquier cosa.
    for (const a of CATALOGO) {
      const n = a.necesita.filter((x) => x.imprescindible).length;
      expect(n, `${a.id} exige ${n} dimensiones para arrancar`).toBeLessThanOrEqual(5);
    }
  });
});

// ── Autonomía ───────────────────────────────────────────────────────────────

describe("la autonomía se decide por lo que cuesta deshacerlo", () => {
  it("gastar dinero exige al menos ejecución acotada", () => {
    expect(sueloDe(["gasta_dinero"])).toBe("L4_EJECUTAR_ACOTADO");
  });

  it("publicar en nombre del cliente exige a una persona", () => {
    // No hay tope que acote lo que ya vio alguien.
    expect(sueloDe(["publica_en_nombre_del_cliente"])).toBe("L5_APROBACION_HUMANA");
    expect(sueloDe(["contacta_personas"])).toBe("L5_APROBACION_HUMANA");
    expect(sueloDe(["es_irreversible"])).toBe("L5_APROBACION_HUMANA");
  });

  it("varias consecuencias toman el suelo más alto", () => {
    expect(sueloDe(["toca_datos_personales", "publica_en_nombre_del_cliente"])).toBe(
      "L5_APROBACION_HUMANA",
    );
  });

  it("un agente NO puede hacer algo por encima de su nivel", () => {
    const borrador = CATALOGO.find((a) => a.autonomia === "L2_BORRADOR")!;
    const v = puedeHacer(borrador, ["gasta_dinero"]);
    expect(v.permitido).toBe(false);
    expect(v.motivo).toContain("L4_EJECUTAR_ACOTADO");
  });

  it("EL CONTROL: sí puede hacer algo dentro de su nivel", () => {
    const borrador = CATALOGO.find((a) => a.autonomia === "L2_BORRADOR")!;
    expect(puedeHacer(borrador, []).permitido).toBe(true);
  });

  it("tener nivel L5 NO es lo mismo que no necesitar aprobación", () => {
    // Confundir las dos preguntas es cómo un agente con permiso acaba actuando
    // sin que nadie lo haya aprobado.
    const social = CATALOGO.find((a) => a.id === "social-media")!;
    const v = puedeHacer(social, ["publica_en_nombre_del_cliente"]);
    expect(v.permitido).toBe(true);
    expect(v.exigeAprobacion).toBe(true);
  });

  it("un contrato que declara menos nivel del que sus consecuencias exigen se rechaza", () => {
    // Se comprueba el CÓDIGO y no el texto: una aserción sobre el mensaje se
    // rompe al reescribirlo y deja de proteger lo que decía proteger.
    let capturado: unknown = null;
    try {
      registrarAgente({
        ...CATALOGO[0],
        id: "temerario",
        consecuencias: ["gasta_dinero"],
        autonomia: "L1_RECOMENDAR",
      });
    } catch (e) {
      capturado = e;
    }
    expect(capturado).toBeInstanceOf(ErrorDeContrato);
    expect((capturado as ErrorDeContrato).codigo).toBe("AUTONOMIA_INSUFICIENTE");
  });

  it("los niveles están ordenados y se traducen al vocabulario que ya existe", () => {
    for (let i = 1; i < NIVELES.length; i += 1) {
      expect(ordenDe(NIVELES[i])).toBeGreaterThan(ordenDe(NIVELES[i - 1]));
    }
    expect(aNivelDeRiesgoMcp("L0_OBSERVAR")).toBe("low");
    expect(aNivelDeRiesgoMcp("L5_APROBACION_HUMANA")).toBe("high");
  });

  it("todo agente que gasta dinero tiene el nivel adecuado", () => {
    for (const a of CATALOGO) {
      if (a.consecuencias.includes("gasta_dinero")) {
        expect(puedeActuar(a.autonomia, ["gasta_dinero"]).permitido, a.id).toBe(true);
      }
    }
  });
});

// ── Y la parte que hace que el contrato no sea decorativo ───────────────────

conBase("el contrato manda de verdad: sin contexto, el agente no arranca", () => {
  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DSN, max: 6 });
    const { rows } = await pool.query(`SELECT to_regclass('public.os_client_brain') t`);
    if (!rows[0].t) throw new Error("falta la migración 581 en la base de pruebas");
    cerebro = new CerebroDeNegocioService(almacen());
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM os_client_brain WHERE workspace_id = $1`, [WS]);
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query(`DELETE FROM os_client_brain_history WHERE workspace_id = $1`, [WS]);
    await pool.query(`DELETE FROM os_client_brain WHERE workspace_id = $1`, [WS]);
  });

  const copywriter = (): ContratoDeAgente => CATALOGO.find((a) => a.id === "copywriter")!;

  it("con el cerebro vacío NO arranca, y dice qué le falta", async () => {
    const p = await prepararEjecucion(copywriter(), cerebro, WS, CLI);
    expect(p.listo).toBe(false);
    if (!p.listo) {
      expect(p.faltaImprescindible).toContain("brand_voice");
      expect(p.faltaImprescindible).toContain("icp");
      // Y explica por qué no arranca, no sólo que no arranca.
      expect(p.motivo).toContain("plausible y equivocado");
    }
  });

  it("con el contexto puesto SÍ arranca, y lo recibe estructurado", async () => {
    for (const d of ["brand_voice", "propuesta_de_valor", "icp"]) {
      await cerebro.escribir({
        workspaceId: WS, clientId: CLI, dimension: d,
        valor: { texto: `valor de ${d}` }, procedencia: "cliente_intake", origen: "prueba",
      });
    }
    const p = await prepararEjecucion(copywriter(), cerebro, WS, CLI);
    expect(p.listo).toBe(true);
    if (p.listo) {
      expect(p.contexto.brand_voice).toEqual({ texto: "valor de brand_voice" });
      // Y con la procedencia, para que el agente sepa de quién se fía.
      expect(p.procedencias.icp.procedencia).toBe("cliente_intake");
    }
  });

  it("lo opcional que falta NO impide arrancar, pero se registra", async () => {
    for (const d of ["brand_voice", "propuesta_de_valor", "icp"]) {
      await cerebro.escribir({
        workspaceId: WS, clientId: CLI, dimension: d,
        valor: { texto: "x" }, procedencia: "cliente_intake", origen: "p",
      });
    }
    const p = await prepararEjecucion(copywriter(), cerebro, WS, CLI);
    expect(p.listo).toBe(true);
    if (p.listo) {
      expect(p.faltaOpcional).toContain("restricciones");
      expect(p.faltaOpcional).toContain("ofertas");
    }
  });

  it("LA CONFIANZA MÍNIMA MUERDE: un dato deducido no basta donde se exige certeza", async () => {
    // `copywriter` exige `brand_voice` con confianza ≥ 0,9. Un agente que
    // dedujo el tono no puede decidir cómo suena la marca de nadie.
    await cerebro.escribir({
      workspaceId: WS, clientId: CLI, dimension: "brand_voice",
      valor: { texto: "deducido" }, procedencia: "agente_deducido", origen: "otro-agente",
    });
    for (const d of ["propuesta_de_valor", "icp"]) {
      await cerebro.escribir({
        workspaceId: WS, clientId: CLI, dimension: d,
        valor: { texto: "x" }, procedencia: "cliente_intake", origen: "p",
      });
    }
    const p = await prepararEjecucion(copywriter(), cerebro, WS, CLI);
    expect(p.listo).toBe(false);
    if (!p.listo) expect(p.faltaImprescindible).toEqual(["brand_voice"]);
  });

  it("no lee el contexto de otro cliente", async () => {
    await cerebro.escribir({
      workspaceId: WS, clientId: CLI, dimension: "brand_voice",
      valor: { texto: "SECRETO" }, procedencia: "cliente_intake", origen: "p",
    });
    const otro = await prepararEjecucion(
      copywriter(), cerebro, WS, "bbbbbbbb-a9e0-4002-8002-000000000002",
    );
    expect(otro.listo).toBe(false);
    expect(JSON.stringify(otro)).not.toContain("SECRETO");
  });

  it("cada dimensión que el catálogo pide tiene su pregunta al cliente", async () => {
    // Si un agente necesita algo que nadie le pregunta nunca al cliente, ese
    // agente no arrancará jamás en producción.
    for (const a of CATALOGO) {
      for (const n of a.necesita.filter((x) => x.imprescindible)) {
        const d = dimension(n.dimension)!;
        expect(d.pregunta.trim().length, `${a.id} → ${n.dimension}`).toBeGreaterThan(5);
      }
    }
  });
});
