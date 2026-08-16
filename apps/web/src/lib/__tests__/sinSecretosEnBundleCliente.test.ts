import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Ninguna credencial se lee de una variable `NEXT_PUBLIC_`.
 *
 * EL RIESGO QUE ESTO IMPIDE
 * -------------------------
 * Next.js incrusta en el bundle que descarga el navegador TODO lo que empieza
 * por `NEXT_PUBLIC_`. Leer un secreto de una variable con ese prefijo equivale a
 * publicarlo.
 *
 * `portalDeliverableStorage.ts` tenía un fallback
 * `process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` para la clave de rol de
 * servicio, que evita la seguridad de fila de la base entera. La variable no
 * estaba definida en producción, así que no había fuga — pero el fallback
 * invitaba a crearla: bastaba con que alguien la añadiera «porque la otra no
 * funcionaba».
 *
 * LAS EXCEPCIONES SON REALES Y ESTÁN JUSTIFICADAS
 * -----------------------------------------------
 * Hay dos clases de `NEXT_PUBLIC_*` legítimas: las claves publicables por
 * diseño (una anon key de Supabase, una clave de PostHog) y los guards que
 * COMPRUEBAN que un secreto no está expuesto — que necesitan nombrarlo para
 * detectarlo.
 */

const RAIZ = path.resolve(__dirname, "../..");

/** `NEXT_PUBLIC_` seguido de algo que suena a credencial. */
const SOSPECHOSA = /process\.env\.(NEXT_PUBLIC_[A-Z0-9_]*(SECRET|SERVICE_ROLE|PRIVATE|PASSWORD)[A-Z0-9_]*)/g;

/** Ficheros donde nombrar la variable es el objetivo, no el uso. */
const GUARDS_LEGITIMOS: Record<string, string> = {
  "lib/supabaseClient.ts":
    "assertNoServiceRoleKeyExposedInBrowser() nombra la variable para LANZAR si aparece en el navegador: es el guard, no el uso.",
  "lib/__tests__/sinSecretosEnBundleCliente.test.ts": "este mismo test",
};

function ficheros(dir: string): string[] {
  const salida: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const completa = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      salida.push(...ficheros(completa));
    } else if (/\.tsx?$/.test(e.name)) salida.push(completa);
  }
  return salida;
}

describe("secretos y bundle de cliente", () => {
  const todos = ficheros(RAIZ);

  it("el barrido ve el código fuente", () => {
    expect(todos.length).toBeGreaterThan(300);
  });

  it("ninguna credencial se lee de una variable NEXT_PUBLIC_", () => {
    const culpables: string[] = [];
    for (const f of todos) {
      const rel = path.relative(RAIZ, f).split(path.sep).join("/");
      if (GUARDS_LEGITIMOS[rel]) continue;
      const src = fs.readFileSync(f, "utf8");
      for (const m of src.matchAll(SOSPECHOSA)) culpables.push(`${rel}: ${m[1]}`);
    }
    expect(
      culpables,
      "Next incrusta NEXT_PUBLIC_* en el bundle del navegador; leer un secreto " +
        `de ahí es publicarlo:\n  ${culpables.join("\n  ")}`,
    ).toEqual([]);
  });

  it("el detector reconoce el patrón exacto que se retiró", () => {
    // Control negativo: sin esto, un regex que no casara nada daría verde.
    const muestra = 'const k = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?.trim();';
    expect([...muestra.matchAll(SOSPECHOSA)].length).toBe(1);
    // Y no marca las publicables por diseño.
    const legitima = 'const k = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;';
    expect([...legitima.matchAll(SOSPECHOSA)].length).toBe(0);
  });

  it("las excepciones declaradas existen y siguen siendo guards", () => {
    for (const rel of Object.keys(GUARDS_LEGITIMOS)) {
      const completa = path.join(RAIZ, rel);
      expect(fs.existsSync(completa), `excepción inexistente: ${rel}`).toBe(true);
    }
    const guard = fs.readFileSync(path.join(RAIZ, "lib/supabaseClient.ts"), "utf8");
    expect(guard).toContain("must not be exposed to the browser");
  });
});
