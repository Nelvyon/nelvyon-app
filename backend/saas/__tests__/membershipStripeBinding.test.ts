import { describe, expect, it } from "vitest";

/**
 * Binding Stripe → tenant en memberships.
 *
 * El webhook `stripe-membership` lee `tenant_id` de la metadata del evento, y
 * esa metadata NO la escribe NELVYON: las suscripciones de membership las crea
 * el Stripe del propio operador. Los tres creadores del repo están trazados y
 * ninguno escribe `metadata.tenant_id` para este webhook.
 *
 * Lo que impide que un operador reasigne una membership a otro tenant NO está
 * en el webhook: está un nivel por debajo, en la CONJUNCIÓN del UPDATE:
 *
 *     WHERE tenant_id = $1 AND stripe_subscription_id = $2
 *
 * La identidad Stripe persistida y el tenant deben coincidir. Una metadata
 * contradictoria no casa con ninguna fila. Este fichero blinda esa propiedad:
 * si alguien relajase el WHERE a solo `stripe_subscription_id`, el test A/B se
 * pone rojo.
 */
import { SaasMembershipService } from "../SaasMembershipService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "22222222-2222-4222-8222-222222222222";
const SUB_DE_A = "sub_perteneciente_a_A";

/**
 * Postgres falso que honra la condición REALMENTE presente en la sentencia.
 * Si el UPDATE deja de exigir el tenant, la fila de A pasa a ser alcanzable
 * desde B — que es justo lo que el test debe detectar.
 */
function dbFalsa() {
  const fila = {
    tenant_id: TENANT_A,
    stripe_subscription_id: SUB_DE_A,
    status: "active",
  };
  const sentencias: Array<{ sql: string; params: unknown[] }> = [];

  const port = {
    query: async (sql: string, params: unknown[] = []) => {
      sentencias.push({ sql, params });
      if (!/UPDATE saas_membership_members/i.test(sql)) return [];

      const exigeTenant = /tenant_id\s*=\s*\$\d/i.test(sql);
      const exigeSub = /stripe_subscription_id\s*=\s*\$\d/i.test(sql);
      const [tenant, sub, status] = params as [string, string, string];

      const casaTenant = !exigeTenant || tenant === fila.tenant_id;
      const casaSub = !exigeSub || sub === fila.stripe_subscription_id;
      if (casaTenant && casaSub) {
        fila.status = status;
        return [{ ...fila }]; // 1 fila afectada
      }
      return []; // 0 filas afectadas
    },
  } as unknown as SaasPostgresPort;

  return { port, fila, sentencias };
}

const svc = (d: ReturnType<typeof dbFalsa>) => new SaasMembershipService(d.port);

describe("membership — identidad Stripe y tenant deben coincidir", () => {
  it("identidad de A + metadata de A: procesa", async () => {
    const d = dbFalsa();
    await svc(d).updateMemberStatus(TENANT_A, SUB_DE_A, "cancelled");
    expect(d.fila.status).toBe("cancelled");
  });

  it("identidad de A + metadata de B: CERO filas, no muta ni A ni B", async () => {
    const d = dbFalsa();
    await svc(d).updateMemberStatus(TENANT_B, SUB_DE_A, "cancelled");
    // La membership de A conserva su estado: el operador B no la reasigna.
    expect(d.fila.status).toBe("active");
    expect(d.fila.tenant_id).toBe(TENANT_A);
  });

  it("suscripción desconocida: cero filas", async () => {
    const d = dbFalsa();
    await svc(d).updateMemberStatus(TENANT_A, "sub_que_no_existe", "cancelled");
    expect(d.fila.status).toBe("active");
  });

  it("el UPDATE exige AMBAS condiciones en el SQL", async () => {
    const d = dbFalsa();
    await svc(d).updateMemberStatus(TENANT_A, SUB_DE_A, "expired");
    const upd = d.sentencias.find((s) => /UPDATE saas_membership_members/i.test(s.sql));
    expect(upd).toBeDefined();
    // Si alguna de las dos desaparece, el binding cross-tenant queda abierto.
    expect(upd!.sql).toMatch(/tenant_id\s*=\s*\$/i);
    expect(upd!.sql).toMatch(/stripe_subscription_id\s*=\s*\$/i);
  });

  it("un tenant vacío no actúa como comodín", async () => {
    const d = dbFalsa();
    await svc(d).updateMemberStatus("", SUB_DE_A, "cancelled");
    expect(d.fila.status).toBe("active");
  });
});
