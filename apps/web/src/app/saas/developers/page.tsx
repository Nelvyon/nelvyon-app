"use client";

/**
 * /saas/developers sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: autenticación, endpoints, scopes, ejemplos y descarga de la spec ->
 * `W3crmContentBox`; la tabla de endpoints -> `W3crmDataTable`. Sin
 * componentes nuevos.
 *
 * Inventario: sin `data-testid` y sin spec dedicado — lo cubre
 * `saas-nav-full-coverage`. Verificado con grep que ningún spec hace
 * aserciones de texto ni de rol sobre esta ruta, así que no hay contratos que
 * preservar más allá de que la página cargue.
 *
 * Es una pantalla de documentación estática: no hace fetch, no tiene estado y
 * no expone secretos —las claves reales viven en `/saas/api-keys`, a donde
 * enlaza—. Se conservan literales la `BASE_URL`, los cinco endpoints con su
 * método y scope, los seis scopes, los tres ejemplos con su curl y su
 * respuesta, los límites de rate limit y la descarga de la spec OpenAPI.
 */
import Link from "next/link";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmContentBox, W3crmDataTable } from "@/features/saas-w3crm/components/W3crmContentBox";

const BASE_URL = "https://app.nelvyon.com/api/public/v1";

const ENDPOINTS = [
  { method: "GET", path: "/contacts", scope: "crm.read", desc: "Listar contactos (paginado)" },
  { method: "POST", path: "/contacts", scope: "crm.write", desc: "Crear contacto" },
  { method: "GET", path: "/deals", scope: "pipeline.read", desc: "Listar deals (paginado)" },
  { method: "GET", path: "/campaigns", scope: "campaigns.read", desc: "Listar campañas email" },
  { method: "POST", path: "/workflows/trigger", scope: "crm.write", desc: "Ejecutar workflow manual" },
] as const;

const METHOD_BADGE: Record<string, string> = {
  GET: "badge-success",
  POST: "badge-primary",
  PUT: "badge-warning",
  DELETE: "badge-danger",
  PATCH: "badge-warning",
};
/** Un método fuera de catálogo pintaba una clase `undefined`. */
function methodBadge(m: string): string {
  return METHOD_BADGE[m] ?? "badge-secondary";
}

const SCOPES = [
  { scope: "crm.read", desc: "Leer contactos" },
  { scope: "crm.write", desc: "Crear/editar contactos y ejecutar workflows" },
  { scope: "pipeline.read", desc: "Leer deals" },
  { scope: "pipeline.write", desc: "Crear/editar deals" },
  { scope: "campaigns.read", desc: "Leer campañas" },
  { scope: "*", desc: "Acceso completo (todos los scopes)" },
];

const EXAMPLES = [
  {
    title: "Listar contactos",
    curl: `curl "${BASE_URL}/contacts?page=1&limit=25" \\
  -H "Authorization: Bearer nlv_tu_api_key"`,
    response: `{
  "data": [{ "id": "...", "name": "Ana García", "email": "ana@empresa.com" }],
  "total": 142,
  "page": 1,
  "limit": 25
}`,
  },
  {
    title: "Crear contacto",
    curl: `curl -X POST "${BASE_URL}/contacts" \\
  -H "Authorization: Bearer nlv_tu_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Carlos López","email":"carlos@empresa.com","status":"lead"}'`,
    response: `{
  "id": "uuid-...",
  "name": "Carlos López",
  "email": "carlos@empresa.com",
  "status": "lead",
  "createdAt": "2026-06-25T10:00:00Z"
}`,
  },
  {
    title: "Ejecutar workflow",
    curl: `curl -X POST "${BASE_URL}/workflows/trigger" \\
  -H "Authorization: Bearer nlv_tu_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"workflowId":"uuid-workflow","data":{"contact":{"id":"uuid-contact"}}}'`,
    response: `{
  "id": "uuid-run",
  "workflowId": "uuid-workflow",
  "status": "completed",
  "stepsExecuted": [{"action":"notify","ok":true}]
}`,
  },
];

