import { describe, expect, it } from "vitest";

/**
 * Política de certificación autónoma de workforce.
 *
 * Estos tests blindan el comportamiento que ya validamos en CI y en local. No
 * lo cambian: la lógica se extrajo tal cual desde `run-workforce-cert.mjs`,
 * cuyo script ejecuta typecheck, build y soak y por eso no era testeable.
 *
 * El invariante central: `certified: true` exige evidencia live REAL. Declarar
 * un entorno sin IA local puede quitar el `required` a los pasos live, pero
 * nunca convierte su `ok:false` en certificación.
 */
import {
  FORCE_PASS_BLOCKER,
  LIVE_EVIDENCE_MISSING_BLOCKER,
  decideWorkforceVerdict,
} from "../../../scripts/workforceVerdict.mjs";

type Step = { id: string; required: boolean; ok: boolean; detail?: string };

const GATES_NO_LIVE = [
  "typecheck",
  "workforce_and_elite_regression",
  "docs_and_runtime_artifacts",
  "phase1_phase2_freeze",
  "block_c_daemon",
  "soak_load",
  "openclaw_mock",
  "production_build",
];

/** Los 8 gates verificables sin IA local, todos en verde. */
function gatesOk(): Step[] {
  return GATES_NO_LIVE.map((id) => ({ id, required: true, ok: true }));
}

/** Escenario CI: live declarado no requerido y en fallo (no hay Ollama). */
function ciSinOllama(): Step[] {
  return [
    ...gatesOk(),
    { id: "ollama_live", required: false, ok: false, detail: "unreachable:fetch failed" },
    { id: "rag_live", required: false, ok: false, detail: "blocked_by_ollama" },
  ];
}

/** Escenario local sin Ollama: live sigue siendo requerido. */
function localSinOllama(): Step[] {
  return [
    ...gatesOk(),
    { id: "ollama_live", required: true, ok: false, detail: "unreachable:fetch failed" },
    { id: "rag_live", required: true, ok: false, detail: "blocked_by_ollama" },
  ];
}

/** Escenario certificable: todo en verde con evidencia live real. */
function todoVerde(): Step[] {
  return [
    ...gatesOk(),
    { id: "ollama_live", required: true, ok: true, detail: "models=6" },
    { id: "rag_live", required: true, ok: true, detail: "elite_rag_ok" },
  ];
}

describe("CI sin Ollama, live declarado no requerido", () => {
  const d = decideWorkforceVerdict({ steps: ciSinOllama(), skipped: [], forcePass: false });

  it("emite CONDITIONAL_PASS y permite continuar", () => {
    expect(d.verdict).toBe("CONDITIONAL_PASS");
    expect(d.exitCode).toBe(0);
  });

  it("NO certifica", () => {
    expect(d.certified).toBe(false);
    expect(d.liveEvidenceOk).toBe(false);
  });

  it("registra la ausencia de evidencia live", () => {
    expect(d.blockers).toContain(LIVE_EVIDENCE_MISSING_BLOCKER);
  });

  it("no convierte ok:false en ok:true ni en skip", () => {
    const steps = ciSinOllama();
    expect(steps.find((s) => s.id === "ollama_live")?.ok).toBe(false);
    expect(steps.find((s) => s.id === "rag_live")?.ok).toBe(false);
    // El detalle diagnóstico se conserva íntegro.
    expect(steps.find((s) => s.id === "ollama_live")?.detail).toContain("unreachable");
  });
});

describe("local sin Ollama y sin la bandera", () => {
  const d = decideWorkforceVerdict({ steps: localSinOllama(), skipped: [], forcePass: false });

  it("es fallo duro", () => {
    expect(d.exitCode).toBe(1);
    expect(d.requiredOk).toBe(false);
  });

  it("nunca certifica", () => {
    expect(d.certified).toBe(false);
  });

  it("los pasos live constan como blockers internos", () => {
    expect(d.internalBlockers).toContain("ollama_live");
    expect(d.internalBlockers).toContain("rag_live");
  });
});

