import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Guard estructural contra la regresión que originó el hallazgo.
 *
 * El plano `platform/*` tuvo durante mucho tiempo rutas mutantes autorizadas
 * solo con `requirePlatformClaims` + pertenencia al workspace. Nadie lo detectó
 * porque nada obligaba a declarar autoridad. Este test recorre las rutas reales
 * del árbol y exige que toda ruta que mute declare una capability.
 *
 * No es un grep sobre el repositorio: parte del conjunto de ficheros `route.ts`
 * bajo `platform/`, extrae los handlers exportados y comprueba la propiedad
 * ruta por ruta. Una ruta nueva entra en el barrido automáticamente — que es
 * justo lo que faltaba.
 *
 * No añade dependencias ni herramientas: solo `fs` y el runner que ya existe.
 */

const RAIZ = path.resolve(__dirname, "..");
const MUTANTES = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/g;

/**
 * Excepciones legítimas. Cada una con motivo, y con una comprobación adicional
 * que la invalida si deja de cumplirse el supuesto que la justifica.
 */
type Categoria = "sin-side-effect" | "autz-propia" | "bff-delegado" | "plano-portal";

const PERMITIDAS: Record<string, { motivo: string; categoria: Categoria }> = {
  "workspaces/create": {
    motivo:
      "Crea el primer workspace: no existe todavía workspace sobre el que resolver rol, " +
      "así que no puede autorizarse por capability de workspace. Control real: auth + plan. " +
      "El bypass de cuota en la vía de fallback está registrado como deuda aparte.",
    categoria: "autz-propia",
  },
  "reputacion/connection": {
    motivo:
      "Stub degradado: el POST devuelve `bffDegraded` y no ejecuta ningún side effect, " +
      "ni recibe contexto de workspace. La capability `platform.reputation.manage` ya existe " +
      "en la matriz para cuando la ruta pase a mutar de verdad.",
    categoria: "sin-side-effect",
  },
  ...Object.fromEntries(
    [
      "ads/briefing",
      "automations/rules",
      "automations/workflows",
      "automations/workflows/[id]",
      "ecommerce/projects",
      "ecommerce/projects/[id]",
      "ecommerce/projects/[id]/generate",
      "ecommerce/projects/[id]/products/[productId]",
      "funnels",
      "funnels/[id]",
    ].map((id) => [
      id,
      {
        motivo:
          "BFF puramente delegado: autentica en `adsBffPost`/`resolveClaims` y proxya a FastAPI, " +
          "que aplica su propia autorización. No escribe en la base de NELVYON. " +
          "RESIDUAL CONOCIDO: la autorización de FastAPI para estas rutas NO se ha verificado en " +
          "esta auditoría y queda registrada como deuda del plano upstream.",
        categoria: "bff-delegado" as Categoria,
      },
    ]),
  ),
  ...Object.fromEntries(
    [
      "portal/auth/accept-invite",
      "portal/deliverables/[id]/approve",
      "portal/deliverables/[id]/reject",
    ].map((id) => [
      id,
      {
        motivo:
          "Plano de autorización DISTINTO: portal de cliente, con su propio JWT " +
          "(`requirePortalClaims`) o canje de invitación por token. Sus actores no son miembros " +
          "de `workspace_members`, así que la matriz rol→capability no les aplica.",
        categoria: "plano-portal" as Categoria,
      },
    ]),
  ),
};

/** Todas las rutas del plano, con su fuente. */
function rutas(): Array<{ id: string; src: string }> {
  const out: Array<{ id: string; src: string }> = [];
  const anda = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "__tests__") continue;
        anda(p);
      } else if (e.name === "route.ts") {
        out.push({
          id: path.relative(RAIZ, path.dirname(p)).split(path.sep).join("/"),
          src: fs.readFileSync(p, "utf8"),
        });
      }
    }
  };
  anda(RAIZ);
  return out;
}

const TODAS = rutas();
const CON_MUTACION = TODAS.filter((r) => MUTANTES.test(r.src) || (MUTANTES.lastIndex = 0));

