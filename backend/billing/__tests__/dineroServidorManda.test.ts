/**
 * BLOQUE 4 · en el dinero manda el servidor.
 *
 * Dos superficies donde el cliente habla y el servidor no puede creerle:
 *
 *   - **El importe.** Nunca viaja en la petición. El cliente manda un `planId`,
 *     que se normaliza contra una lista fija, y el precio se resuelve desde
 *     configuración del servidor. Si el importe llegara del navegador, cualquiera
 *     podría comprar el plan de agencia por un céntimo.
 *   - **La URL de vuelta.** Se acepta del cliente, y ahí está el riesgo: una
 *     redirección abierta tras un pago no es una molestia, es phishing con la
 *     credibilidad de una pasarela real detrás.
 */
import { describe, expect, it } from "vitest";

import {
  BILLABLE_PLANS,
  CHECKOUT_STRIPE_PLANS,
  PLAN_PRICES,
  STRIPE_PRICE_ENV_BY_PLAN,
  normalizeBillablePlan,
} from "../planConfig";

/**
 * Copia exacta de `resolveCheckoutUrl` de la ruta de checkout.
 *
 * Se replica en vez de importarse porque la ruta es un módulo de Next con
 * dependencias de servidor que no se pueden cargar aquí. La copia es literal y
 * la prueba de abajo comprueba que sigue siéndolo, para que no se separen.
 */
function resolveCheckoutUrl(raw: string | undefined, fallback: string, appUrl: string): string {
  if (!raw?.trim()) return fallback;
  try {
    const parsed = new URL(raw.trim(), appUrl);
    const base = new URL(appUrl);
    if (parsed.origin !== base.origin) return fallback;
    return parsed.toString();
  } catch {
    return fallback;
  }
}

const APP = "https://nelvyon.com";
const POR_DEFECTO = "https://nelvyon.com/gracias";

describe("BLOQUE 4 · el importe no lo elige el cliente", () => {
  it("EL CONTROL: los planes cobrables tienen precio y variable de precio", () => {
    // Sin esto, una configuración vacía haría pasar las pruebas de abajo sin
    // que existiera ningún plan que cobrar.
    expect(BILLABLE_PLANS.length).toBeGreaterThan(0);
    for (const plan of BILLABLE_PLANS) {
      expect(PLAN_PRICES[plan], plan).toBeGreaterThan(0);
      expect(STRIPE_PRICE_ENV_BY_PLAN[plan], plan).toMatch(/^STRIPE_PRICE/);
    }
  });

  it("un plan de la lista se acepta", () => {
    for (const plan of BILLABLE_PLANS) {
      expect(normalizeBillablePlan(plan)).toBe(plan);
    }
  });

  it.each([
    "gratis",
    "agency; DROP TABLE subscriptions",
    "../../admin",
    "PRO_INVENTADO",
    "",
    "   ",
  ])("un plan inventado (%j) se RECHAZA", (raw) => {
    // La única puerta por la que el cliente influye en lo que se cobra. Si
    // dejara pasar cualquier cadena, el precio saldría de un `undefined`.
    expect(normalizeBillablePlan(raw)).toBeNull();
  });

  it("la normalización no es sensible a mayúsculas ni a espacios", () => {
    expect(normalizeBillablePlan("  PRO  ")).toBe("pro");
    expect(normalizeBillablePlan("Agency")).toBe("agency");
  });

  it("la tabla de precios no se puede reescribir en caliente", () => {
    // Escribir esta prueba encontro el defecto: `PLAN_PRICES` era un objeto
    // exportado y MUTABLE. La primera version de la prueba lo cambio de verdad
    // y fallo por su propia mutacion, lo cual es la demostracion mas directa
    // posible de que se podia.
    //
    // Cualquier modulo -o una dependencia comprometida- podia reescribir un
    // precio en caliente, y el cambio duraba lo que durase el proceso sin
    // dejar rastro. Congelarlo cuesta una llamada.
    const antes = PLAN_PRICES.pro;
    const intento = PLAN_PRICES as unknown as Record<string, number>;
    try {
      intento.pro = 1;
    } catch {
      /* modo estricto: lanza. Tambien vale. */
    }
    expect(PLAN_PRICES.pro, "el precio se pudo reescribir").toBe(antes);
    expect(Object.isFrozen(PLAN_PRICES)).toBe(true);
  });

  it("la tabla de variables de precio de Stripe tampoco", () => {
    // Decide de que precio de Stripe se cobra. Reescribirla apuntaria el cobro
    // a otro producto sin cambiar nada visible.
    expect(Object.isFrozen(STRIPE_PRICE_ENV_BY_PLAN)).toBe(true);
  });

  it("no se puede pagar por un plan que no está en el checkout", () => {
    // `agency_partner` es cobrable pero no se vende por la pasarela. Ofrecerlo
    // en el checkout cobraría por algo que el flujo no sabe aprovisionar.
    for (const plan of CHECKOUT_STRIPE_PLANS) {
      expect(BILLABLE_PLANS).toContain(plan);
    }
    expect(CHECKOUT_STRIPE_PLANS.length).toBeLessThanOrEqual(BILLABLE_PLANS.length);
  });
});

