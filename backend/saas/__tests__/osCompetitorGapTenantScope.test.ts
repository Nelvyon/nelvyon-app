import { describe, expect, it } from "vitest";

/**
 * Alcance de tenant en `os_competitor_gap_runs`.
 *
 * El contrato anterior era `opts.tenantId ? clause : ""`: **omitir el tenant
 * concedía alcance global en silencio**. Ninguno de los tres llamadores lo
 * explotaba —los tracé uno a uno— pero el contrato permitía que un llamador
 * futuro tocara runs de cualquier tenant sin escribir nada sospechoso y sin que
 * fallara nada.
 *
 * Ahora el modo global hay que pedirlo con `SYSTEM_SCOPE`. Estos tests fijan que
 * `undefined`, `null` y `""` fallan cerrado.
 */
import {
  OsCompetitorGapError,
  OsCompetitorGapService,
  SYSTEM_SCOPE,
} from "../OsCompetitorGapService";

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "22222222-2222-4222-8222-222222222222";
const RUN_DE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

/** DB falsa que respeta el filtro de tenant realmente presente en el SQL. */
function dbFake() {
  const consultas: Array<{ sql: string; params: unknown[] }> = [];
  const filas = [
    {
      id: RUN_DE_A,
      run_key: "gap-1",
      tenant_id: TENANT_A,
      workspace_id: 1,
      own_domain: "a.es",
      competitor_url: "https://b.es",
      competitor_domain: "b.es",
      status: "running",
      gaps: null,
      gap_score: null,
      recommended_pack_id: null,
      recommended_skus: null,
      agent_data: null,
      report_html: null,
      error_message: null,
      created_at: new Date().toISOString(),
      completed_at: null,
      launch_id: null,
      pack_run_id: null,
    },
  ];
  return {
    consultas,
    query: async (sql: string, params: unknown[] = []) => {
      consultas.push({ sql, params });
      // Si el SQL filtra por tenant, solo devuelve la fila cuando coincide.
      if (/tenant_id\s*=\s*\$/i.test(sql)) {
        const tenant = params.find((p) => p === TENANT_A || p === TENANT_B);
        return tenant === TENANT_A ? filas : [];
      }
      return filas;
    },
  };
}

function servicio(db: ReturnType<typeof dbFake>) {
  return new OsCompetitorGapService(db as never);
}

describe("tenant-scoped: fail-closed sin tenant", () => {
  it.each([undefined, null, "", "   "])(
    "getRun con tenantId=%p lanza en vez de leer globalmente",
    async (valor) => {
      const db = dbFake();
      await expect(servicio(db).getRun(RUN_DE_A, valor as never)).rejects.toBeInstanceOf(
        OsCompetitorGapError,
      );
      // Lo esencial: no llegó a consultar la base sin filtro.
      expect(db.consultas).toHaveLength(0);
    },
  );

  it("failRun sin tenant lanza y no ejecuta el UPDATE", async () => {
    const db = dbFake();
    await expect(servicio(db).failRun(RUN_DE_A, "boom")).rejects.toBeInstanceOf(
      OsCompetitorGapError,
    );
    expect(db.consultas).toHaveLength(0);
  });

  it("el mensaje explica que el modo global debe pedirse explícitamente", async () => {
    const db = dbFake();
    await expect(servicio(db).failRun(RUN_DE_A, "boom")).rejects.toThrow(/SYSTEM_SCOPE/);
  });
});

describe("tenant A opera sobre lo suyo", () => {
  it("getRun con su tenant devuelve el run y el SQL filtra", async () => {
    const db = dbFake();
    const run = await servicio(db).getRun(RUN_DE_A, TENANT_A);
    expect(run.id).toBe(RUN_DE_A);
    expect(db.consultas[0]!.sql).toMatch(/tenant_id\s*=\s*\$/i);
    expect(db.consultas[0]!.params).toContain(TENANT_A);
  });
});

describe("tenant B no alcanza datos de A conociendo el UUID", () => {
  it("getRun con el UUID de A pero tenant B no encuentra nada", async () => {
    const db = dbFake();
    await expect(servicio(db).getRun(RUN_DE_A, TENANT_B)).rejects.toThrow(/no encontrado/i);
    // El filtro viajó en el SQL: no es que la fila no exista, es que no es suya.
    expect(db.consultas[0]!.sql).toMatch(/tenant_id\s*=\s*\$/i);
    expect(db.consultas[0]!.params).toContain(TENANT_B);
  });

  it("failRun de B sobre el run de A no afecta a ninguna fila", async () => {
    const db = dbFake();
    await expect(servicio(db).failRun(RUN_DE_A, "sabotaje", TENANT_B)).rejects.toBeTruthy();
    expect(db.consultas[0]!.sql).toMatch(/tenant_id\s*=\s*\$/i);
  });
});

describe("system-scoped solo por API explícita", () => {
  it("SYSTEM_SCOPE permite la lectura global", async () => {
    const db = dbFake();
    const run = await servicio(db).getRun(RUN_DE_A, SYSTEM_SCOPE);
    expect(run.id).toBe(RUN_DE_A);
    expect(db.consultas[0]!.sql).not.toMatch(/tenant_id\s*=\s*\$/i);
  });

  it("no existe ningún valor 'falsy' que active el modo global", async () => {
    const db = dbFake();
    for (const valor of [undefined, null, "", 0, false, NaN]) {
      await expect(servicio(db).getRun(RUN_DE_A, valor as never)).rejects.toBeInstanceOf(
        OsCompetitorGapError,
      );
    }
    expect(db.consultas).toHaveLength(0);
  });

  it("SYSTEM_SCOPE es un símbolo: no se obtiene por accidente ni desde JSON", () => {
    expect(typeof SYSTEM_SCOPE).toBe("symbol");
    // Un cuerpo de petición nunca puede transportarlo.
    expect(JSON.parse(JSON.stringify({ t: String(SYSTEM_SCOPE) })).t).not.toBe(SYSTEM_SCOPE);
  });
});
