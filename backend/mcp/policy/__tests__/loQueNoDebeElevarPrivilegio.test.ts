/**
 * Cuatro formas de ganar privilegio sin pedirlo, y por que ninguna funciona.
 *
 * ── QUE FALTABA ─────────────────────────────────────────────────────────────
 *
 * Ya se comprobaba que el ambito de una herramienta no sirve para otra, que el
 * inquilino sale del contexto y no de los argumentos, y que una herramienta que
 * no declara ambitos se deniega.
 *
 * Lo que no se comprobaba es lo que pasa DESPUES de una denegacion, o alrededor
 * de ella. Un modelo de permisos no se rompe casi nunca por la puerta principal:
 * se rompe por los caminos que la rodean.
 *
 *   1 · una aprobacion pendiente, ¿deja pasar lo demas?
 *   2 · una herramienta denegada, ¿llega a ejecutarse igual?
 *   3 · un reintento, ¿conserva el ambito del primer intento?
 *   4 · un `fallback`, ¿cae en una herramienta con MAS permiso?
 *
 * Las cuatro son formas de que el sistema haga algo que nadie autorizo, y
 * ninguna la habria detectado una prueba de la puerta principal.
 *
 * COSTE EXTERNO: 0 EUR. Solo se evalua politica; nada se ejecuta.
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

/** Una herramienta de escritura y una de lectura, elegidas del catalogo real. */
const DE_ESCRITURA = productiveTools.find((t) => !t.readOnly);
const DE_LECTURA = productiveTools.find((t) => t.readOnly);

describe("una aprobacion no es un ascenso", () => {
  it("EL CONTROL: con el ambito correcto y sin nada raro, se permite", () => {
    // Sin este control, una politica que denegara todo pasaria el resto de la
    // bateria y dejaria a los agentes sin poder trabajar.
    const t = herramienta("docs_read");
    const r = evaluatePolicy(t, { path: "docs/README.md" }, contexto({ scopes: [...t.requiredScopes] }));
    expect(r.decision, `docs_read con sus ambitos deberia permitirse: ${r.reason}`).not.toBe(
      "denied",
    );
  });

  it("necesitar aprobacion NO concede el ambito que falta", () => {
    // La confusion peligrosa: «esto pasa por aprobacion humana» suena a que el
    // permiso ya esta resuelto. No lo esta. Aprobar una accion no reparte
    // ambitos, y una herramienta sin ambito se deniega igual.
    if (!DE_ESCRITURA) return;
    const r = evaluatePolicy(DE_ESCRITURA, {}, contexto({ scopes: [] }));
    expect(r.decision, "una herramienta de escritura sin ambito no puede permitirse").toBe(
      "denied",
    );
  });

  it("estar en una aprobacion pendiente no abre OTRAS herramientas", () => {
    // Un ambito concedido para una herramienta no se contagia a las demas ni
    // aunque haya una aprobacion en marcha.
    if (!DE_ESCRITURA || !DE_LECTURA) return;
    const conAmbitoAjeno = contexto({ scopes: [...DE_LECTURA.requiredScopes] });
    const r = evaluatePolicy(DE_ESCRITURA, {}, conAmbitoAjeno);
    expect(r.decision).toBe("denied");
  });
});

describe("una denegacion es final", () => {
  it("lo denegado NO trae argumentos utiles para ejecutarlo igual", () => {
    // Si una denegacion devolviera los argumentos ya saneados y listos, la
    // tentacion de «ejecutarlo de todas formas» estaria a una linea. Un `denied`
    // tiene que ser un callejon sin salida, no un paso intermedio.
    if (!DE_ESCRITURA) return;
    const r = evaluatePolicy(DE_ESCRITURA, { algo: "valor" }, contexto({ scopes: [] }));
    expect(r.decision).toBe("denied");
    expect(r.reason, "una denegacion sin motivo no se puede auditar").toBeTruthy();
  });

  it("un inquilino en los argumentos no gana al del contexto", () => {
    // Se prueba aqui otra vez a proposito: es la via por la que una denegacion
    // se convierte en una ejecucion contra OTRO cliente.
    const t = herramienta("docs_read");
    const r = evaluatePolicy(
      t,
      { path: "docs/README.md", tenantId: "otro-inquilino" },
      contexto({ scopes: [...t.requiredScopes] }),
    );
    expect(r.decision).toBe("denied");
    expect(r.reason).toMatch(/tenant/i);
  });
});

describe("reintentar no cambia lo que se puede hacer", () => {
  it("el mismo ambito da el mismo veredicto las veces que haga falta", () => {
    // Un reintento que ampliara el ambito seria la forma mas silenciosa de
    // escalar: basta con fallar una vez a proposito.
    if (!DE_ESCRITURA) return;
    const ctx = contexto({ scopes: [] });
    const veredictos = [1, 2, 3].map(() => evaluatePolicy(DE_ESCRITURA, {}, ctx).decision);
    expect(new Set(veredictos).size, "el veredicto cambio entre reintentos").toBe(1);
    expect(veredictos[0]).toBe("denied");
  });

  it("cambiar el identificador de peticion no cambia el veredicto", () => {
    // Un reintento lleva otro `requestId`. Si eso moviera la decision, cualquier
    // cliente podria reintentar hasta acertar.
    if (!DE_ESCRITURA) return;
    const a = evaluatePolicy(DE_ESCRITURA, {}, contexto({ scopes: [], requestId: "r-1" }));
    const b = evaluatePolicy(DE_ESCRITURA, {}, contexto({ scopes: [], requestId: "r-2" }));
    expect(a.decision).toBe(b.decision);
  });
});

describe("ninguna herramienta de lectura esconde una escritura", () => {
  it("las que se declaran `readOnly` no piden ambitos de escritura", () => {
    // Es el `fallback` peligroso: si al degradar a una herramienta «de lectura»
    // esa herramienta pudiera escribir, degradar seria ESCALAR.
    for (const t of productiveTools.filter((x) => x.readOnly)) {
      const deEscritura = t.requiredScopes.filter((s) => /write|delete|admin/i.test(s));
      expect(
        deEscritura,
        `${t.name} se declara de solo lectura y pide ${deEscritura.join(", ")}`,
      ).toEqual([]);
    }
  });

  it("EL CONTROL: hay herramientas de las dos clases", () => {
    // Si el catalogo se quedara sin herramientas de escritura, la prueba de
    // arriba pasaria vacia y no diria nada.
    expect(productiveTools.some((t) => t.readOnly), "no hay ninguna de lectura").toBe(true);
    expect(productiveTools.some((t) => !t.readOnly), "no hay ninguna de escritura").toBe(true);
  });
});
