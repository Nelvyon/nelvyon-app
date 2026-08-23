/**
 * Que superficies sensibles caen en `getRateLimitRule() === null`.
 *
 * `getRateLimitRule` devuelve `null` cuando no casa ninguna regla, y entonces la
 * peticion pasa SIN CUPO. Que el middleware exista y se ejecute no dice nada:
 * el barrido de cobertura encontro cuatro rutas que pasaban por `middleware.ts`
 * —el matcher incluye `/api/auth/:path*`— y aun asi no tenian limite, porque no
 * habia regla que las reconociera.
 *
 * Esta prueba fija esas cuatro y, sobre todo, deja el CONTROL puesto: si alguien
 * anade manana una regla comodin `p.startsWith("/api/")`, el limite dejaria de
 * discriminar y esto lo dice.
 */
import { describe, expect, it } from "vitest";

import { getRateLimitRule } from "../rateLimit";

/** Superficie sensible -> por que necesita cupo. */
const DEBEN_TENER_LIMITE: ReadonlyArray<readonly [string, string]> = [
  ["/api/auth/register", "alta masiva de cuentas"],
  ["/api/auth/login", "fuerza bruta de credenciales"],
  ["/api/auth/forgot-password", "envio de correo a terceros"],
  ["/api/auth/reset-password", "adivinacion del token de reset"],
  ["/api/auth/verify-email", "adivinacion del token de verificacion"],
  ["/api/auth/token", "emision de credenciales"],
  ["/api/auth/sso/start", "anonima y provoca salida de red"],
  ["/api/auth/sso/callback", "anonima y provoca salida de red"],
  ["/api/auth/sso/saml/acs", "anonima y provoca salida de red"],
  ["/api/billing/checkout", "dinero"],
  ["/api/platform/portal/auth/login", "fuerza bruta en el portal"],
  ["/api/saas/sms", "coste por mensaje"],
];

describe("cobertura del limitador", () => {
  it.each(DEBEN_TENER_LIMITE)("%s tiene regla (%s)", (ruta) => {
    expect(getRateLimitRule(ruta)).not.toBeNull();
  });

  it("las cuatro que faltaban tienen un techo REALMENTE bajo", () => {
    // Tener regla no basta: una de 10.000/min seria una regla que no limita.
    for (const [ruta, techo] of [
      ["/api/auth/verify-email", 10],
      ["/api/auth/sso/callback", 20],
      ["/api/auth/token", 30],
      ["/api/billing/checkout", 10],
    ] as const) {
      const regla = getRateLimitRule(ruta);
      expect(regla?.limit, ruta).toBeLessThanOrEqual(techo);
      expect(regla?.windowSec, ruta).toBeGreaterThan(0);
    }
  });

  it("las anonimas fallan CERRADO si no hay almacen compartido", () => {
    // Sin Upstash, un limite en memoria por instancia no limita nada en cuanto
    // hay mas de una replica. Para las rutas sin sesion eso tiene que ser un
    // rechazo, no un «pasa igual».
    for (const ruta of [
      "/api/auth/verify-email",
      "/api/auth/sso/callback",
      "/api/auth/sso/saml/acs",
    ]) {
      expect(getRateLimitRule(ruta)?.requireSharedStoreInProduction, ruta).toBe(true);
    }
  });

  it("EL CONTROL: el limitador sigue DISCRIMINANDO", () => {
    // Sin esto, una regla comodin `p.startsWith("/api/")` aprobaria todas las
    // pruebas de arriba y limitaria la aplicacion entera al techo mas estricto
    // que casara primero. «Todo tiene regla» no es cobertura: es una averia que
    // se lee como un verde.
    for (const inocua of [
      "/api/health",
      "/api/os/dashboard/summary",
      "/api/saas/settings/profile",
    ]) {
      expect(getRateLimitRule(inocua), inocua).toBeNull();
    }
  });

  it("/health sigue siendo utilizable por la infraestructura", () => {
    // Si el sondeo de Railway recibe 429, la instancia se marca caida y se
    // reinicia sola. El limite no puede alcanzarlo.
    for (const sondeo of ["/health", "/api/health", "/health/ready"]) {
      expect(getRateLimitRule(sondeo), sondeo).toBeNull();
    }
  });
});
