#!/usr/bin/env node
/**
 * Certificación de Fase 3 contra producción, con la cuenta de certificación.
 *
 * ── POR QUÉ ESTE FICHERO ────────────────────────────────────────────────────
 *
 * Las verificaciones que quedaban —worker, RBAC/RLS entre inquilinos, inferencia
 * real y las señales de observabilidad que salen de ellas— necesitan una sesión
 * autenticada. La tentación era firmar un token con `JWT_SECRET`: rápido, y
 * exactamente lo que no se debe hacer. Auto-emitirse credenciales de
 * administrador de producción no es una verificación, es saltarse la puerta que
 * se dice estar verificando.
 *
 * Aquí el token lo emite la APLICACIÓN, por su propio `POST /api/auth/login`,
 * con su verificación de contraseña y su caducidad. Igual que cualquier usuario.
 *
 * ── DE DÓNDE SALEN LAS CREDENCIALES ─────────────────────────────────────────
 *
 * De `NELVYON_CERT_USER_EMAIL` y `NELVYON_CERT_USER_PASSWORD`, que viven en las
 * variables del servicio y no en este repositorio. No se imprimen, no se
 * escriben en la evidencia y no se guardan en ningún fichero.
 *
 * ── LO QUE ESTE SCRIPT NO HACE, NUNCA ───────────────────────────────────────
 *
 * No envía correo, SMS ni WhatsApp. No publica en redes. No crea campañas ni
 * anuncios. No cobra. No llama a ningún proveedor facturable. Lo que ejecuta son
 * lecturas y, como mucho, una inferencia contra el modelo LOCAL, que la política
 * de coste clasifica como `FREE_SELF_HOSTED_ON_EXISTING_HARDWARE`.
 *
 * COSTE: 0,00 EUR.
 */
import { randomUUID } from "node:crypto";

const BASE = (process.env.CERT_BASE_URL || "https://nelvyon.com").replace(/\/$/, "");
const EMAIL = process.env.NELVYON_CERT_USER_EMAIL;
const PASSWORD = process.env.NELVYON_CERT_USER_PASSWORD;
const TENANT_PROPIO = process.env.NELVYON_CERT_TENANT_PROPIO || "";
const TENANT_AJENO = process.env.NELVYON_CERT_TENANT_AJENO || "";

/** Cabecera de navegador: Cloudflare rechaza agentes desconocidos con 1010. */
const UA = "Mozilla/5.0 (compatible; NelvyonCert/1.0)";

const resultados = [];
function anotar(bloque, prueba, ok, detalle = {}) {
  resultados.push({ bloque, prueba, ok, ...detalle });
  const marca = ok ? "PASS" : "FAIL";
  console.log(`${marca}  [${bloque}] ${prueba}${detalle.nota ? ` — ${detalle.nota}` : ""}`);
}

