// El PUT que habia aqui proxyaba a `PUT /api/os/store/projects/{id}`, endpoint
// que NUNCA existio en `os_store_builder.py` —define POST, GET, generate,
// publish, products y delete, pero ningun PUT sobre el proyecto—. Devolvia 404
// siempre y no lo invocaba nadie desde la UI, asi que no habia funcionalidad que
// perder: solo una promesa que el backend nunca hizo.
//
// Si algun dia hace falta actualizar un proyecto, primero se implementa el
// endpoint upstream y luego se anade aqui. Lo vigila
// `backend/tests/test_bff_upstream_existe.py`.

import { EMPTY_STORE, ecommerceBffGet } from "@/lib/ecommerceBffRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  return ecommerceBffGet(req, `/api/os/store/projects/${id}`, EMPTY_STORE);
}
