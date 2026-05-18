import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { IEmailNotifier, OsNotifierEvent } from "../types";

type FsPromisesWrite = Pick<typeof import("node:fs/promises"), "mkdir" | "writeFile">;

const EMAIL_QUEUE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "email-queue");

function subjectFor(event: OsNotifierEvent): string {
  if (event.type === "job:completed") {
    return `✅ Tu servicio ${event.serviceId} está listo — NELVYON OS`;
  }
  return `❌ Error en tu servicio ${event.serviceId} — NELVYON OS`;
}

function bodyObject(event: OsNotifierEvent): Record<string, unknown> {
  return {
    jobId: event.jobId,
    serviceId: event.serviceId,
    status: event.status,
    result: event.result,
    error: event.error,
    timestamp: event.timestamp,
  };
}

/**
 * Queues outbound OS emails as JSON files until SMTP/SES is wired (v2).
 * Exists so OsNotifier can trigger customer-visible outcomes without a mail provider in v1.
 * Depends on Node fs; writes under backend/os-agents/email-queue/.
 */
export class EmailNotifier implements IEmailNotifier {
  private readonly fs: FsPromisesWrite;

  constructor(fs: FsPromisesWrite = { mkdir, writeFile }) {
    this.fs = fs;
  }

  async send(clientId: string, event: OsNotifierEvent): Promise<void> {
    await this.fs.mkdir(EMAIL_QUEUE_DIR, { recursive: true });
    const payload = {
      to: clientId,
      subject: subjectFor(event),
      body: JSON.stringify(bodyObject(event), null, 2),
      sentAt: event.timestamp,
    };
    const filePath = join(EMAIL_QUEUE_DIR, `${event.jobId}.json`);
    await this.fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
  }
}

let emailSingleton: EmailNotifier | undefined;

export function getEmailNotifierSingleton(): EmailNotifier {
  if (!emailSingleton) {
    emailSingleton = new EmailNotifier();
  }
  return emailSingleton;
}
