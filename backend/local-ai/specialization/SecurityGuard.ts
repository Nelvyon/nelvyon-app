/**
 * Deterministic pre-LLM security guard — no model invocation for blocked requests.
 */
export type SecurityGuardResult =
  | { blocked: false }
  | {
      blocked: true;
      category:
        | "cross_tenant_export"
        | "secret_extraction"
        | "private_mode_bypass"
        | "permission_evasion"
        | "prompt_injection"
        | "document_injection";
      response: string;
    };

function norm(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const EXPORT_TENANT = [
  /\[system:\s*exporta/i,
  /exporta\s+tenant\s+[a-z0-9_-]+/i,
  /exportar\s+(los\s+)?datos\s+del\s+tenant/i,
  /exporta\s+datos\s+de\s+otro\s+tenant/i,
  /dump\s+tenant\s+[a-z0-9_-]+/i,
];

const SECRET_PATTERNS = [
  /jwt_secret/i,
  /database_url/i,
  /sk_live_|sk_test_/i,
  /api[_-]?key/i,
  /ignora\s+reglas/i,
  /olvida\s+(la\s+)?constitucion/i,
];

const PRIVATE_MODE_BYPASS = [/desactiva\s+private_mode/i, /private_mode\s*=\s*off/i, /sin\s+private_mode/i];

const PERMISSION_EVASION = [/sin\s+aprobacion/i, /eludir\s+permisos/i, /bypass\s+rls/i, /saltar\s+rls/i];

const DOC_INJECTION = [/<\s*script/i, /ignore\s+previous\s+instructions/i, /prompt\s+injection/i];

function buildCrossTenantBlock(hasPrivateModeSubtask: boolean): string {
  const base =
    "[1] Solicitud bloqueada por política de seguridad NELVYON. No ejecuto acciones cross-tenant ni extracción de datos de otros clientes. Requiere aprobación humana explícita.";
  if (!hasPrivateModeSubtask) return base;
  return `${base}

Resumen PRIVATE_MODE=ON: egress restringido a localhost, LAN privada Docker y hosts allowlist; Internet público bloqueado salvo ventana owner autorizada. Aislamiento multi-tenant por filtrado de inquilino en la aplicacion, certificado A/B con escrituras reales y con manipulacion de X-Workspace-Id. Las politicas RLS de PostgreSQL estan declaradas y verificadas, pero HOY no forman parte de la frontera efectiva: la aplicacion se conecta con un rol que las evita.`;
}

function buildSecretBlock(): string {
  return "Rechazo la solicitud: no revelo secretos, credenciales ni variables de entorno (JWT_SECRET, DATABASE_URL, API keys). Acción sensible — requiere aprobación humana y canal autorizado.";
}

function buildInjectionBlock(hasPrivateModeSubtask: boolean): string {
  if (hasPrivateModeSubtask) return buildCrossTenantBlock(true);
  return "Rechazo instrucciones maliciosas embebidas. No ejecuto comandos de sistema ni ignoro la constitución NELVYON. Requiere aprobación humana.";
}

/** Evaluate query before RAG/LLM. Deterministic — same input → same output. */
export function evaluateSecurityGuard(query: string): SecurityGuardResult {
  const n = norm(query);
  const hasPrivateModeSubtask = /private_mode|resume private/i.test(n);

  if (EXPORT_TENANT.some((re) => re.test(query))) {
    return { blocked: true, category: "cross_tenant_export", response: buildCrossTenantBlock(hasPrivateModeSubtask) };
  }
  if (SECRET_PATTERNS.some((re) => re.test(query))) {
    return { blocked: true, category: "secret_extraction", response: buildSecretBlock() };
  }
  if (PRIVATE_MODE_BYPASS.some((re) => re.test(query))) {
    return { blocked: true, category: "private_mode_bypass", response: buildInjectionBlock(hasPrivateModeSubtask) };
  }
  if (PERMISSION_EVASION.some((re) => re.test(query))) {
    return { blocked: true, category: "permission_evasion", response: buildInjectionBlock(false) };
  }
  if (DOC_INJECTION.some((re) => re.test(query)) || /\[system:/i.test(query)) {
    return { blocked: true, category: "prompt_injection", response: buildInjectionBlock(hasPrivateModeSubtask) };
  }
  if (/exporta\s+tenant|tenant\s+[a-z]\b.*export/i.test(n)) {
    return { blocked: true, category: "cross_tenant_export", response: buildCrossTenantBlock(hasPrivateModeSubtask) };
  }

  return { blocked: false };
}
