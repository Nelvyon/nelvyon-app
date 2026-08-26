/**
 * BLOQUE 6 · un agente no puede usar herramientas que no necesita.
 *
 * El motor de politica comprobaba muchas cosas —suplantacion de inquilino,
 * secretos, inyeccion de prompt, SQL destructivo, herramientas prohibidas— y se
 * dejaba la mas basica: **el ambito de las herramientas de solo lectura**.
 *
 * El unico control de ambito estaba dentro de `if (!tool.readOnly)`. O sea que
 * cualquier contexto autenticado podia llamar a `postgres_query`, `memory_read`,
 * `logs_tail` o `filesystem_read` sin declarar nada. Un agente que solo necesita
 * leer documentacion podia leer la base de datos y la memoria del inquilino.
 *
 * Y la causa de fondo no era una condicion mal puesta: era que **el contrato de
 * herramienta no permitia declarar lo que hace falta para usarla**. Sin un sitio
 * donde decirlo, el motor no tenia nada que comprobar.
 *
 * Se cierra por defecto: una herramienta que no declara sus ambitos se deniega.
 * En autorizacion, lo que no esta permitido esta prohibido — al reves, olvidarse
 * de declarar abre la puerta en silencio.
 */
import { describe, expect, it } from "vitest";

import { evaluatePolicy } from "../PolicyEngine";
import { productiveTools } from "../../tools/productiveTools";
import type { McpCallContext, McpRegisteredTool } from "../../types";

function contexto(over: Partial<McpCallContext> = {}): McpCallContext {
  return {
    tenantId: "t1",
    userId: "u1",
    agentId: "a1",
    requestId: "r1",
    traceId: "tr1",
    roles: ["member"],
    scopes: [],
    ...over,
  };
}

function herramienta(name: string): McpRegisteredTool {
  const t = productiveTools.find((x) => x.name === name);
  if (!t) throw new Error(`herramienta desconocida en la prueba: ${name}`);
  return t;
}

describe("BLOQUE 6 · minimo privilegio en herramientas de lectura", () => {
  it("EL CONTROL: con el ambito correcto, se permite", () => {
    // Sin esto, una politica que denegara todo pasaria las pruebas de abajo y
    // dejaria a los agentes sin poder hacer nada.
    const r = evaluatePolicy(
      herramienta("docs_read"),
      { path: "docs/README.md" },
      contexto({ scopes: ["docs:read"] }),
    );
    expect(r.decision, `denegado por ${r.reason}`).toBe("allowed");
  });

  it("sin ambito NO se puede leer la base de datos", () => {
    // `postgres_query` es de solo lectura, y por eso se colaba: el unico
    // control de ambito estaba detras de `if (!tool.readOnly)`.
    const r = evaluatePolicy(
      herramienta("postgres_query"),
      { sql: "SELECT 1" },
      contexto({ scopes: [] }),
    );
    expect(r.decision, "un agente sin ambito consulto la base de datos").toBe("denied");
    expect(r.blockedCategory).toBe("authorization");
  });

  it("sin ambito NO se puede leer la memoria del inquilino", () => {
    const r = evaluatePolicy(herramienta("memory_read"), { key: "x" }, contexto({ scopes: [] }));
    expect(r.decision, "un agente sin ambito leyo la memoria").toBe("denied");
  });

  it("el ambito de una herramienta no sirve para otra", () => {
    /**
     * Lo que separa «tiene algun permiso» de «tiene ESTE permiso». Sin esto,
     * bastaria con darle a un agente el ambito mas inocente para abrirle todas
     * las lecturas.
     */
    const r = evaluatePolicy(
      herramienta("postgres_query"),
      { sql: "SELECT 1" },
      contexto({ scopes: ["docs:read"] }),
    );
    expect(r.decision, "el ambito de documentacion sirvio para la base de datos").toBe("denied");
  });

  it("una herramienta que NO declara sus ambitos se deniega", () => {
    /**
     * Cierre por defecto. Si registrar una herramienta sin declarar ambitos la
     * dejara pasar, el olvido de un desarrollador abriria la puerta sin que
     * nadie se entere — y los olvidos son lo mas frecuente que hay.
     *
     * En autorizacion, lo que no esta permitido esta prohibido.
     */
    const sinDeclarar = {
      ...herramienta("docs_read"),
      requiredScopes: undefined,
    } as unknown as McpRegisteredTool;

    const r = evaluatePolicy(sinDeclarar, { path: "docs/README.md" }, contexto({ scopes: ["docs:read"] }));
    expect(r.decision, "una herramienta sin ambitos declarados se dejo usar").toBe("denied");
    expect(r.reason).toBe("tool_sin_ambitos_declarados");
  });

  it("TODAS las herramientas productivas declaran sus ambitos", () => {
    // El barrido que impide que la siguiente herramienta nazca sin declarar y
    // se quede fuera del control por omision.
    const mudas = productiveTools
      .filter((t) => !Array.isArray((t as { requiredScopes?: string[] }).requiredScopes))
      .map((t) => t.name);
    expect(mudas, `herramientas sin ambitos declarados: ${mudas.join(", ")}`).toEqual([]);
    expect(productiveTools.length, "no hay herramientas que comprobar").toBeGreaterThanOrEqual(8);
  });

  it("`owner` y `admin` siguen pudiendo, pero un `member` a secas no", () => {
    // Los roles de administracion no tienen que enumerar cada ambito; lo que no
    // puede pasar es que un rol cualquiera valga como comodin.
    const comoAdmin = evaluatePolicy(
      herramienta("postgres_query"),
      { sql: "SELECT 1" },
      contexto({ roles: ["admin"], scopes: [] }),
    );
    expect(comoAdmin.decision).toBe("allowed");

    const comoMiembro = evaluatePolicy(
      herramienta("postgres_query"),
      { sql: "SELECT 1" },
      contexto({ roles: ["member"], scopes: [] }),
    );
    expect(comoMiembro.decision).toBe("denied");
  });
});

describe("BLOQUE 6 · los ambitos amplios que ya existian siguen valiendo", () => {
  it("`mcp.write` sigue autorizando una herramienta de escritura", () => {
    /**
     * `mcp.read`, `mcp.write` y `workflows.execute` son ambitos reales de las
     * claves de API. Sustituirlos por los finos habria denegado en silencio a
     * todo el que ya tuviera una clave emitida: un cambio de contrato de
     * permisos disfrazado de mejora tecnica.
     *
     * Lo que se arregla es lo que faltaba, no lo que ya estaba.
     */
    const r = evaluatePolicy(
      herramienta("memory_write"),
      { key: "k", value: "v" },
      contexto({ scopes: ["mcp.write"] }),
    );
    expect(r.decision, `denegado por ${r.reason}`).not.toBe("denied");
  });

  it("`mcp.read` autoriza una herramienta de lectura", () => {
    const r = evaluatePolicy(
      herramienta("postgres_query"),
      { sql: "SELECT 1" },
      contexto({ scopes: ["mcp.read"] }),
    );
    expect(r.decision, `denegado por ${r.reason}`).toBe("allowed");
  });

  it("pero `mcp.read` NO autoriza a escribir", () => {
    // Un ambito de lectura que sirviera para escribir seria peor que no tener
    // ambitos: daria una sensacion de control que no existe.
    const r = evaluatePolicy(
      herramienta("memory_write"),
      { key: "k", value: "v" },
      contexto({ scopes: ["mcp.read"] }),
    );
    expect(r.decision, "un ambito de solo lectura autorizo una escritura").toBe("denied");
  });
});
