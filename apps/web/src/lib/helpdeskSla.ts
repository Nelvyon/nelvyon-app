/** SLA targets (minutes) — aligned with backend/services/helpdesk_notifications.py */

export const SLA_TARGETS = {
  urgent: { first_response: 15, resolution: 120 },
  high: { first_response: 60, resolution: 480 },
  medium: { first_response: 240, resolution: 1440 },
  low: { first_response: 480, resolution: 4320 },
} as const;

export type SlaPriority = keyof typeof SLA_TARGETS;

export type SlaLevel = "ok" | "warning" | "breach";

export function normalizePriority(raw?: string | null): SlaPriority {
  const p = (raw ?? "medium").toLowerCase();
  if (p === "normal") return "medium";
  if (p in SLA_TARGETS) return p as SlaPriority;
  if (p === "critical") return "urgent";
  return "medium";
}

export function isOpenStatus(status?: string | null): boolean {
  const s = (status ?? "open").toLowerCase();
  return ["open", "in_progress", "pending", "waiting"].includes(s);
}

export function isClosedStatus(status?: string | null): boolean {
  const s = (status ?? "").toLowerCase();
  return ["closed", "resolved"].includes(s);
}

function minutesSince(iso?: string | null): number {
  if (!iso) return 0;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
}

function slaLevel(elapsed: number, target: number, responded: boolean): SlaLevel {
  if (responded) return "ok";
  if (elapsed > target) return "breach";
  if (elapsed > target * 0.75) return "warning";
  return "ok";
}

export type TicketSlaFields = {
  status?: string | null;
  priority?: string | null;
  created_at?: string | null;
  first_response_minutes?: number | null;
  resolved_at?: string | null;
};

export type TicketSlaView = {
  priority: SlaPriority;
  first_response: {
    target_minutes: number;
    elapsed_minutes: number;
    status: SlaLevel;
    met: boolean;
  };
  resolution: {
    target_minutes: number;
    elapsed_minutes: number;
    status: SlaLevel;
    met: boolean;
  };
};

export function computeTicketSla(ticket: TicketSlaFields): TicketSlaView {
  const priority = normalizePriority(ticket.priority);
  const targets = SLA_TARGETS[priority];
  const elapsed = minutesSince(ticket.created_at);
  const hasFirstResponse = ticket.first_response_minutes != null && ticket.first_response_minutes >= 0;
  const closed = isClosedStatus(ticket.status);

  const frElapsed = hasFirstResponse ? ticket.first_response_minutes! : elapsed;
  const resElapsed = closed && ticket.resolved_at
    ? minutesSince(ticket.created_at) // approx; could diff resolved_at - created_at
    : elapsed;

  const firstMet = hasFirstResponse && ticket.first_response_minutes! <= targets.first_response;
  const resMet = closed; // if closed, consider resolution tracked

  return {
    priority,
    first_response: {
      target_minutes: targets.first_response,
      elapsed_minutes: frElapsed,
      status: firstMet
        ? "ok"
        : slaLevel(frElapsed, targets.first_response, hasFirstResponse),
      met: firstMet || (!isOpenStatus(ticket.status) && hasFirstResponse),
    },
    resolution: {
      target_minutes: targets.resolution,
      elapsed_minutes: resElapsed,
      status: closed
        ? resElapsed <= targets.resolution
          ? "ok"
          : "breach"
        : slaLevel(elapsed, targets.resolution, closed),
      met: closed && resElapsed <= targets.resolution,
    },
  };
}

export type HelpdeskStats = {
  open_count: number;
  pending_count: number;
  closed_count: number;
  total_count: number;
  at_risk_count: number;
  sla_first_response_breaches: number;
  sla_resolution_breaches: number;
  sla_compliance_rate: number;
  avg_first_response_minutes: number | null;
  oldest_open_hours: number;
  by_priority: { priority: string; count: number }[];
  by_status: { status: string; count: number }[];
};

export function computeHelpdeskStats(
  tickets: Array<TicketSlaFields & { id?: number; subject?: string }>,
): HelpdeskStats {
  let open = 0;
  let pending = 0;
  let closed = 0;
  let atRisk = 0;
  let frBreaches = 0;
  let resBreaches = 0;
  let frSum = 0;
  let frCount = 0;
  let oldestOpenHours = 0;
  const byPriority = new Map<string, number>();
  const byStatus = new Map<string, number>();

  for (const t of tickets) {
    const status = (t.status ?? "open").toLowerCase();
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
    const pri = normalizePriority(t.priority);
    byPriority.set(pri, (byPriority.get(pri) ?? 0) + 1);

    if (status === "open") open += 1;
    else if (["in_progress", "pending", "waiting"].includes(status)) pending += 1;
    else if (["closed", "resolved"].includes(status)) closed += 1;

    const sla = computeTicketSla(t);
    if (isOpenStatus(t.status)) {
      const hours = minutesSince(t.created_at) / 60;
      if (hours > oldestOpenHours) oldestOpenHours = hours;
      if (sla.first_response.status === "breach" || sla.resolution.status === "breach") atRisk += 1;
    }
    if (sla.first_response.status === "breach" && isOpenStatus(t.status)) frBreaches += 1;
    if (sla.resolution.status === "breach" && isOpenStatus(t.status)) resBreaches += 1;

    if (t.first_response_minutes != null) {
      frSum += t.first_response_minutes;
      frCount += 1;
    }
  }

  const total = tickets.length;
  const complianceDenom = total || 1;
  const breachTotal = frBreaches + resBreaches;
  const sla_compliance_rate = Math.round(Math.max(0, 100 - (breachTotal / complianceDenom) * 100));

  return {
    open_count: open,
    pending_count: pending,
    closed_count: closed,
    total_count: total,
    at_risk_count: atRisk,
    sla_first_response_breaches: frBreaches,
    sla_resolution_breaches: resBreaches,
    sla_compliance_rate,
    avg_first_response_minutes: frCount > 0 ? Math.round(frSum / frCount) : null,
    oldest_open_hours: Math.round(oldestOpenHours * 10) / 10,
    by_priority: [...byPriority.entries()].map(([priority, count]) => ({ priority, count })),
    by_status: [...byStatus.entries()].map(([status, count]) => ({ status, count })),
  };
}
