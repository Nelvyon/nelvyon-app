export type ProductEventName =
  | "onboarding_step_completed"
  | "help_article_opened"
  | "help_form_submitted"
  | "bot_result"
  | "auth_bridge_sign_in_success"
  | "workspace_selected"
  | "workspace_created"
  | "crm_client_created"
  | "inbox_ticket_created"
  | "campaign_bootstrap_completed";

export interface ProductEventPayload {
  module?: string;
  step_key?: string;
  form_kind?: "bug" | "help" | "feedback";
  result?: "article" | "handoff" | "playbook";
  confidence?: "high" | "low";
  route?: string;
  workspace_id?: string | number;
  [key: string]: string | number | boolean | null | undefined;
}

export interface ProductEventEnvelope {
  name: ProductEventName;
  payload: ProductEventPayload;
  at: string;
}

const PII_OR_SECRET_KEYS = new Set([
  "email",
  "token",
  "jwt",
  "authorization",
  "password",
  "secret",
  "subject",
  "description",
  "details",
  "content",
]);

const EVENT_PAYLOAD_WHITELIST: Record<ProductEventName, ReadonlyArray<string>> = {
  onboarding_step_completed: ["module", "step_key", "workspace_id", "route"],
  help_article_opened: ["module", "route"],
  help_form_submitted: ["module", "form_kind"],
  bot_result: ["module", "result", "confidence", "route"],
  auth_bridge_sign_in_success: ["route", "workspace_id"],
  workspace_selected: ["workspace_id"],
  workspace_created: ["workspace_id"],
  crm_client_created: ["module", "workspace_id"],
  inbox_ticket_created: ["module", "workspace_id"],
  campaign_bootstrap_completed: ["module", "workspace_id"],
};

function sanitizePayload(name: ProductEventName, payload: ProductEventPayload): ProductEventPayload {
  const allowed = new Set(EVENT_PAYLOAD_WHITELIST[name]);
  const out: ProductEventPayload = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!allowed.has(key)) continue;
    if (PII_OR_SECRET_KEYS.has(key.toLowerCase())) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value == null) {
      out[key] = value;
    }
  }
  return out;
}

declare global {
  interface Window {
    __nelvyonProductEvents?: ProductEventEnvelope[];
  }
}

export function trackProductEvent(name: ProductEventName, payload: ProductEventPayload = {}) {
  if (typeof window === "undefined") return;
  const safePayload = sanitizePayload(name, payload);
  const envelope: ProductEventEnvelope = {
    name,
    payload: safePayload,
    at: new Date().toISOString(),
  };
  window.__nelvyonProductEvents = window.__nelvyonProductEvents ?? [];
  window.__nelvyonProductEvents.push(envelope);
  if (process.env.NODE_ENV !== "production") {
    // Lightweight observability for v1/v2 without external analytics infra.
    console.debug("[nelvyon:event]", envelope);
  }
}