describe("guard — toda ruta mutante de platform/* declara autorización", () => {
  it("el barrido encuentra rutas de verdad (el test no pasa por vacío)", () => {
    expect(TODAS.length).toBeGreaterThan(20);
    expect(CON_MUTACION.length).toBeGreaterThan(5);
  });

  it.each(CON_MUTACION.map((r) => r.id))("%s", (id) => {
    const r = CON_MUTACION.find((x) => x.id === id)!;
    if (PERMITIDAS[id]) {
      expect(PERMITIDAS[id]!.motivo.length).toBeGreaterThan(30);
      return;
    }
    expect(
      r.src.includes("requirePlatformContext"),
      `${id} muta pero no declara capability. Usa requirePlatformContext(req, action) ` +
        `o añádela a PERMITIDAS con un motivo — autenticación y pertenencia no bastan.`,
    ).toBe(true);
  });

  it("ninguna ruta mutante se queda solo con requirePlatformClaims", () => {
    const solas = CON_MUTACION.filter(
      (r) =>
        !PERMITIDAS[r.id] &&
        r.src.includes("requirePlatformClaims") &&
        !r.src.includes("requirePlatformContext"),
    ).map((r) => r.id);
    expect(solas).toEqual([]);
  });
});

/**
 * Las excepciones caducan solas. Si mañana alguien le da un side effect real a
 * una ruta allowlisted como stub, el supuesto que la justificaba deja de ser
 * cierto y este test obliga a revisar su autorización.
 */
describe("guard — las excepciones siguen mereciendo serlo", () => {
  const SENALES_DE_MUTACION = [
    /from "@\/lib\/platformDbFallback"/,
    /from "@\/lib\/partners\//,
    /from "@\/lib\/portal\//,
    /DbClient/,
    /INSERT INTO|UPDATE .* SET|DELETE FROM/i,
  ];

  it.each(
    Object.entries(PERMITIDAS)
      .filter(([, v]) => v.categoria === "sin-side-effect")
      .map(([id]) => id),
  )("%s sigue sin side effect", (id) => {
    const r = TODAS.find((x) => x.id === id);
    expect(r, `${id} está en PERMITIDAS pero ya no existe: limpia la allowlist`).toBeDefined();
    const señales = SENALES_DE_MUTACION.filter((re) => re.test(r!.src));
    expect(
      señales,
      `${id} estaba permitida por ser un stub sin side effect y ha dejado de serlo. ` +
        `Revisa su autorización y migra a requirePlatformContext antes de quitar esto.`,
    ).toEqual([]);
  });

  it("toda entrada de la allowlist corresponde a una ruta existente y mutante", () => {
    for (const id of Object.keys(PERMITIDAS)) {
      expect(CON_MUTACION.some((r) => r.id === id), `${id} ya no es mutante: sobra en la allowlist`).toBe(true);
    }
  });
});

/**
 * Mapa explícito ruta → capability esperada.
 *
 * El guard anterior solo exige que la ruta declare ALGUNA capability. Esto fija
 * CUÁL: sin ello, cambiar `partners.billing.charge` por una más débil pasaría
 * desapercibido. Se lee del fichero real, así que no puede divergir del código.
 */
const ESPERADAS: Record<string, string> = {
  "campaigns": "platform.crm.write",
  "campaigns/[id]": "platform.crm.write",
  "crm/clients": "platform.crm.write",
  "crm/clients/[id]": "platform.crm.write",
  "crm/deals": "platform.crm.write",
  "crm/deals/[id]": "platform.crm.write",
  "inbox/tickets": "platform.support.write",
  "inbox/tickets/[id]": "platform.support.write",
  "partners/clients/[wsId]/billing": "partners.billing.manage",
  "partners/clients/[wsId]/charge-pack": "partners.billing.charge",
  "partners/connect/onboard": "partners.connect.manage",
  "portal/invites": "partners.portal.invite",
};

describe("guard — cada ruta declara la capability ACORDADA, no una cualquiera", () => {
  it.each(Object.entries(ESPERADAS))("%s -> %s", (id, cap) => {
    const r = TODAS.find((x) => x.id === id);
    expect(r, `${id} ya no existe: revisa el mapa`).toBeDefined();
    const declaradas = [...r!.src.matchAll(/requirePlatformContext\(\s*req,\s*"([a-z.]+)"/g)].map((m) => m[1]);
    expect(declaradas.length).toBeGreaterThan(0);
    // Todas las llamadas de la ruta deben pedir la MISMA autoridad acordada.
    expect(new Set(declaradas)).toEqual(new Set([cap]));
  });

  it("el mapa cubre todas las rutas migradas (ninguna se queda sin fijar)", () => {
    const conGate = TODAS.filter((r) => r.src.includes("requirePlatformContext")).map((r) => r.id);
    expect(new Set(conGate)).toEqual(new Set(Object.keys(ESPERADAS)));
  });
});