describe("evidencia live real y resto de gates en verde", () => {
  const steps = todoVerde();
  const d = decideWorkforceVerdict({ steps, skipped: [], forcePass: false });

  it("PASS y certificado", () => {
    expect(d.verdict).toBe("PASS");
    expect(d.certified).toBe(true);
    expect(d.exitCode).toBe(0);
  });

  it("son 10 required y 10 en verde", () => {
    const required = steps.filter((s) => s.required);
    expect(required).toHaveLength(10);
    expect(required.filter((s) => s.ok)).toHaveLength(10);
  });

  it("sin blockers", () => {
    expect(d.blockers).toEqual([]);
  });
});

describe("imposible certificar sin evidencia live", () => {
  it.each(["ollama_live", "rag_live"])(
    "si %s no está ok, no hay certificación aunque todo lo demás lo esté",
    (id) => {
      const steps = todoVerde().map((s) => (s.id === id ? { ...s, ok: false } : s));
      const d = decideWorkforceVerdict({ steps, skipped: [], forcePass: false });
      expect(d.certified).toBe(false);
      expect(d.verdict).not.toBe("PASS");
      expect(d.blockers).toContain(LIVE_EVIDENCE_MISSING_BLOCKER);
    },
  );

  it("marcar los live como NO requeridos tampoco certifica", () => {
    const steps = todoVerde().map((s) =>
      s.id === "ollama_live" || s.id === "rag_live" ? { ...s, required: false, ok: false } : s,
    );
    const d = decideWorkforceVerdict({ steps, skipped: [], forcePass: false });
    // Todos los `required` están en verde...
    expect(d.requiredOk).toBe(true);
    // ...y aun así NO certifica: ese era el agujero que el guard cierra.
    expect(d.certified).toBe(false);
  });

  it("un paso live ausente por completo tampoco certifica", () => {
    const steps = todoVerde().filter((s) => s.id !== "rag_live");
    const d = decideWorkforceVerdict({ steps, skipped: [], forcePass: false });
    expect(d.certified).toBe(false);
    expect(d.liveEvidenceOk).toBe(false);
  });
});

describe("FORCE_PASS sigue rechazado", () => {
  it("con todo en verde, forzar produce FAIL y no certifica", () => {
    const d = decideWorkforceVerdict({ steps: todoVerde(), skipped: [], forcePass: true });
    expect(d.verdict).toBe("FAIL");
    expect(d.certified).toBe(false);
    expect(d.exitCode).toBe(1);
    expect(d.blockers).toContain(FORCE_PASS_BLOCKER);
  });
});

describe("required fallido y skips", () => {
  it("un required fallido nunca produce PASS", () => {
    const steps = todoVerde().map((s) => (s.id === "typecheck" ? { ...s, ok: false } : s));
    const d = decideWorkforceVerdict({ steps, skipped: [], forcePass: false });
    expect(d.verdict).not.toBe("PASS");
    expect(d.certified).toBe(false);
    expect(d.internalBlockers).toContain("typecheck");
  });

  it("un skip nunca produce certificación", () => {
    const d = decideWorkforceVerdict({
      steps: todoVerde(),
      skipped: [{ id: "production_build", reason: "NELVYON_WORKFORCE_SKIP_BUILD=1" }],
      forcePass: false,
    });
    expect(d.certified).toBe(false);
    expect(d.verdict).toBe("CONDITIONAL_PASS");
    expect(d.blockers).toContain("skipped:production_build");
  });
});

describe("ninguna combinación de banderas fabrica una certificación", () => {
  it("fuerza bruta sobre required/ok de los pasos live + forcePass", () => {
    const combinaciones: boolean[][] = [];
    for (const reqO of [true, false])
      for (const okO of [true, false])
        for (const reqR of [true, false])
          for (const okR of [true, false])
            for (const force of [true, false])
              combinaciones.push([reqO, okO, reqR, okR, force]);

    for (const [reqO, okO, reqR, okR, force] of combinaciones) {
      const steps: Step[] = [
        ...gatesOk(),
        { id: "ollama_live", required: reqO!, ok: okO! },
        { id: "rag_live", required: reqR!, ok: okR! },
      ];
      const d = decideWorkforceVerdict({ steps, skipped: [], forcePass: force! });
      const evidenciaReal = okO === true && okR === true;
      // Certifica SI Y SOLO SI hay evidencia live real y no se fuerza.
      expect(d.certified).toBe(evidenciaReal && force === false);
    }
    expect(combinaciones).toHaveLength(32);
  });
});
