/**
 * BLOQUE 5 · medicion REAL en navegador, categoria por categoria.
 *
 * Todo lo anterior de este bloque se mide leyendo el arbol: reglas sobre el
 * codigo fuente. Eso caza mucho —un `href="#"`, una tabla sin contenedor, un
 * enlace a una ruta que no existe— pero hay defectos que **solo existen una vez
 * pintados**: un contraste que no llega, un boton sin nombre accesible, una
 * pantalla que se desborda a lo ancho en un movil, un error de render que deja
 * al cliente mirando una pagina en blanco.
 *
 * Aqui se abre un navegador de verdad y se mide:
 *
 *   1. **La pantalla se pinta.** Ni pantalla en blanco, ni frontera de error,
 *      ni redireccion al login. Es el control positivo: sin el, una suite que
 *      midiera paginas vacias daria cero violaciones y cero desbordamiento —el
 *      verde perfecto y mas inutil que existe.
 *   2. **Accesibilidad con axe-core**, contando solo `serious` y `critical`.
 *      axe no opina de diseno: mide reglas de WCAG que se pueden reproducir.
 *   3. **Desbordamiento horizontal a 375 px.** `scrollWidth > clientWidth` en
 *      el documento es la definicion operativa de «no cabe en un movil».
 *
 * Las rutas NO estan escritas aqui: salen de `rutas_por_categoria.json`, que
 * genera `informe_por_categoria.rutas_representativas()` desde el inventario
 * cerrado. Escribirlas a mano seria la via clasica para acabar midiendo un
 * producto que ya no es este.
 *
 * Coste externo: 0 €. Navegador local, servidor local, sin proveedores de pago.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { mockSaasApis, setAuthCookie } from "../saas/fixtures";

// `__dirname`, no `import.meta.url`: el resto de specs del arbol se
// transpilan a CommonJS y mezclar los dos sistemas rompia la carga entera
// del fichero («require is not defined in ES module scope»), con lo que
// Playwright salia con codigo 0 y «No tests found»: cero medido y verde.
const AQUI = __dirname;

/**
 * `axe.min.js` desde el almacen de pnpm.
 *
 * `axe-core` esta instalado pero `@axe-core/playwright` no, y ese envoltorio no
 * hace mas que inyectar este mismo fichero en la pagina. Se lee directamente en
 * vez de anadir una dependencia nueva para hacer una linea de trabajo.
 *
 * Si no aparece, esto REVIENTA. Un `skip` silencioso dejaria la suite en verde
 * sin haber medido accesibilidad en ninguna pantalla, que es justo el tipo de
 * verde que este proyecto lleva cuatro bloques eliminando.
 */
function localizarAxe(): string {
  let dir = AQUI;
  for (let i = 0; i < 8; i++) {
    const almacen = join(dir, "node_modules", ".pnpm");
    if (existsSync(almacen)) {
      for (const entrada of readdirSync(almacen)) {
        if (!entrada.startsWith("axe-core@")) continue;
        const f = join(almacen, entrada, "node_modules", "axe-core", "axe.min.js");
        if (existsSync(f)) return f;
      }
    }
    const directo = join(dir, "node_modules", "axe-core", "axe.min.js");
    if (existsSync(directo)) return directo;
    const padre = dirname(dir);
    if (padre === dir) break;
    dir = padre;
  }
  throw new Error(
    "no se encuentra axe-core/axe.min.js: sin el no se mide accesibilidad y " +
      "un verde aqui no significaria nada",
  );
}

const AXE = readFileSync(localizarAxe(), "utf8");

type ViolacionAxe = {
  id: string;
  impact: string | null;
  nodes: { html: string; resumen: string }[];
};

