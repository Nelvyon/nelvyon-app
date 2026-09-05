/**
 * El interruptor no sustituye a la aprobacion de la pieza.
 *
 * ── LA DISTINCION QUE PROTEGE ESTA BATERIA ──────────────────────────────────
 *
 * `publicacionSocialPermitida` es una puerta de INSTALACION: decide si esta
 * instancia puede hablar con Meta. Una vez arriba, sin nada mas, saldria todo lo
 * que hubiera en la cola.
 *
 * Una agencia no aprueba «publicar» de una vez para siempre: aprueba PIEZAS. Lo
 * que se comprueba aqui es que la segunda puerta existe y que ninguna de las
 * formas obvias de saltarsela funciona.
 *
 * ── EL DOBLE COMPRUEBA LAS ENTRADAS ─────────────────────────────────────────
 *
 * `consultaFalsaCon` decide su respuesta LEYENDO el SQL y sus parametros. Una
 * aprobacion solo se devuelve si la consulta pregunta por el inquilino correcto,
 * la pieza correcta y el estado correcto. Un doble que devolviera la fila sin
 * mirar no probaria nada: pasaria igual con la puerta rota.
 *
 * COSTE EXTERNO: 0 EUR. `fetch` es un doble que revienta si alguien lo llama.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SaasSocialService } from "../SaasSocialService";
import { consultaFalsaCon, type Fila } from "../../db/__tests__/consultaFalsa";
import {
  PiezaSocialNoAprobadaError,
  huellaDelContenido,
  ACCION_DE_PUBLICACION_SOCIAL,
} from "../aprobacionDePiezaSocial";

const INQUILINO = "tenant-a";
const OTRO_INQUILINO = "tenant-b";
const PIEZA = "post-1";
const OTRA_PIEZA = "post-2";
const CONTENIDO = "Lanzamos la nueva coleccion";

const filaDePost = (contenido = CONTENIDO): Fila => ({
  id: PIEZA,
  tenant_id: INQUILINO,
  platform: "meta",
  content: contenido,
  media_urls: [],
  status: "scheduled",
  access_token: "token-del-cliente",
  page_id: "page-1",
});

/** Un `fetch` que revienta: si se publica, se sabe. */
const fetchQueNoDebeSonar = vi.fn(async (): Promise<Response> => {
  throw new Error("se publico sin aprobacion vigente");
});

type Guardada = { postId: string; tenantId: string; huella: string };

/** Base de mentira que SOLO devuelve la aprobacion si la consulta pregunta bien. */
function baseCon(aprobacion: Guardada | null, contenido = CONTENIDO) {
  return {
    query: consultaFalsaCon((sql, params) => {
      if (/FROM saas_social_posts/i.test(sql)) return [filaDePost(contenido)];
      if (/saas_private_ai_approvals/i.test(sql)) {
        if (!aprobacion) return [];
        const [tenant, accion, post] = params as string[];
        // La puerta tiene que preguntar por LOS TRES. Si se dejara alguno, este
        // doble no reconoce la consulta y no devuelve nada.
        if (tenant !== aprobacion.tenantId) return [];
        if (accion !== ACCION_DE_PUBLICACION_SOCIAL) return [];
        if (post !== aprobacion.postId) return [];
        return [{ id: "apr-1", huella: aprobacion.huella }];
      }
      return [];
    }),
  };
}

const aprobada = (over: Partial<Guardada> = {}): Guardada => ({
  postId: PIEZA,
  tenantId: INQUILINO,
  huella: huellaDelContenido(CONTENIDO),
  ...over,
});

const respuestaOk = () =>
  vi.fn(async () => new Response(JSON.stringify({ id: "ext-1" }), { status: 200 }));

