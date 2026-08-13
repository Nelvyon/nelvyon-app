import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { SERVICE_PACK_CATALOG } from "@/lib/saas/servicePacksCatalog";

/**
 * Catalogo de service packs.
 *
 * POR QUE APARECE AHORA
 * ---------------------
 * `e2e/local-pack-smoke.spec.ts` consultaba esta ruta desde hace tiempo y la
 * ruta no existia. El test se saltaba en silencio porque su condicion de salto
 * incluia 404 y 410 junto a los codigos de autenticacion, asi que un endpoint
 * ausente era indistinguible de uno protegido. Se vio al auditar el unico
 * `skipped` de la suite E2E.
 *
 * Se expone lo mismo que ya publica la pagina `/saas/packs`: identificador,
 * slug, nombre y disponibilidad. No añade informacion que no fuera publica; solo
 * la hace consultable por el contrato que el test ya daba por hecho.
 *
 * La proteccion es la de sus hermanas bajo `/api/os/`: `requirePlatformClaims`.
 * Devolver el catalogo sin autenticar seria ampliar la superficie, y el objetivo
 * aqui es cerrar un falso verde, no abrir una puerta.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const packs = SERVICE_PACK_CATALOG.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    availability: p.availability,
  }));

  return NextResponse.json({ packs });
}