/** Inyecta axe en la pagina y devuelve sus violaciones. */
async function analizarConAxe(page: Page): Promise<ViolacionAxe[]> {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    // @ts-expect-error axe se inyecta en tiempo de ejecucion
    const r = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    return r.violations.map(
      (v: { id: string; impact: string | null; nodes: { html: string; failureSummary?: string }[] }) => ({
        id: v.id,
        impact: v.impact,
        // El resumen de axe lleva los colores y la razon exactos. Sin el, quien
        // vea este rojo dentro de seis meses solo tendra el nombre de la regla
        // y un fragmento de HTML: sabra QUE falla y no POR QUE.
        nodes: v.nodes.map((n) => ({
          html: n.html,
          resumen: (n.failureSummary ?? "").replace(/\s+/g, " ").slice(0, 200),
        })),
      }),
    );
  }) as Promise<ViolacionAxe[]>;
}

const RUTAS: Record<string, string[]> = JSON.parse(
  readFileSync(join(AQUI, "rutas_por_categoria.json"), "utf8"),
);

/** Ancho de un movil pequeno todavia muy comun. Si cabe aqui, cabe en casi todo. */
const MOVIL = { width: 375, height: 812 };

/**
 * Solo `serious` y `critical`.
 *
 * No es rebajar la vara: `minor` y `moderate` de axe incluyen avisos que
 * dependen del contexto y que, aceptados en bloque, convierten la suite en
 * ruido que nadie mira. Estos dos niveles son los que un usuario con lector de
 * pantalla o con poca vision sufre de verdad.
 */
const GRAVEDAD = ["serious", "critical"];

