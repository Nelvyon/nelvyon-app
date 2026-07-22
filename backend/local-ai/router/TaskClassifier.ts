import type { KnowledgeDomainId } from "../specialization/ontology";
import type { RouterTaskInput, TaskType } from "./types";

function norm(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const JSON_HINTS = /\bjson\b|create_campaign|tool_call|schema|formato json/i;
const PLAN_HINTS = /\bplan estructurado|roadmap|16 secciones|planificacion|contingencia/i;
const STRATEGY_HINTS = /\bestrategi|okr|posicionamiento|icp|buyer persona|go-to-market|gtm\b/i;
const EXTRACTION_HINTS = /\bextrae|extract|lista de|campos|parsea|clasifica entidad/i;
const CLASSIFICATION_HINTS = /\bclasifica|categoriza|tipo de|intent detection/i;
const CODING_HINTS = /\bcodigo|typescript|python|sql|migracion|api route|funcion\b/i;
const ANALYSIS_HINTS = /\banaliza|compara|diagnostico|evalua|benchmark\b/i;
const KNOWLEDGE_HINTS = /\bque es|como funciona|define|nelvyon|producto|plataforma/i;
const RAG_HINTS = /\bfuentes|cita|documentacion|contexto|kb:|segun el corpus/i;

/** Deterministic task classification — rules only, no LLM. */
export function classifyTask(input: RouterTaskInput): TaskType {
  if (input.hints?.taskType) return input.hints.taskType;
  if (input.hints?.requireJson) return "json";
  if (input.hints?.requirePlan) return "planning";

  const q = norm(input.query);
  const domain = input.domain;

  if (domain === "security_privacy" || /seguridad|rls|private_mode|secreto|credencial/.test(q)) {
    return "security_sensitive";
  }
  if (JSON_HINTS.test(q) || input.hints?.structuredOutput) return "json";
  if (PLAN_HINTS.test(q) || domain === "planning_strategy") return "planning";
  if (STRATEGY_HINTS.test(q) || domain === "business_strategy") return "strategy";
  if (CODING_HINTS.test(q) || domain === "development_tech") return "coding";
  if (EXTRACTION_HINTS.test(q)) return "extraction";
  if (CLASSIFICATION_HINTS.test(q)) return "classification";
  if (ANALYSIS_HINTS.test(q) || domain === "analytics_reporting") return "analysis";
  if (KNOWLEDGE_HINTS.test(q) || domain === "nelvyon") return "knowledge";
  if (RAG_HINTS.test(q)) return "rag_query";

  if (q.length < 80 && !/\?/.test(q)) return "simple";
  return "rag_query";
}

export function inferRagDomain(input: RouterTaskInput, taskType: TaskType): KnowledgeDomainId | undefined {
  if (input.domain) return input.domain;
  const q = norm(input.query);
  const map: [RegExp, KnowledgeDomainId][] = [
    [/nelvyon|saas\/|portal|packs os/, "nelvyon"],
    [/seo|keyword|serp/, "seo"],
    [/crm|pipeline|ventas/, "crm_sales"],
    [/email|campana|ses/, "email_marketing"],
    [/ads|google ads|meta ads|cpc/, "paid_ads"],
    [/estrategi|okr|roadmap/, "planning_strategy"],
    [/stripe|billing|finanz/, "finance_operations"],
    [/seguridad|rls|private_mode/, "security_privacy"],
  ];
  for (const [re, id] of map) {
    if (re.test(q)) return id;
  }
  if (taskType === "knowledge") return "nelvyon";
  return undefined;
}
