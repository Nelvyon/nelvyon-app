import type { OsEventBus } from "./OsEventBus";
import { osEventBus } from "./OsEventBus";
import type {
  OsJobCompletedPayload,
  OsJobCreatedPayload,
  OsJobFailedPayload,
  OsJobProgressPayload,
  OsJobStatus,
  OsNotifierEvent,
} from "./types";
import type { IEmailNotifier } from "./types";
import type { IWsNotifier } from "./types";
import { getEmailNotifierSingleton } from "./notifiers/EmailNotifier";
import { getWsNotifierSingleton } from "./notifiers/WsNotifier";
import { getOsJobStore } from "./OsJobStore";

function isoNow(): string {
  return new Date().toISOString();
}

/**
 * Bridges OsEventBus to WebSocket + email notifiers for fully automated OS customer updates.
 * Exists as the single subscription point so transports stay pluggable (SES, push, etc. later).
 * Depends on OsEventBus, WsNotifier, EmailNotifier, and optionally OsJobStore for enrichment.
 */
export class OsNotifier {
  private static instance: OsNotifier | undefined;
  private unsubscribers: Array<() => void> = [];

  private constructor(
    private readonly bus: OsEventBus,
    private readonly ws: IWsNotifier,
    private readonly email: IEmailNotifier,
  ) {
    this.unsubscribers.push(
      this.bus.subscribe("job:created", (p) => {
        void this.onJobCreated(p);
      }),
    );
    this.unsubscribers.push(
      this.bus.subscribe("job:progress", (p) => {
        void this.onJobProgress(p);
      }),
    );
    this.unsubscribers.push(
      this.bus.subscribe("job:completed", (p) => {
        void this.onJobCompleted(p);
      }),
    );
    this.unsubscribers.push(
      this.bus.subscribe("job:failed", (p) => {
        void this.onJobFailed(p);
      }),
    );
  }

  static getInstance(
    bus: OsEventBus,
    ws?: IWsNotifier,
    email?: IEmailNotifier,
  ): OsNotifier {
    if (!OsNotifier.instance) {
      OsNotifier.instance = new OsNotifier(bus, ws ?? getWsNotifierSingleton(), email ?? getEmailNotifierSingleton());
    }
    return OsNotifier.instance;
  }

  static resetForTests(): void {
    if (OsNotifier.instance) {
      for (const u of OsNotifier.instance.unsubscribers) {
        u();
      }
      OsNotifier.instance.unsubscribers = [];
    }
    OsNotifier.instance = undefined;
  }

  private async enrich(jobId: string): Promise<{ serviceId: string; clientId: string; status: OsJobStatus; progress: number } | null> {
    const job = await getOsJobStore().getJob(jobId);
    if (!job) return null;
    return {
      serviceId: job.serviceId,
      clientId: job.clientId,
      status: job.status,
      progress: job.progress,
    };
  }

  private async onJobCreated(p: OsJobCreatedPayload): Promise<void> {
    const ev: OsNotifierEvent = {
      type: "job:created",
      jobId: p.jobId,
      serviceId: p.serviceId,
      clientId: p.clientId,
      progress: 0,
      status: "queued",
      timestamp: isoNow(),
    };
    this.dispatchWs(ev);
    await this.dispatchEmail(ev, false);
  }

  private async onJobProgress(p: OsJobProgressPayload): Promise<void> {
    const meta = await this.enrich(p.jobId);
    if (!meta) return;
    const ev: OsNotifierEvent = {
      type: "job:progress",
      jobId: p.jobId,
      serviceId: meta.serviceId,
      clientId: meta.clientId,
      progress: p.progress,
      status: meta.status,
      timestamp: isoNow(),
    };
    this.dispatchWs(ev);
    await this.dispatchEmail(ev, false);
  }

  private async onJobCompleted(p: OsJobCompletedPayload): Promise<void> {
    const meta = await this.enrich(p.jobId);
    if (!meta) return;
    const ev: OsNotifierEvent = {
      type: "job:completed",
      jobId: p.jobId,
      serviceId: p.result.serviceId,
      clientId: meta.clientId,
      progress: 100,
      status: "completed",
      result: p.result,
      timestamp: isoNow(),
    };
    this.dispatchWs(ev);
    await this.dispatchEmail(ev, true);
  }

  private async onJobFailed(p: OsJobFailedPayload): Promise<void> {
    const meta = await this.enrich(p.jobId);
    if (!meta) return;
    const ev: OsNotifierEvent = {
      type: "job:failed",
      jobId: p.jobId,
      serviceId: meta.serviceId,
      clientId: meta.clientId,
      progress: meta.progress,
      status: "failed",
      error: p.error.step ? `${p.error.message} (step: ${p.error.step})` : p.error.message,
      timestamp: isoNow(),
    };
    this.dispatchWs(ev);
    await this.dispatchEmail(ev, true);
  }

  private dispatchWs(ev: OsNotifierEvent): void {
    try {
      this.ws.send(ev.clientId, ev);
    } catch (e) {
      console.warn("[OsNotifier] WsNotifier.send failed; continuing.", e);
    }
  }

  private async dispatchEmail(ev: OsNotifierEvent, allow: boolean): Promise<void> {
    if (!allow) return;
    try {
      await this.email.send(ev.clientId, ev);
    } catch (e) {
      console.warn("[OsNotifier] EmailNotifier.send failed.", e);
    }
  }
}

let notifierBootstrapped = false;

export function initOsNotifier(bus: OsEventBus = osEventBus, ws?: IWsNotifier, email?: IEmailNotifier): void {
  if (notifierBootstrapped) return;
  notifierBootstrapped = true;
  OsNotifier.getInstance(bus, ws, email);
}

export function resetOsNotifierForTests(): void {
  notifierBootstrapped = false;
  OsNotifier.resetForTests();
}
