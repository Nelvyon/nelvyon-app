"use client";

import Link from "next/link";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import {
  NelvyonDsSectionHeader,
  NelvyonDsCard,
  NelvyonDsBadge,
} from "@/design-system/components";

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE_URL = "https://app.nelvyon.com/api/public/v1";

const ENDPOINTS = [
  { method: "GET",  path: "/contacts",         scope: "crm.read",      desc: "Listar contactos (paginado)" },
  { method: "POST", path: "/contacts",         scope: "crm.write",     desc: "Crear contacto" },
  { method: "GET",  path: "/deals",            scope: "pipeline.read", desc: "Listar deals (paginado)" },
  { method: "GET",  path: "/campaigns",        scope: "campaigns.read",desc: "Listar campañas email" },
  { method: "POST", path: "/workflows/trigger",scope: "crm.write",     desc: "Ejecutar workflow manual" },
] as const;

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
const METHOD_STYLE: Record<Method, string> = {
  GET:    "bg-green-500/10 text-green-400",
  POST:   "bg-blue-500/10 text-blue-400",
  PUT:    "bg-yellow-500/10 text-yellow-400",
  DELETE: "bg-red-500/10 text-red-400",
  PATCH:  "bg-orange-500/10 text-orange-400",
};

const SCOPES = [
  { scope: "crm.read",       desc: "Leer contactos" },
  { scope: "crm.write",      desc: "Crear/editar contactos y ejecutar workflows" },
  { scope: "pipeline.read",  desc: "Leer deals" },
  { scope: "pipeline.write", desc: "Crear/editar deals" },
  { scope: "campaigns.read", desc: "Leer campañas" },
  { scope: "*",              desc: "Acceso completo (todos los scopes)" },
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SaasDevelopersPage() {
  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="api-keys" />}>
      <div className="flex flex-col gap-8 pb-12 max-w-4xl">
        <div className="flex items-start justify-between gap-4">
          <NelvyonDsSectionHeader
            title="Portal del Desarrollador"
            subtitle={`API REST v1 · Base URL: ${BASE_URL}`}
          />
          <Link
            href="/saas/api-keys"
            className="shrink-0 rounded-lg border border-border px-4 py-2 text-sm text-primary hover:bg-primary/10 transition-colors"
          >
            ← Mis API Keys
          </Link>
        </div>

        {/* Auth */}
        <NelvyonDsCard className="p-5 flex flex-col gap-3">
          <p className="text-sm font-semibold text-foreground">Autenticación</p>
          <p className="text-xs text-muted-foreground">
            Genera una API key en{" "}
            <Link href="/saas/api-keys" className="text-primary hover:underline">
              /saas/api-keys
            </Link>{" "}
            y envíala en cada petición via header{" "}
            <code className="rounded bg-muted/20 px-1 py-0.5 font-mono text-xs">Authorization</code>:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-muted/20 px-4 py-3 text-xs font-mono text-foreground">
{`curl "${BASE_URL}/contacts" \\
  -H "Authorization: Bearer nlv_<tu_api_key>" \\
  -H "Content-Type: application/json"`}
          </pre>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>Rate limit: <strong className="text-foreground">60 req/min</strong> por key</span>
            <span>·</span>
            <span>Header de respuesta: <code className="font-mono">X-RateLimit-Remaining</code></span>
          </div>
        </NelvyonDsCard>

        {/* Endpoints table */}
        <NelvyonDsCard className="overflow-hidden p-0">
          <div className="border-b border-border bg-muted/10 px-5 py-3">
            <p className="text-sm font-semibold text-foreground">Endpoints disponibles</p>
          </div>
          <div className="divide-y divide-border">
            {ENDPOINTS.map(ep => (
              <div key={ep.method + ep.path} className="flex items-center gap-3 px-5 py-3 flex-wrap">
                <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-bold ${METHOD_STYLE[ep.method as Method]}`}>
                  {ep.method}
                </span>
                <code className="flex-1 min-w-[180px] text-xs font-mono text-foreground">
                  {BASE_URL}{ep.path}
                </code>
                <span className="text-xs font-mono rounded bg-muted/20 px-2 py-0.5 text-muted-foreground shrink-0">
                  {ep.scope}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">{ep.desc}</span>
              </div>
            ))}
          </div>
        </NelvyonDsCard>

        {/* Scopes */}
        <NelvyonDsCard className="p-5 flex flex-col gap-3">
          <p className="text-sm font-semibold text-foreground">Scopes disponibles</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {SCOPES.map(s => (
              <div key={s.scope} className="flex items-center gap-2 text-xs">
                <NelvyonDsBadge tone="neutral">
                  <code className="font-mono">{s.scope}</code>
                </NelvyonDsBadge>
                <span className="text-muted-foreground">{s.desc}</span>
              </div>
            ))}
          </div>
        </NelvyonDsCard>

        {/* Examples */}
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-foreground">Ejemplos</p>
          {EXAMPLES.map(ex => (
            <NelvyonDsCard key={ex.title} className="p-5 flex flex-col gap-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{ex.title}</p>
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">Request:</p>
                <pre className="overflow-x-auto rounded-lg bg-muted/20 px-4 py-3 text-xs font-mono text-foreground">{ex.curl}</pre>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">Response:</p>
                <pre className="overflow-x-auto rounded-lg bg-muted/20 px-4 py-3 text-xs font-mono text-green-400/90">{ex.response}</pre>
              </div>
            </NelvyonDsCard>
          ))}
        </div>

        {/* SDK placeholder */}
        <NelvyonDsCard className="p-5 flex items-center gap-4 bg-primary/5 border-primary/20">
          <div className="text-3xl">📦</div>
          <div>
            <p className="text-sm font-semibold text-foreground">OpenAPI Spec disponible</p>
            <p className="text-xs text-muted-foreground mt-1">
              Descarga la especificación OpenAPI 3.1 para generar SDKs con{" "}
              <code className="font-mono">openapi-generator</code> o importar en Postman/Insomnia.
            </p>
            <a
              href="/docs/openapi/saas-public-v1.yaml"
              download
              className="mt-2 inline-block text-xs text-primary hover:underline"
            >
              ↓ saas-public-v1.yaml
            </a>
          </div>
        </NelvyonDsCard>
      </div>
    </SaasShellLayout>
  );
}