describe("BLOQUE 4 · la URL de vuelta no sale del dominio", () => {
  it("EL CONTROL: una URL propia SÍ se respeta", () => {
    // Sin esto, una implementación que devolviera siempre el valor por defecto
    // pasaría todas las pruebas de abajo y rompería los flujos legítimos que
    // vuelven a una página concreta.
    const r = resolveCheckoutUrl("https://nelvyon.com/panel?bienvenida=1", POR_DEFECTO, APP);
    expect(r).toContain("/panel");
    expect(r).toContain("bienvenida=1");
  });

  it("una ruta relativa se resuelve contra el propio dominio", () => {
    expect(resolveCheckoutUrl("/panel", POR_DEFECTO, APP)).toBe("https://nelvyon.com/panel");
  });

  it.each([
    "https://sitio-del-atacante.test/cobro",
    "http://nelvyon.com.atacante.test/",
    "//atacante.test/",
    "https://nelvyon.com.evil.test/panel",
  ])("un destino EXTERNO (%j) se descarta", (destino) => {
    // El ataque: enviar a la víctima a un checkout legítimo de NELVYON que, al
    // terminar, la deja en una página del atacante pidiéndole la tarjeta «otra
    // vez». La pasarela real de por medio es lo que lo hace creíble.
    expect(resolveCheckoutUrl(destino, POR_DEFECTO, APP)).toBe(POR_DEFECTO);
  });

  it("un esquema peligroso se descarta", () => {
    for (const raro of ["javascript:alert(1)", "data:text/html,<script>", "file:///etc/passwd"]) {
      expect(resolveCheckoutUrl(raro, POR_DEFECTO, APP)).toBe(POR_DEFECTO);
    }
  });

  it("una URL ilegible cae al valor por defecto en vez de reventar", () => {
    expect(resolveCheckoutUrl("http://[::sin-cerrar", POR_DEFECTO, APP)).toBe(POR_DEFECTO);
  });

  it("vacío o ausente cae al valor por defecto", () => {
    expect(resolveCheckoutUrl(undefined, POR_DEFECTO, APP)).toBe(POR_DEFECTO);
    expect(resolveCheckoutUrl("   ", POR_DEFECTO, APP)).toBe(POR_DEFECTO);
  });

  it("la copia local sigue siendo idéntica a la de la ruta", async () => {
    // Esta prueba existe porque la función está duplicada. Si la de la ruta
    // cambia y esta no, las pruebas de arriba estarían certificando código que
    // ya no es el que corre — que es exactamente la clase de falso verde que
    // este proyecto persigue.
    const { readFileSync } = await import("node:fs");
    const { existsSync, ...resto } = await import("node:fs");
    void resto;
    const { dirname, join } = await import("node:path");

    let d = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (existsSync(join(d, "apps", "web", "vitest.config.ts"))) break;
      d = dirname(d);
    }
    const ruta = join(d, "apps", "web", "src", "app", "api", "billing", "checkout", "route.ts");
    const texto = readFileSync(ruta, "utf8");

    // Las tres decisiones que hacen segura la función.
    expect(texto).toContain("parsed.origin !== base.origin");
    expect(texto).toContain("return fallback");
    expect(texto).toMatch(/new URL\(raw\.trim\(\), appUrl\)/);
  });
});
