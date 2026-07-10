/**
 * Operational registry — cron jobs, webhooks, and scheduled tasks (source of truth in code).
 */

export type CronJobSpec = {
  id: string;
  path: string;
  auth: "x-cron-secret" | "bearer";
  schedule: string;
  githubScheduled: boolean;
};

export const CRON_JOBS: CronJobSpec[] = [
  { id: "saas-workflows", path: "/api/cron/saas-workflows", auth: "x-cron-secret", schedule: "*/5 * * * *", githubScheduled: true },
  { id: "pwa-push-dispatch", path: "/api/cron/pwa-push-dispatch", auth: "bearer", schedule: "*/5 * * * *", githubScheduled: true },
  { id: "social-publish", path: "/api/cron/social-publish", auth: "x-cron-secret", schedule: "*/15 * * * *", githubScheduled: true },
  { id: "local-pack-email-queue", path: "/api/cron/local-pack-email-queue", auth: "x-cron-secret", schedule: "*/15 * * * *", githubScheduled: true },
  { id: "status-check", path: "/api/cron/status-check", auth: "x-cron-secret", schedule: "*/10 * * * *", githubScheduled: true },
  { id: "workflow-date", path: "/api/cron/workflow-date", auth: "x-cron-secret", schedule: "5 0 * * *", githubScheduled: true },
  { id: "os-sector-certification", path: "/api/cron/os-sector-certification", auth: "bearer", schedule: "0 3 * * *", githubScheduled: true },
  { id: "saas-elite-maintenance", path: "/api/cron/saas-elite-maintenance", auth: "x-cron-secret", schedule: "0 4 * * *", githubScheduled: true },
  { id: "stripe-meter-flush", path: "/api/cron/stripe-meter-flush", auth: "bearer", schedule: "0 5 * * *", githubScheduled: true },
  { id: "saas-dunning", path: "/api/cron/saas-dunning", auth: "bearer", schedule: "0 6 * * *", githubScheduled: true },
  { id: "saas-sequences", path: "/api/cron/saas-sequences", auth: "bearer", schedule: "0 7 * * *", githubScheduled: true },
  { id: "saas-ceo-brief", path: "/api/cron/saas-ceo-brief", auth: "bearer", schedule: "0 7 * * *", githubScheduled: true },
  { id: "os-recurring-services", path: "/api/cron/os-recurring-services", auth: "x-cron-secret", schedule: "0 8 1 * *", githubScheduled: true },
  { id: "os-learning-loop", path: "/api/cron/os-learning-loop", auth: "x-cron-secret", schedule: "0 6 1 * *", githubScheduled: true },
  { id: "os-competitor-gap", path: "/api/cron/os-competitor-gap", auth: "bearer", schedule: "0 9 * * 1", githubScheduled: true },
  { id: "saas-competitor-gap", path: "/api/cron/saas-competitor-gap", auth: "bearer", schedule: "0 10 * * 1", githubScheduled: true },
];

export const INBOUND_WEBHOOKS = [
  { id: "stripe", path: "/api/webhooks/stripe", verification: "stripe-signature" },
  { id: "stripe-connect", path: "/api/webhooks/stripe-connect", verification: "stripe-signature" },
  { id: "ses-sns", path: "/api/webhooks/ses", verification: "sns-signature" },
  { id: "whatsapp", path: "/api/webhooks/whatsapp", verification: "meta" },
  { id: "paddle", path: "/api/webhooks/paddle", verification: "paddle" },
] as const;
