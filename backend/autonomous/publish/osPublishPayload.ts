/** Build OsPublishPayload — dry_run by default; Phase D endpoint for controlled staging */

import type { AutonomousProject, AutonomousSku, OsPublishPayload } from "../types";

export function buildOsPublishPayload(
  project: AutonomousProject,
  options?: { dry_run?: boolean; os_project_id?: string },
): OsPublishPayload {
  const score = project.qa?.score ?? 0;
  const jobId = `autonomous_job_${project.project_id.slice(0, 8)}`;

  const deliverables = deliverablesForSku(project.sku, project.artifacts, project.brief);

  return {
    dry_run: options?.dry_run ?? true,
    project_id: project.project_id,
    os_refs: {
      ...project.os_refs,
      ...(options?.os_project_id ? { project_id: options.os_project_id } : {}),
    },
    deliverables,
    qa_score: score,
    autonomous_job_id: jobId,
    artifacts: project.artifacts,
    handoff_email_draft: {
      subject: handoffSubject(project.sku, project.brief),
      body_markdown: handoffBody(project),
    },
    os_actions: [
      { entity: "deliverable", action: "create", status: "in_review" },
      { entity: "project", action: "update_status", status: "INTERNAL_REVIEW" },
      { entity: "task", action: "complete", task_key: "QA_AUTONOMOUS" },
    ],
    note:
      options?.dry_run === false
        ? "PHASE-D STAGING: POST /api/v1/os/autonomous/publish with AUTONOMOUS_PRODUCTION=true"
        : "PHASE-D DRY-RUN: POST /api/v1/os/autonomous/publish validates payload without DB writes",
  };
}

function handoffSubject(sku: AutonomousSku, brief: Record<string, unknown>): string {
  const name = brief.company_name ?? "cliente";
  const labels: Record<AutonomousSku, string> = {
    "NELVYON-LANDING": `Tu landing NELVYON está lista — ${name}`,
    "NELVYON-CHATBOT": `Tu chatbot NELVYON está listo — ${name}`,
    "NELVYON-SEO": `Informe SEO NELVYON — ${name}`,
  };
  return labels[sku];
}

function handoffBody(project: AutonomousProject): string {
  return [
    `Proyecto: ${project.os_refs.project_slug}`,
    `SKU: ${project.sku}`,
    `QA score: ${project.qa?.score ?? "n/a"}`,
    ``,
    `Entregables simulados: ${project.qa?.passed ? "listos para revisión cliente" : "bloqueados"}.`,
    `Modo: ${project.simulation_mode}`,
  ].join("\n");
}

function deliverablesForSku(
  sku: AutonomousSku,
  artifacts: Record<string, unknown>,
  brief: Record<string, unknown>,
): OsPublishPayload["deliverables"] {
  switch (sku) {
    case "NELVYON-LANDING": {
      const build = artifacts.build as { staging_url?: string };
      return [
        { type: "url", label: "Landing staging/live", value: build?.staging_url ?? "mock://", visibility: "client" },
        { type: "json", label: "Copy map", value: "mock://artifacts/copy.json", visibility: "client" },
        { type: "file", label: "QA Report", value: "mock://artifacts/qa-report.pdf", visibility: "internal" },
        { type: "file", label: "Handoff 1-pager", value: "mock://artifacts/handoff.md", visibility: "client" },
      ];
    }
    case "NELVYON-CHATBOT": {
      const config = artifacts.config as { widget_snippet?: string; bot_id?: string };
      return [
        { type: "json", label: "Widget snippet", value: config?.widget_snippet ?? "", visibility: "client" },
        { type: "json", label: "Bot config", value: `mock://bots/${config?.bot_id}.json`, visibility: "client" },
        { type: "json", label: "Knowledge base", value: "mock://artifacts/kb.json", visibility: "client" },
        { type: "file", label: "Gold set results", value: "mock://artifacts/gold-set.csv", visibility: "internal" },
        { type: "file", label: "QA Report", value: "mock://artifacts/qa-report.pdf", visibility: "internal" },
      ];
    }
    case "NELVYON-SEO": {
      const report = artifacts.report as { pdf_url?: string };
      const domain = String(brief.primary_domain ?? "").replace(/\/$/, "");
      return [
        { type: "file", label: "SEO Report PDF", value: report?.pdf_url ?? `mock://storage/${domain}/seo-report.pdf`, visibility: "client" },
        { type: "json", label: "Issues CSV", value: "mock://artifacts/issues.csv", visibility: "client" },
        { type: "json", label: "On-page fixes", value: "mock://artifacts/on-page-fixes.json", visibility: "client" },
        { type: "json", label: "Keyword map", value: "mock://artifacts/keyword-map.json", visibility: "client" },
        { type: "file", label: "Plan 90d", value: "mock://artifacts/plan-90d.md", visibility: "client" },
        { type: "file", label: "QA Report", value: "mock://artifacts/qa-report.pdf", visibility: "internal" },
      ];
    }
    default:
      return [];
  }
}