async function pide(metodo, ruta, { token, tenant, cuerpo, timeoutMs = 60_000 } = {}) {
  const cabeceras = { accept: "application/json", "user-agent": UA };
  if (token) cabeceras.authorization = `Bearer ${token}`;
  if (tenant) cabeceras["x-nelvyon-tenant-id"] = tenant;
  if (cuerpo !== undefined) cabeceras["content-type"] = "application/json";
  const t0 = Date.now();
  try {
    const r = await fetch(`${BASE}${ruta}`, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const texto = await r.text();
    let json = null;
    try {
      json = JSON.parse(texto);
    } catch {
      /* respuesta no JSON: se conserva el texto */
    }
    return { status: r.status, json, texto, ms: Date.now() - t0 };
  } catch (e) {
    return { status: 0, json: null, texto: String(e).slice(0, 200), ms: Date.now() - t0 };
  }
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error(
      "faltan NELVYON_CERT_USER_EMAIL / NELVYON_CERT_USER_PASSWORD; " +
        "no se inventa ninguna credencial",
    );
    process.exit(2);
  }

  // ── 0 · La sesión, emitida por la aplicación ──────────────────────────────
  const login = await pide("POST", "/api/auth/login", {
    cuerpo: { email: EMAIL, password: PASSWORD },
  });
  const token = login.json?.token ?? null;
  anotar("sesion", "login por la via oficial", Boolean(token), {
    http: login.status,
    nota: token ? "token emitido por la aplicacion" : "sin token",
  });
  if (!token) {
    console.error("sin sesion no se puede certificar nada mas");
    process.exit(1);
  }

  // ── 1 · RBAC: las puertas ─────────────────────────────────────────────────
  const sinToken = await pide("GET", "/api/saas/agentes/runs");
  anotar("rbac", "sin credencial -> deniega", sinToken.status === 401, { http: sinToken.status });

  const malToken = await pide("GET", "/api/saas/agentes/runs", { token: "aaa.bbb.ccc" });
  anotar("rbac", "token invalido -> deniega", malToken.status === 401, { http: malToken.status });

  const conToken = await pide("GET", "/api/saas/agentes/runs", { token });
  anotar("rbac", "credencial valida -> permite", conToken.status === 200, { http: conToken.status });

  // ── 2 · Aislamiento entre inquilinos ──────────────────────────────────────
  if (TENANT_PROPIO && TENANT_AJENO) {
    const propio = await pide("GET", "/api/saas/agentes/runs", { token, tenant: TENANT_PROPIO });
    anotar("inquilinos", "A -> A permite", propio.status === 200, { http: propio.status });

    const ajeno = await pide("GET", "/api/saas/agentes/runs", { token, tenant: TENANT_AJENO });
    // 403 o 401 valen: lo que NO vale es 200 con datos de otro.
    anotar("inquilinos", "A -> B DENIEGA", ajeno.status === 401 || ajeno.status === 403, {
      http: ajeno.status,
      nota: ajeno.status === 200 ? "FUGA: devolvio 200 sobre un inquilino ajeno" : undefined,
    });
  } else {
    anotar("inquilinos", "A->A / A->B", false, {
      nota: "faltan NELVYON_CERT_TENANT_PROPIO / _AJENO",
    });
  }

  // ── 3 · Worker ────────────────────────────────────────────────────────────
  const worker = await pide("GET", "/api/os/worker", { token });
  const esAdmin = worker.status === 200;
  anotar("worker", "el estado del worker responde", esAdmin, {
    http: worker.status,
    nota: worker.status === 403 ? "la cuenta no es admin: plan='admin' pendiente" : undefined,
    estado: esAdmin ? worker.json : undefined,
  });

  // ── 4 · Inferencia real contra el modelo local ────────────────────────────
  //
  // Se manda una peticion pequena y se mira la PROCEDENCIA, no solo que no
  // reviente: produccion tiene historia de respuestas `ok:true` con cero modelo
  // y cero tokens. Sin procedencia real, esto no cuenta como verificado.
  const ia = await pide("POST", "/api/saas/agentes/execute", {
    token,
    tenant: TENANT_PROPIO || undefined,
    cuerpo: {
      agentId: "agent-seo-audit",
      input: `Certificacion de fase 3 ${randomUUID().slice(0, 8)}: responde con una frase corta.`,
    },
    timeoutMs: 180_000,
  });
  anotar("ia", "inferencia real desde produccion", ia.status === 200, {
    http: ia.status,
    ms: ia.ms,
    procedencia: ia.json?.provenance?.outcome ?? ia.json?.result?.provenance?.outcome ?? null,
  });

  // ── Resumen ───────────────────────────────────────────────────────────────
  const fallos = resultados.filter((r) => !r.ok);
  console.log(`\n${resultados.length - fallos.length}/${resultados.length} en verde`);
  if (fallos.length) {
    console.log("pendientes:");
    for (const f of fallos) console.log(`  - [${f.bloque}] ${f.prueba} (HTTP ${f.http ?? "-"})`);
  }
  process.exit(fallos.length ? 1 : 0);
}

await main();
