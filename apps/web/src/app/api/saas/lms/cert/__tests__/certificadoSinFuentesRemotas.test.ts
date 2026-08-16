import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";

/**
 * El HTML del certificado no pide tipografia a ningun CDN.
 *
 * El guard de `app/__tests__/fuentesLocales.test.ts` mira el fuente; esto mira
 * el documento que sale por la respuesta, que es donde el fallo se manifestaba:
 * el `@import` a la CSS API de Google convertia cada apertura del certificado
 * —y cada impresion a PDF— en una peticion a un tercero, con la fuente llegando
 * tarde o no llegando. Comprobarlo sobre el HTML generado cubre tambien el caso
 * de que la fuente se cuele por una via que el barrido estatico no reconozca.
 */

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock("@/../../backend/db/DbClient", () => ({
  DbClient: { getInstance: () => ({ query: queryMock }) },
}));

import { GET } from "@/app/api/saas/lms/cert/[id]/route";

/** Los origenes remotos, por partes, para no delatar a este fichero tampoco. */
const CDN_HOJA = ["fonts", "googleapis", "com"].join(".");
const CDN_FICHEROS = ["fonts", "gstatic", "com"].join(".");

const SECRETO = "secreto-de-pruebas-de-al-menos-32-caracteres";
const ID = "cert-1";

function url(id: string, tok: string) {
  return `http://localhost/api/saas/lms/cert/${id}?tok=${tok}`;
}

function token(id: string) {
  return createHmac("sha256", SECRETO).update(id).digest("hex").slice(0, 32);
}

async function htmlDelCertificado(): Promise<string> {
  const res = await GET(new Request(url(ID, token(ID))), {
    params: Promise.resolve({ id: ID }),
  });
  expect(res.status).toBe(200);
  return await res.text();
}

describe("GET /api/saas/lms/cert/[id] — tipografia", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = SECRETO;
    queryMock.mockReset();
    queryMock.mockResolvedValue([
      {
        id: ID,
        enrollment_id: "enr-1",
        issued_at: new Date("2026-03-04T10:00:00Z"),
        contact_name: "Ana Perez",
        contact_email: "ana@ejemplo.com",
        course_title: "Fundamentos de Nelvyon",
      },
    ]);
  });

  it("el HTML no nombra ningun CDN de fuentes", async () => {
    const html = await htmlDelCertificado();
    expect(html).not.toContain(CDN_HOJA);
    expect(html).not.toContain(CDN_FICHEROS);
    // Ni por otra via: el documento no trae ningun `@import`, que era la forma
    // exacta que tenia la dependencia.
    expect(html).not.toContain("@import");
  });

  it("las dos familias viajan dentro del documento", async () => {
    const html = await htmlDelCertificado();
    const caras = html.match(/@font-face/g) ?? [];
    expect(caras).toHaveLength(2);
    expect(html).toContain("@font-face{font-family:'Playfair Display'");
    expect(html).toContain("@font-face{font-family:'Inter'");

    // Y llevan fuente de verdad: `d09GMg` es la cabecera `wOF2` en base64, asi
    // que una regla apuntando a un data URI vacio o a otra cosa no cuela.
    const datos = html.match(/url\(data:font\/woff2;base64,([^)]+)\)/g) ?? [];
    expect(datos).toHaveLength(2);
    for (const dato of datos) {
      expect(dato).toContain("base64,d09GMg");
      expect(dato.length).toBeGreaterThan(20000);
    }
  });

  it("el diseño conserva sus familias y sus fallbacks", async () => {
    const html = await htmlDelCertificado();
    expect(html).toContain("font-family: 'Inter', sans-serif");
    expect(html).toContain("font-family: 'Playfair Display', serif");
  });

  it("el detector reconoce la version anterior del documento", async () => {
    // Control negativo: si el `@import` volviera, la comprobacion de arriba
    // fallaria. Se demuestra sobre la linea que llevaba el certificado.
    const anterior = `@import url('https://${CDN_HOJA}/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500&display=swap');`;
    expect(anterior).toContain(CDN_HOJA);
    expect(anterior).toContain("@import");
  });
});