export default function SaasDevelopersPage() {
  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Portal del Desarrollador" parentTitle="Cuenta" pageTitle="Developers" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              API REST v1 · Base URL: <code>{BASE_URL}</code>
            </p>

            <W3crmContentBox
              titulo="Autenticación"
              icono="fa-solid fa-key"
              acciones={
                <Link href="/saas/api-keys" className="btn btn-primary light btn-sm me-2">
                  Mis API Keys
                </Link>
              }
            >
              <p className="fs-14 text-muted">
                Genera una API key en <Link href="/saas/api-keys">/saas/api-keys</Link> y envíala en cada
                petición vía header <code>Authorization</code>:
              </p>
              <pre className="bg-light border rounded p-3 mb-3" style={{ overflowX: "auto" }}>
{`curl "${BASE_URL}/contacts" \\
  -H "Authorization: Bearer nlv_<tu_api_key>" \\
  -H "Content-Type: application/json"`}
              </pre>
              <p className="fs-12 text-muted mb-0">
                Rate limit: <strong>según plan (10–1.000 req/s)</strong> por key · Header de respuesta:{" "}
                <code>X-RateLimit-Remaining</code>
              </p>
            </W3crmContentBox>

            <W3crmContentBox titulo="Endpoints disponibles" icono="fa-solid fa-code">
              <W3crmDataTable
                filas={[...ENDPOINTS]}
                etiqueta="endpoints"
                wrapperId="dev_endpoints_wrapper"
                porPagina={10}
                columnas={[{ titulo: "Método" }, { titulo: "Endpoint" }, { titulo: "Scope" }, { titulo: "Descripción", alFinal: true }]}
                render={(ep) => (
                  <tr key={`${ep.method}${ep.path}`}>
                    <td><span className={`badge ${methodBadge(ep.method)}`}>{ep.method}</span></td>
                    <td><code className="fs-12 text-break">{BASE_URL}{ep.path}</code></td>
                    <td><code className="fs-12">{ep.scope}</code></td>
                    <td className="text-end text-muted">{ep.desc}</td>
                  </tr>
                )}
              />
            </W3crmContentBox>

            <W3crmContentBox titulo="Scopes disponibles" icono="fa-solid fa-shield-halved">
              <div className="row">
                {SCOPES.map((s) => (
                  <div className="col-sm-6" key={s.scope}>
                    <p className="mb-2">
                      <span className="badge badge-secondary me-2"><code>{s.scope}</code></span>
                      <span className="text-muted fs-12">{s.desc}</span>
                    </p>
                  </div>
                ))}
              </div>
            </W3crmContentBox>

            {EXAMPLES.map((ex) => (
              <W3crmContentBox key={ex.title} titulo={ex.title} icono="fa-solid fa-terminal" defaultOpen={false}>
                <p className="fs-12 text-muted mb-1">Request:</p>
                <pre className="bg-light border rounded p-3 mb-3" style={{ overflowX: "auto" }}>{ex.curl}</pre>
                <p className="fs-12 text-muted mb-1">Response:</p>
                <pre className="bg-light border rounded p-3 mb-0" style={{ overflowX: "auto" }}>{ex.response}</pre>
              </W3crmContentBox>
            ))}

            <W3crmContentBox titulo="OpenAPI Spec v1" icono="fa-solid fa-file-code">
              <p className="fs-14 text-muted">
                Descarga la especificación OpenAPI 3.1 para generar clientes con{" "}
                <code>openapi-generator</code> o importar en Postman/Insomnia.
              </p>
              <a className="btn btn-primary btn-sm" href="/api/public/v1/openapi" download="saas-public-v1.yaml">
                Descargar saas-public-v1.yaml
              </a>
            </W3crmContentBox>
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
