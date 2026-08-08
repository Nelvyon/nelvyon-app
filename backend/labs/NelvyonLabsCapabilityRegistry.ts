/**
 * NELVYON Labs — enterprise capability registry.
 * Maps every product capability domain to NELVYON implementation + Labs provenance.
 * No vendor copy. Source of truth for master closure block.
 */

export type CapabilityClosureStatus =
  | "integrado_ganador"
  | "integrado_parcial"
  | "sustituido_stack"
  | "conocimiento_cosechado"
  | "descartado";

export type CapabilityDomain = {
  id: string;
  label: string;
  status: CapabilityClosureStatus;
  nelvyonImplementation: string[];
  labsProvenance: string[];
  tests: string[];
  featureFlags: string[];
  rollback: string;
  privateModeSafe: boolean;
};

/** Full product surface — aligns with master closure checklist. */
export const NELVYON_CAPABILITY_DOMAINS: CapabilityDomain[] = [
  {
    id: "ia_llm",
    label: "IA / LLM / inferencia",
    status: "integrado_ganador",
    nelvyonImplementation: [
      "backend/local-ai/OllamaClient.ts",
      "backend/local-ai/specialization/SpecializationPipeline.ts",
      "backend/local-ai/config.ts",
    ],
    labsProvenance: ["ollama", "llama-cpp", "litellm"],
    tests: ["backend/saas/__tests__/localAiSpecialization.test.ts"],
    featureFlags: ["PRIVATE_MODE", "OLLAMA_BASE_URL"],
    rollback: "UnconfiguredProvider — deploy sin Ollama sigue operativo",
    privateModeSafe: true,
  },
  {
    id: "router",
    label: "Model Router",
    status: "integrado_ganador",
    nelvyonImplementation: [
      "backend/local-ai/router/LocalModelRouter.ts",
      "backend/local-ai/router/latencyMetrics.ts",
      "backend/local-ai/benchmarks/router_certification_final.json",
    ],
    labsProvenance: ["ollama", "llama-cpp"],
    tests: [
      "backend/saas/__tests__/localAiModelRouter.test.ts",
      "backend/saas/__tests__/routerLatencyMetrics.test.ts",
    ],
    featureFlags: [],
    rollback: "Router certificado — no desactivar sin nueva certificación",
    privateModeSafe: true,
  },
  {
    id: "mcp",
    label: "MCP",
    status: "integrado_parcial",
    nelvyonImplementation: ["backend/labs/NelvyonLabsOptionalAdapter.ts"],
    labsProvenance: ["mcp-sdk-typescript"],
    tests: ["backend/saas/__tests__/nelvyonLabsOptionalAdapter.test.ts"],
    featureFlags: ["NELVYON_MCP_TS_ENABLED"],
    rollback: "NELVYON_MCP_TS_ENABLED=0 — sin OpenClaw/orquestador",
    privateModeSafe: true,
  },
  {
    id: "rag",
    label: "RAG / embeddings",
    status: "integrado_ganador",
    nelvyonImplementation: [
      "backend/local-ai/LocalRagRetriever.ts",
      "backend/local-ai/KnowledgeIngestService.ts",
      "backend/local-ai/LocalVectorStore.ts",
    ],
    labsProvenance: ["pgvector", "sentence-transformers", "llamaindex"],
    tests: ["backend/saas/__tests__/localAiSpecialization.test.ts"],
    featureFlags: [],
    rollback: "RAG opcional por tenant — ingest desactivable",
    privateModeSafe: true,
  },
  {
    id: "memoria",
    label: "Memoria / contexto",
    status: "sustituido_stack",
    nelvyonImplementation: [
      "backend/local-ai/LocalVectorStore.ts",
      "backend/db/migrations/",
      "backend/local-ai/specialization/ContextEnforcer.ts",
    ],
    labsProvenance: ["mem0", "pgvector"],
    tests: ["backend/saas/__tests__/localAiSpecialization.test.ts"],
    featureFlags: [],
    rollback: "Postgres + pgvector — sin servicio mem0 externo",
    privateModeSafe: true,
  },
  {
    id: "ocr_documentos",
    label: "OCR / documentos / PDF",
    status: "integrado_parcial",
    nelvyonImplementation: [
      "backend/labs/NelvyonLabsOptionalAdapter.ts",
      "backend/local-ai/KnowledgeIngestService.ts",
    ],
    labsProvenance: ["tesseract", "stirling-pdf"],
    tests: ["backend/saas/__tests__/nelvyonLabsOptionalAdapter.test.ts"],
    featureFlags: ["NELVYON_TESSERACT_ENABLED"],
    rollback: "NELVYON_TESSERACT_ENABLED=0",
    privateModeSafe: true,
  },
  {
    id: "scraping",
    label: "Scraping / crawling autorizado",
    status: "integrado_parcial",
    nelvyonImplementation: ["backend/labs/NelvyonLabsOptionalAdapter.ts"],
    labsProvenance: ["cheerio", "playwright", "playwright-browsers"],
    tests: [
      "backend/saas/__tests__/nelvyonLabsOptionalAdapter.test.ts",
      "apps/web/e2e/local-pack-smoke.spec.ts",
    ],
    featureFlags: ["NELVYON_CHEERIO_ENABLED"],
    rollback: "NELVYON_CHEERIO_ENABLED=0 — Playwright solo e2e CI",
    privateModeSafe: true,
  },
  {
    id: "crm_ventas",
    label: "CRM / ventas / pipeline",
    status: "sustituido_stack",
    nelvyonImplementation: [
      "backend/saas/SaasCrmService.ts",
      "apps/web/src/features/saas-crm/",
      "apps/web/src/app/saas/crm/",
    ],
    labsProvenance: ["atomic-crm", "chatwoot", "kanboard"],
    tests: ["src/features/saas-crm"],
    featureFlags: [],
    rollback: "CRM nativo SaaS — sin CRM externo",
    privateModeSafe: true,
  },
  {
    id: "email_whatsapp",
    label: "Email / WhatsApp / notificaciones",
    status: "integrado_parcial",
    nelvyonImplementation: [
      "backend/saas/SaasCampaniasService.ts",
      "backend/email/sesClient.ts",
      "backend/labs/NelvyonLabsOptionalAdapter.ts",
    ],
    labsProvenance: ["email-suppression-db", "ntfy"],
    tests: ["backend/saas/__tests__/nelvyonLabsOptionalAdapter.test.ts"],
    featureFlags: ["NELVYON_NTFY_ENABLED"],
    rollback: "SES principal; NTFY ops opcional",
    privateModeSafe: true,
  },
  {
    id: "marketing_seo_ads",
    label: "Marketing / SEO / SEM / Ads",
    status: "sustituido_stack",
    nelvyonImplementation: [
      "backend/autonomous/analytics/ga4RealAdapter.ts",
      "apps/web/src/lib/packs/",
      "backend/os-agents/",
    ],
    labsProvenance: ["umami", "growthbook", "strapi"],
    tests: ["backend/os-agents/__tests__/"],
    featureFlags: [],
    rollback: "GA4 + packs OS — sin panel ads duplicado",
    privateModeSafe: true,
  },
  {
    id: "redes_sociales",
    label: "Redes sociales",
    status: "conocimiento_cosechado",
    nelvyonImplementation: ["backend/os-agents/sectors/", "docs/nelvyon-labs-knowledge-patterns.json"],
    labsProvenance: ["138 proyectos CONOCIMIENTO en dominio"],
    tests: [],
    featureFlags: [],
    rollback: "Patrones en knowledge harvest — sin runtime social duplicado",
    privateModeSafe: true,
  },
  {
    id: "reporting_bi",
    label: "Reporting / BI / dashboards",
    status: "sustituido_stack",
    nelvyonImplementation: [
      "apps/web/src/app/saas/dashboard/",
      "apps/web/src/components/platform/PackReportDashboard.tsx",
    ],
    labsProvenance: ["evidence-dev", "cube", "goaccess"],
    tests: [],
    featureFlags: [],
    rollback: "Dashboards CEO/packs reales en producto",
    privateModeSafe: true,
  },
  {
    id: "observabilidad",
    label: "Observabilidad / monitorización",
    status: "integrado_parcial",
    nelvyonImplementation: [
      "apps/web/src/app/api/health/",
      "backend/observability/NelvyonObservabilityAdapter.ts",
      "scripts/run-staging-p0-smokes.mjs",
    ],
    labsProvenance: ["uptime-kuma", "prometheus"],
    tests: ["backend/saas/__tests__/nelvyonObservabilityAdapter.test.ts"],
    featureFlags: ["NELVYON_UPTIME_KUMA_ENABLED"],
    rollback: "Health probes nativos; Kuma externo opcional",
    privateModeSafe: true,
  },
  {
    id: "seguridad",
    label: "Seguridad / supply chain",
    status: "integrado_ganador",
    nelvyonImplementation: [
      "backend/security/NelvyonSecurityScanAdapter.ts",
      ".github/workflows/security-gates.yml",
      "backend/local-ai/specialization/SecurityGuard.ts",
    ],
    labsProvenance: ["trivy", "gitleaks"],
    tests: ["backend/saas/__tests__/nelvyonSecurityScanAdapter.test.ts"],
    featureFlags: ["NELVYON_TRIVY_ENABLED", "NELVYON_GITLEAKS_ENABLED"],
    rollback: "Flags=0 desactiva jobs adaptador",
    privateModeSafe: true,
  },
  {
    id: "testing",
    label: "Testing / QA",
    status: "integrado_ganador",
    nelvyonImplementation: [
      "apps/web/vitest.config.ts",
      "apps/web/e2e/",
      "scripts/run-staging-p0-smokes.mjs",
    ],
    labsProvenance: ["playwright", "vitest"],
    tests: ["backend/saas/__tests__/"],
    featureFlags: [],
    rollback: "CI Vitest + Playwright + smokes P0",
    privateModeSafe: true,
  },
  {
    id: "devops",
    label: "DevOps / CI/CD / Docker",
    status: "integrado_ganador",
    nelvyonImplementation: [
      ".github/workflows/",
      "backend/local-ai/docker-compose.yml",
      "scripts/run-phase1-audit.mjs",
    ],
    labsProvenance: ["docker", "compose", "railway-cli"],
    tests: ["scripts/run-phase1-audit.mjs"],
    featureFlags: [],
    rollback: "Railway releaseCommand + GH Actions",
    privateModeSafe: true,
  },
  {
    id: "postgresql",
    label: "PostgreSQL / pgvector / Redis",
    status: "integrado_ganador",
    nelvyonImplementation: [
      "backend/db/migrations/",
      "backend/local-ai/db.ts",
      "ioredis en backend/saas",
    ],
    labsProvenance: ["postgresql", "pgvector"],
    tests: ["backend/saas/__tests__/"],
    featureFlags: [],
    rollback: "Postgres 16 Railway — migraciones numeradas",
    privateModeSafe: true,
  },
  {
    id: "next_react_ui",
    label: "Next.js / React / Tailwind / UI",
    status: "integrado_ganador",
    nelvyonImplementation: [
      "apps/web/",
      "apps/web/src/features/saas-shell/",
      "SaasShellLayout dark glass #020817",
    ],
    labsProvenance: ["typescript", "tailwindcss", "nextjs"],
    tests: ["pnpm exec tsc --noEmit"],
    featureFlags: [],
    rollback: "apps/web único deploy Railway",
    privateModeSafe: true,
  },
  {
    id: "accesibilidad",
    label: "Accesibilidad / UX",
    status: "conocimiento_cosechado",
    nelvyonImplementation: [
      "apps/web/src/features/saas-shell/",
      "docs/nelvyon-labs-knowledge-patterns.json",
    ],
    labsProvenance: ["ui_paneles knowledge harvest"],
    tests: [],
    featureFlags: [],
    rollback: "Patrones UX cosechados — sin librería UI duplicada",
    privateModeSafe: true,
  },
  {
    id: "video_audio",
    label: "Vídeo / imagen / audio / voz",
    status: "integrado_parcial",
    nelvyonImplementation: [
      "backend/labs/NelvyonLabsOptionalAdapter.ts",
      "backend/main.py",
    ],
    labsProvenance: ["ffmpeg", "whisper", "faster-whisper", "opencv"],
    tests: ["backend/saas/__tests__/nelvyonLabsOptionalAdapter.test.ts"],
    featureFlags: ["NELVYON_FFMPEG_ENABLED", "NELVYON_WHISPER_ENABLED"],
    rollback: "Flags off — FastAPI voice opcional",
    privateModeSafe: true,
  },
  {
    id: "branding_diseno",
    label: "Branding / diseño / tipografía",
    status: "integrado_parcial",
    nelvyonImplementation: ["apps/web/", "backend/labs/NelvyonLabsOptionalAdapter.ts"],
    labsProvenance: ["fontsource", "excalidraw"],
    tests: ["backend/saas/__tests__/nelvyonLabsOptionalAdapter.test.ts"],
    featureFlags: ["NELVYON_FONTSOURCE_ENABLED"],
    rollback: "Tailwind + acento #0084ff; fonts npm opcional",
    privateModeSafe: true,
  },
  {
    id: "automatizaciones",
    label: "Automatizaciones / workflows",
    status: "sustituido_stack",
    nelvyonImplementation: [
      "backend/saas/SaasWorkflowService.ts",
      "scripts/run-staging-p0-smokes.mjs",
      ".github/workflows/",
    ],
    labsProvenance: ["bullmq", "apache-airflow", "trigger-dev"],
    tests: ["backend/saas/__tests__/"],
    featureFlags: ["CRON_SECRET"],
    rollback: "Workflows SaaS + GH cron — sin BullMQ server",
    privateModeSafe: true,
  },
  {
    id: "apis_integraciones",
    label: "APIs / integraciones B2B",
    status: "integrado_ganador",
    nelvyonImplementation: [
      "apps/web/src/app/api/",
      "backend/saas/",
      "Stripe webhook",
    ],
    labsProvenance: ["fastapi", "hoppscotch"],
    tests: ["backend/saas/__tests__/"],
    featureFlags: [],
    rollback: "BFF Next.js + servicios TS puros",
    privateModeSafe: true,
  },
  {
    id: "productividad",
    label: "Productividad / documentación viva",
    status: "integrado_ganador",
    nelvyonImplementation: ["docs/HANDOVER.md", "docs/AI_CONTEXT.md", ".cursor/rules/"],
    labsProvenance: ["bookstack"],
    tests: ["node scripts/sync-handover-metadata.mjs"],
    featureFlags: [],
    rollback: "Docs vivos — bookstack descartado",
    privateModeSafe: true,
  },
  {
    id: "private_vector_rag",
    label: "Private Vector RAG (in-process cert core)",
    status: "integrado_parcial",
    nelvyonImplementation: [
      "backend/agency/PrivateVectorRagCore.ts",
      "backend/local-ai/LocalVectorStore.ts",
      "backend/local-ai/LocalRagRetriever.ts",
    ],
    labsProvenance: ["pgvector", "sentence-transformers hashing-trick pattern"],
    tests: ["backend/agency/__tests__/PrivateVectorRagCore.test.ts"],
    featureFlags: ["NELVYON_PRIVATE_VECTOR_RAG_DISABLED"],
    rollback:
      "NELVYON_PRIVATE_VECTOR_RAG_DISABLED=1 — kill switch, retrieve() siempre refuses. " +
      "Synthetic in-process core IMPLEMENTED_VERIFIED (real cosine retrieval, tenant isolation " +
      "hard-asserted, refuse-on-no-evidence); pgvector productivo PREPARED_OFF (no Docker en esta sesión).",
    privateModeSafe: true,
  },
  {
    id: "private_ai_canary_prep",
    label: "Private AI productive canary — PREP (no activation)",
    status: "integrado_parcial",
    nelvyonImplementation: [
      "backend/agency/PrivateAiCanaryPrep.ts",
      "docs/ops/CEO_IA_PROD_CANARY_REQUEST.md",
    ],
    labsProvenance: ["ollama", "llama-cpp router certification"],
    tests: ["backend/agency/__tests__/PrivateAiCanaryPrep.test.ts"],
    featureFlags: ["NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH"],
    rollback:
      "isProductionCanaryAuthorized() hardcoded false — no env var, flag, or input can flip it. " +
      "docs/ops/CEO_IA_PROD_CANARY_REQUEST.md status PENDING_CEO. NELVYON_AI_ENABLED never set on " +
      "production by this module.",
    privateModeSafe: true,
  },
];

export function getCapabilityDomains(): CapabilityDomain[] {
  return NELVYON_CAPABILITY_DOMAINS;
}

export function getCapabilityById(id: string): CapabilityDomain | undefined {
  return NELVYON_CAPABILITY_DOMAINS.find((d) => d.id === id);
}

export function assertCapabilityRegistryComplete(): { ok: boolean; domainCount: number; violations: string[] } {
  const violations: string[] = [];
  const minDomains = 20;
  if (NELVYON_CAPABILITY_DOMAINS.length < minDomains) {
    violations.push(`insufficient_domains:${NELVYON_CAPABILITY_DOMAINS.length}`);
  }
  for (const d of NELVYON_CAPABILITY_DOMAINS) {
    if (!d.nelvyonImplementation.length) violations.push(`${d.id}_no_impl`);
    if (!d.rollback) violations.push(`${d.id}_no_rollback`);
  }
  return { ok: violations.length === 0, domainCount: NELVYON_CAPABILITY_DOMAINS.length, violations };
}