beforeEach(() => {
  // Interruptor ARRIBA en toda la bateria: lo que se prueba es que no basta.
  vi.stubEnv("NELVYON_SOCIAL_PUBLISH_ENABLED", "1");
  fetchQueNoDebeSonar.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("con el interruptor arriba, la pieza aun necesita aprobacion", () => {
  it("EL CONTROL: aprobada y sin cambios, SI publica", async () => {
    // Sin este control, una puerta que bloqueara siempre pasaria todas las
    // pruebas de abajo y dejaria el producto sin poder publicar nunca.
    const fetchOk = respuestaOk();
    const svc = new SaasSocialService(baseCon(aprobada()) as never, fetchOk as never);
    const r = await svc.publishPost(INQUILINO, PIEZA);
    expect(r.ok, "una pieza aprobada tiene que poder publicarse").toBe(true);
    expect(fetchOk).toHaveBeenCalled();
  });

  it("SIN aprobacion no publica: la ausencia no es permiso", async () => {
    const svc = new SaasSocialService(baseCon(null) as never, fetchQueNoDebeSonar as never);
    await expect(svc.publishPost(INQUILINO, PIEZA)).rejects.toBeInstanceOf(
      PiezaSocialNoAprobadaError,
    );
    expect(fetchQueNoDebeSonar).not.toHaveBeenCalled();
  });

  it("la aprobacion de OTRA pieza no sirve", async () => {
    // Es la forma mas facil de saltarse una aprobacion por pieza: aprobar una
    // inocua y colar el resto.
    const svc = new SaasSocialService(
      baseCon(aprobada({ postId: OTRA_PIEZA })) as never,
      fetchQueNoDebeSonar as never,
    );
    await expect(svc.publishPost(INQUILINO, PIEZA)).rejects.toBeInstanceOf(
      PiezaSocialNoAprobadaError,
    );
    expect(fetchQueNoDebeSonar).not.toHaveBeenCalled();
  });

  it("la aprobacion de OTRO inquilino no sirve", async () => {
    const svc = new SaasSocialService(
      baseCon(aprobada({ tenantId: OTRO_INQUILINO })) as never,
      fetchQueNoDebeSonar as never,
    );
    await expect(svc.publishPost(INQUILINO, PIEZA)).rejects.toBeInstanceOf(
      PiezaSocialNoAprobadaError,
    );
    expect(fetchQueNoDebeSonar).not.toHaveBeenCalled();
  });

  it("si la pieza CAMBIO despues de aprobarse, vuelve a revision", async () => {
    // La que suele faltar: sin huella del contenido se aprueba un borrador, se
    // edita, y sale publicado algo que nadie leyo.
    const svc = new SaasSocialService(
      baseCon(aprobada(), "Texto distinto del que se aprobo") as never,
      fetchQueNoDebeSonar as never,
    );
    await expect(svc.publishPost(INQUILINO, PIEZA)).rejects.toBeInstanceOf(
      PiezaSocialNoAprobadaError,
    );
    expect(fetchQueNoDebeSonar).not.toHaveBeenCalled();
  });

  it("un espacio de mas NO invalida la aprobacion", async () => {
    // Obligar a re-aprobar por un salto de linea haria que la gente aprobara
    // sin leer, que es peor que no tener puerta.
    const conEspacios = `  ${CONTENIDO}  `;
    const svc = new SaasSocialService(
      baseCon(aprobada(), conEspacios) as never,
      respuestaOk() as never,
    );
    await expect(svc.publishPost(INQUILINO, PIEZA)).resolves.toMatchObject({ ok: true });
  });

  it("el CRON tampoco se la salta, y no marca la pieza como fallida", async () => {
    // `processDueScheduled` es el camino por el que una pieza sale SOLA. Si la
    // puerta cerrada la marcara `failed`, se perderia trabajo bueno.
    const query = consultaFalsaCon((sql) => {
      if (/UPDATE saas_social_posts AS p/i.test(sql)) return [{ id: PIEZA, tenant_id: INQUILINO }];
      if (/FROM saas_social_posts/i.test(sql)) return [filaDePost()];
      return [];
    });
    const svc = new SaasSocialService({ query } as never, fetchQueNoDebeSonar as never);

    const r = await svc.processDueScheduled();
    expect(r.published, "publico sin aprobacion desde el cron").toBe(0);
    expect(fetchQueNoDebeSonar).not.toHaveBeenCalled();

    const sqls = query.mock.calls.map((c) => String(c[0])).join(" | ");
    expect(sqls, "marco la pieza como fallida en vez de dejarla esperando").not.toMatch(
      /SET status='failed'/i,
    );
  });

  it("reintentar no la aprueba: sigue cerrada las veces que haga falta", async () => {
    const svc = new SaasSocialService(baseCon(null) as never, fetchQueNoDebeSonar as never);
    for (let intento = 0; intento < 3; intento++) {
      await expect(svc.publishPost(INQUILINO, PIEZA)).rejects.toBeInstanceOf(
        PiezaSocialNoAprobadaError,
      );
    }
    expect(fetchQueNoDebeSonar).not.toHaveBeenCalled();
  });
});
