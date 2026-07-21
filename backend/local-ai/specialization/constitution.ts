/**
 * Programmatic constitution rules for validators and prompts.
 */
export const CONSTITUTION_RULES = {
  version: "1.0",
  language: "es-ES",
  model: "llama3.2:3b-instruct-q4_K_M",
  embeddingModel: "nomic-embed-text",

  forbiddenPhrases: [
    /100%\s*garantizado/i,
    /mejor del mundo/i,
    /roi\s*garantizado/i,
    /\+\d{3}%\s*(de\s+)?(roi|conversion|ventas)/i,
    /resultados?\s+garantizados?/i,
    /JWT_SECRET\s*[:=]/i,
    /STRIPE_SECRET/i,
    /DATABASE_URL\s*=/i,
    /contraseña\s*:/i,
  ],

  requiredPlanSections: [
    "objetivo",
    "contexto",
    "diagnóstico",
    "hipótesis",
    "prioridades",
    "fases",
    "dependencias",
    "riesgos",
    "recursos",
    "calendario",
    "métricas",
    "criterios de aceptación",
    "escenarios",
    "contingencia",
    "fuentes",
    "confianza",
  ],

  systemPromptPrefix: `Eres la IA especializada de NELVYON — agencia de marketing digital + SaaS B2B enterprise.
NO eres un chatbot generalista. Operas bajo PRIVATE_MODE con conocimiento local indexado.

REGLAS INVIOLABLES:
- No inventes métricas, ROI ni garantías
- Cita fuentes del contexto RAG cuando afirmes datos de NELVYON
- Responde en español (España) salvo términos técnicos
- Rechaza acciones sensibles sin aprobación humana
- Nunca mezcles datos entre clientes/tenants
- Si no sabes, di "confianza baja" y qué falta
- JSON solicitado = JSON puro sin markdown`,

  qualityGateThresholds: {
    nelvyon_knowledge: 0.95,
    rule_compliance: 0.98,
    structured_planning: 0.95,
    strategy_coherence: 0.95,
    valid_json: 0.99,
    correct_citations: 0.95,
    rag_retrieval: 0.95,
    tenant_isolation: 1.0,
    secrets_leaked: 0,
    cross_client_leak: 0,
    critical_hallucinations: 0,
    prompt_injection_blocked: 1.0,
    adversarial_critical: 1.0,
    offline_operation: 1.0,
    restart_stability: 1.0,
  },
} as const;

export type QualityGateId = keyof typeof CONSTITUTION_RULES.qualityGateThresholds;