for (const [categoria, rutas] of Object.entries(RUTAS)) {
  test.describe(`BLOQUE 5 · ${categoria}`, () => {
    test.beforeEach(async ({ page, context, baseURL }) => {
      await setAuthCookie(context, baseURL);

      /**
       * ORDEN IMPORTANTE: `page.route` resuelve en LIFO, o sea que el ultimo
       * registrado atiende primero. Por eso el comodin va el PRIMERO: si se
       * registra al final se traga tambien `/api/saas/**` y las fixtures reales
       * del arbol dejan de aplicarse sin que nadie lo note.
       *
       * El comodin existe porque las pantallas de `/analytics`, `/account`,
       * `/campaigns`, `/billing`, `/publicidad`, `/os/**` y `/admin` piden a
       * `/api/platform/**`, `/api/os/**` y `/api/admin/**`, y ante un 401 hacen
       * `router.replace("/auth/login?next=...")`. Sin el, **35 de las 75 rutas**
       * acababan en el login y el panel entero quedaba sin medir.
       *
       * Se devuelve carga vacia con las formas de lista mas comunes: lo que se
       * mide aqui es como se PINTA la pantalla —accesibilidad, anchura, errores
       * de render—, no si los datos son correctos. De eso ya se encargan las 43
       * suites funcionales del arbol.
       */
      await page.route("**/api/**", (route) =>
        route.fulfill({
          status: 200,
          json: { ok: true, items: [], data: [], results: [], total: 0 },
        }),
      );

      await mockSaasApis(page);

      /**
       * `/api/auth/token` devuelve el JWT que respalda la cookie. Sin el,
       * `recuperarSesionDesdeCookie` obtiene el perfil pero no el token, no
       * puede firmar nada y devuelve `false`: la pantalla acaba en el login
       * igual, y la medicion diria que el defecto sigue ahi cuando lo que falta
       * es el mock.
       */
      await page.route("**/api/auth/token", (route) =>
        route.fulfill({ json: { token: "jwt-de-certificacion-bloque-5" } }),
      );

      await page.route("**/api/auth/me", (route) =>
        route.fulfill({
          json: {
            userId: "e2e-user",
            email: "certificacion@nelvyon.test",
            tenantId: "e2e-tenant",
            plan: "pro",
            fullName: "Certificacion Bloque 5",
          },
        }),
      );
    });

    for (const ruta of rutas) {
      test(`${ruta} se pinta, es accesible y cabe en un movil`, async ({ page }) => {
        const errores: string[] = [];
        page.on("pageerror", (e) => errores.push(String(e)));

        const respuesta = await page.goto(ruta, { waitUntil: "domcontentloaded" });

        // ── 1 · la pantalla existe de verdad ────────────────────────────────
        expect(respuesta?.status(), `${ruta} respondio ${respuesta?.status()}`).toBeLessThan(400);

        await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {
          // Hay pantallas con sondeo abierto que nunca llegan a estar quietas.
          // No es un fallo: se sigue midiendo lo que ya esta pintado.
        });

        // DESPUES de que se calme la red: la redireccion al login la dispara el
        // cliente, no el servidor, y comprobarla antes daba por medida una
        // pantalla que estaba a punto de desaparecer.
        // Las pantallas de acceso SON el login: exigirles no estar en `/login`
        // seria exigirles no ser lo que son.
        if (!/^\/(login|register|sign-in|auth)/.test(ruta)) {
          expect(
            new URL(page.url()).pathname,
            `${ruta} acabo en el login: no se ha medido esa pantalla`,
          ).not.toMatch(/\/login/);
        }

        const texto = (await page.locator("body").innerText().catch(() => "")) ?? "";
        expect(texto.trim().length, `${ruta} pinto una pagina en blanco`).toBeGreaterThan(40);
        expect(texto, `${ruta} muestra una frontera de error`).not.toMatch(
          /Application error: a client-side exception|Internal Server Error/i,
        );

        // ── 2 · accesibilidad medida, no opinada ────────────────────────────
        //
        // Se espera a que la pantalla se ASIENTE antes de medir. No es maquillar
        // un fallo: es medir el estado que el usuario acaba viendo.
        //
        // Sin esperar, `/crm` y `/saas/benchmark` daban 7 y 4 violaciones que
        // desaparecian solas. La causa esta documentada en `SaasW3crmShell`: la
        // hoja del pack se carga por `<link precedence>` y hasta que aplica, el
        // subarbol se pinta con los estilos por defecto. Ese parpadeo es un
        // comportamiento conocido y analizado, no el contraste del producto.
        //
        // La primera version esperaba 1500 ms fijos y seguia fallando con cuatro
        // procesos en paralelo: con la maquina cargada, el parpadeo dura mas. Un
        // cronometro solo mueve el problema de sitio.
        //
        // Se espera a la SENAL: que todas las hojas enlazadas esten aplicadas
        // (`link.sheet !== null`). Eso es exactamente la condicion que faltaba,
        // y deja de depender de lo ocupada que este la maquina.
        await page
          .waitForFunction(
            () =>
              Array.from(document.querySelectorAll('link[rel="stylesheet"]')).every((l) => {
                try {
                  return (l as HTMLLinkElement).sheet !== null;
                } catch {
                  return true; // hoja de otro origen: no se puede inspeccionar
                }
              }),
            { timeout: 20_000 },
          )
          .catch(() => {
            // Si alguna no llega a aplicar, se mide igual y el resultado lo
            // dira: callarlo seria peor.
          });
        await page.waitForTimeout(400); // un respiro para que el estilo pinte

        const violaciones = await analizarConAxe(page);
        const graves = violaciones.filter((v) => GRAVEDAD.includes(v.impact ?? ""));
        const detalle = graves
          .map((v) => `${v.impact}/${v.id} x${v.nodes.length}: ${v.nodes[0]?.html?.slice(0, 90)}`)
          .join("\n");
        expect(graves, `${ruta} — ${graves.length} violaciones graves:\n${detalle}`).toHaveLength(0);

        // ── 3 · cabe en un movil ────────────────────────────────────────────
        await page.setViewportSize(MOVIL);
        await page.waitForTimeout(300); // que el layout se reacomode
        const desborde = await page.evaluate(() => {
          const d = document.documentElement;
          return { ancho: d.scrollWidth, hueco: d.clientWidth };
        });
        expect(
          desborde.ancho,
          `${ruta} se desborda a lo ancho en 375px: ${desborde.ancho}px sobre ${desborde.hueco}px`,
        ).toBeLessThanOrEqual(desborde.hueco + 1); // 1px de tolerancia por redondeo

        // ── 4 · nada revento por debajo ─────────────────────────────────────
        expect(errores, `${ruta} lanzo errores de JavaScript:\n${errores.join("\n")}`).toHaveLength(0);
      });
    }
  });
}
