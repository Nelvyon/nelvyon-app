/**
 * BLOQUE 7 · el inquilino de un certificado no lo elige quien lo pide.
 *
 * `POST /api/os/certificates/issue` hace tres cosas bien y una mal:
 *
 *   1. `requirePlatformClaims` — comprueba que haya sesión. Bien.
 *   2. `requireOsWorkspaceAccess` — comprueba el workspace. Bien.
 *   3. `packRunBelongsToWorkspace` — comprueba que el pack run sea SUYO. Bien.
 *   4. `tenantId: body.tenantId ?? null` — **se lo cree**.
 *
 * El `workspaceId` que se graba sale del pack run verificado; el `tenantId`, del
 * cuerpo de la petición. Dos campos hermanos que identifican al dueño, uno
 * derivado y el otro regalado.
 *
 * Y no es un campo decorativo: `filtroCert` acota los listados por `tenant_id`,
 * así que un certificado sellado con el inquilino de otro **aparece en el
 * listado de ese otro**. Un atacante con acceso legítimo a un pack run propio
 * puede inyectar un certificado de entrega falsificado en la cuenta de otro
 * cliente. En un producto que vende el certificado como prueba del trabajo
 * hecho, eso no es un detalle.
 *
 * Es mass assignment de manual: comprobar la pertenencia de UN campo y confiar
 * en el de al lado.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const emitido: Array<{ packRunId: string; opts: { tenantId?: string | null } }> = [];

vi.mock("@/lib/platformBffAuth", () => ({
  requirePlatformClaims: vi.fn(async () => ({
    userId: "u-atacante",
    tenantId: "tenant-DEL-ATACANTE",
    email: "a@ejemplo.test",
    plan: "pro",
  })),
}));

vi.mock("@/lib/osWorkspaceScope", () => ({
  requireOsWorkspaceAccess: vi.fn(async () => ({ workspaceId: 4242 })),
  packRunBelongsToWorkspace: vi.fn(async () => true),
  notFoundResponse: () => new Response(null, { status: 404 }),
}));

vi.mock("@nelvyon/saas", () => ({
  getOsDeliveryCertificateService: () => ({
    issueCertificate: vi.fn(async (packRunId: string, opts: { tenantId?: string | null }) => {
      emitido.push({ packRunId, opts });
      return { id: "cert-1", packRunId, tenantId: opts.tenantId ?? null };
    }),
  }),
  OsDeliveryCertError: class extends Error {
    constructor(public code: string, msg: string) {
      super(msg);
    }
  },
}));

import { POST } from "../route";

function peticion(cuerpo: Record<string, unknown>): Request {
  return new Request("https://nelvyon.test/api/os/certificates/issue", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

beforeEach(() => {
  emitido.length = 0;
});

describe("BLOQUE 7 · sellar un certificado con el inquilino de otro", () => {
  it("EL CONTROL: sin `tenantId` en el cuerpo, el certificado se emite igual", async () => {
    // Sin esto, una ruta que rechazara todo pasaría el ataque de abajo y
    // dejaría la emisión de certificados rota.
    const r = await POST(peticion({ packRunId: "run-propio" }));
    expect(r.status).toBe(200);
    expect(emitido).toHaveLength(1);
  });

  it("el `tenantId` del cuerpo NO llega al certificado", async () => {
    /**
     * El ataque. Usuario legítimo, pack run legítimo suyo, y un `tenantId`
     * apuntando a otro cliente en el cuerpo.
     *
     * Si ese valor llega al servicio, el certificado se graba atribuido a la
     * víctima y aparece en sus listados.
     */
    await POST(
      peticion({ packRunId: "run-propio", tenantId: "tenant-DE-LA-VICTIMA" }),
    );

    expect(emitido).toHaveLength(1);
    expect(
      emitido[0].opts.tenantId,
      "el inquilino del cuerpo se grabo en el certificado: se puede sellar a nombre de otro cliente",
    ).not.toBe("tenant-DE-LA-VICTIMA");
  });

  it("el inquilino que se graba es el de la SESIÓN verificada", async () => {
    /**
     * No basta con ignorar el valor hostil: hay que poner el correcto. El
     * `workspaceId` ya sale del pack run verificado; su campo hermano tiene que
     * salir de la misma clase de fuente, no del cliente.
     */
    await POST(peticion({ packRunId: "run-propio", tenantId: "tenant-DE-LA-VICTIMA" }));
    expect(
      emitido[0].opts.tenantId,
      "el certificado no quedo atribuido al inquilino de la sesion",
    ).toBe("tenant-DEL-ATACANTE");
  });

  it("intentarlo con mayúsculas o espacios tampoco cuela", async () => {
    // Un filtro que se pudiera esquivar cambiando el formato no sería un filtro.
    for (const hostil of [" tenant-DE-LA-VICTIMA ", "TENANT-DE-LA-VICTIMA", "tenant-DE-LA-VICTIMA\n"]) {
      emitido.length = 0;
      await POST(peticion({ packRunId: "run-propio", tenantId: hostil }));
      expect(
        emitido[0].opts.tenantId,
        `se colo un inquilino ajeno disfrazado: ${JSON.stringify(hostil)}`,
      ).toBe("tenant-DEL-ATACANTE");
    }
  });
});
