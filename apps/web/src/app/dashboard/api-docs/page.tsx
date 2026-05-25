"use client";

import { BookOpen, Play, Webhook } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PUBLIC_ENDPOINTS, publicApiClient } from "@/features/public-api/api";

const SECTIONS = ["auth", "endpoints", "webhooks", "sdk", "playground"] as const;

export default function ApiDocsPage() {
  const [section, setSection] = useState<(typeof SECTIONS)[number]>("auth");
  const [events, setEvents] = useState<string[]>([]);
  const [playKey, setPlayKey] = useState("");
  const [playPath, setPlayPath] = useState("/contacts");
  const [playMethod, setPlayMethod] = useState("GET");
  const [playBody, setPlayBody] = useState('{"name":"Test"}');
  const [playResult, setPlayResult] = useState("");

  useEffect(() => {
    publicApiClient.webhookEvents().then((r) => setEvents(r.events ?? [])).catch(() => undefined);
  }, []);

  async function runPlayground() {
    if (!playKey) return;
    const ep = PUBLIC_ENDPOINTS.find((e) => e.path === playPath && e.method === playMethod);
    let body: unknown;
    if (playMethod !== "GET" && playBody.trim()) {
      try {
        body = JSON.parse(playBody);
      } catch {
        setPlayResult("JSON inválido en body");
        return;
      }
    }
    const r = await publicApiClient.playground(playKey, playMethod, playPath, body);
    setPlayResult(JSON.stringify(r, null, 2));
  }

  return (
    <ProtectedLayout module="settings">
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BookOpen className="h-6 w-6" />
            API pública NELVYON
          </h1>
          <p className="text-sm text-muted-foreground">
            Documentación estilo Stripe para integraciones externas. Base:{" "}
            <code className="text-xs">/api/public/v1/</code>
          </p>
          <Link className="text-sm text-primary underline" href="/dashboard/api-keys">
            Gestionar API Keys →
          </Link>
        </header>

        <nav className="flex flex-wrap gap-2 border-b pb-2">
          {SECTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm capitalize ${section === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              onClick={() => setSection(s)}
            >
              {s}
            </button>
          ))}
        </nav>

        {section === "auth" && (
          <section className="prose prose-sm dark:prose-invert max-w-none">
            <h2>Autenticación</h2>
            <p>
              Usa el header <code>X-API-Key</code> con una clave <code>nlv_…</code> generada en el
              dashboard. No uses JWT en la API pública.
            </p>
            <pre className="rounded-lg bg-muted p-4 text-xs">{`curl -H "X-API-Key: nlv_your_key" \\
  https://api.nelvyon.com/api/public/v1/contacts`}</pre>
            <p>Límite: 1000 solicitudes/hora por key (Redis).</p>
          </section>
        )}

        {section === "endpoints" && (
          <section className="space-y-4">
            {PUBLIC_ENDPOINTS.map((ep) => (
              <article className="rounded-xl border bg-card p-4" key={`${ep.method}${ep.path}`}>
                <p className="font-mono text-sm">
                  <span className="rounded bg-primary/15 px-2 py-0.5 text-xs">{ep.method}</span>{" "}
                  {ep.path}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Scope: {ep.scope}</p>
                {"body" in ep && ep.body && (
                  <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">
                    {JSON.stringify(ep.body, null, 2)}
                  </pre>
                )}
                <details className="mt-2 text-xs">
                  <summary>JavaScript</summary>
                  <pre className="mt-1 rounded bg-muted p-2">{`const nelvyon = NelvyonSDK({ apiKey: "nlv_..." });
await nelvyon.${ep.scope === "contacts" && ep.method === "POST" ? "contacts.create" : ep.scope === "contacts" ? "contacts.list()" : ep.scope === "campaigns" ? "campaigns.send(1)" : ep.scope === "chatbot" ? 'chatbot.message({ chatbot_id: "...", message: "Hola" })' : ep.scope === "forms" ? 'forms.submit("form-id", { email: "a@b.com" })' : ep.scope === "analytics" && ep.method === "POST" ? 'events.track("page_view", { page: "/home" })' : ep.scope === "analytics" ? "analytics.summary()" : 'workflows.trigger("contact_created", {})'}(${ep.method === "GET" ? "" : ep.scope === "contacts" && ep.method === "POST" ? JSON.stringify(ep.body) : ""});`}</pre>
                </details>
                <details className="mt-2 text-xs">
                  <summary>Python</summary>
                  <pre className="mt-1 rounded bg-muted p-2">{`import requests
r = requests.${ep.method.toLowerCase()}(
    "https://api.nelvyon.com/api/public/v1${ep.path.split("?")[0]}",
    headers={"X-API-Key": "nlv_...", "Content-Type": "application/json"},${"body" in ep && ep.body ? `\n    json=${JSON.stringify(ep.body)},` : ""}
)
print(r.json())`}</pre>
                </details>
                <details className="mt-2 text-xs">
                  <summary>cURL</summary>
                  <pre className="mt-1 rounded bg-muted p-2">{`curl -X ${ep.method} \\
  -H "X-API-Key: nlv_..." \\
  -H "Content-Type: application/json" \\
  ${"body" in ep && ep.body ? `-d '${JSON.stringify(ep.body)}' \\\n  ` : ""}https://api.nelvyon.com/api/public/v1${ep.path.replace(/\?.*/, "")}`}</pre>
                </details>
              </article>
            ))}
          </section>
        )}

        {section === "webhooks" && (
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 font-semibold">
              <Webhook className="h-5 w-5" />
              Webhooks salientes
            </h2>
            <p className="text-sm text-muted-foreground">
              HMAC-SHA256 en header <code>X-Nelvyon-Signature</code>. 3 reintentos con backoff
              exponencial.
            </p>
            <ul className="list-inside list-disc text-sm">
              {events.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            <p className="text-sm">
              Registra endpoints en{" "}
              <Link className="underline" href="/dashboard/api-keys">
                API Keys
              </Link>{" "}
              o vía <code>POST /api/webhooks/endpoints</code> (JWT admin).
            </p>
          </section>
        )}

        {section === "sdk" && (
          <section className="space-y-3">
            <h2 className="font-semibold">SDK JavaScript</h2>
            <pre className="rounded-lg bg-muted p-4 text-xs">{`<script src="https://nelvyon.com/sdk/nelvyon.js"></script>
<script>
  const nelvyon = NelvyonSDK({ apiKey: "nlv_...", baseUrl: "" });
  nelvyon.contacts.create({ name: "Ana", email: "ana@co.com" });
  nelvyon.events.track("signup", { plan: "pro" });
</script>`}</pre>
          </section>
        )}

        {section === "playground" && (
          <section className="rounded-xl border bg-card p-5 space-y-3">
            <h2 className="flex items-center gap-2 font-semibold">
              <Play className="h-5 w-5" />
              Playground
            </h2>
            <input
              className="w-full rounded border bg-background px-3 py-2 font-mono text-xs"
              placeholder="X-API-Key nlv_..."
              value={playKey}
              onChange={(e) => setPlayKey(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <select
                className="rounded border bg-background px-2 py-1 text-sm"
                value={playMethod}
                onChange={(e) => setPlayMethod(e.target.value)}
              >
                <option>GET</option>
                <option>POST</option>
              </select>
              <select
                className="min-w-[200px] flex-1 rounded border bg-background px-2 py-1 text-sm font-mono"
                value={playPath}
                onChange={(e) => setPlayPath(e.target.value)}
              >
                {PUBLIC_ENDPOINTS.map((ep) => (
                  <option key={`${ep.method}${ep.path}`} value={ep.path.split("?")[0]}>
                    {ep.method} {ep.path}
                  </option>
                ))}
              </select>
            </div>
            {playMethod === "POST" && (
              <textarea
                className="h-24 w-full rounded border bg-background p-2 font-mono text-xs"
                value={playBody}
                onChange={(e) => setPlayBody(e.target.value)}
              />
            )}
            <Button onClick={runPlayground}>Ejecutar</Button>
            {playResult && (
              <pre className="max-h-64 overflow-auto rounded bg-muted p-3 text-xs">{playResult}</pre>
            )}
          </section>
        )}
      </div>
    </ProtectedLayout>
  );
}
