import { randomBytes } from "crypto";

import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import type { ILlmClient } from "../os-agents/LlmClient";
import { LLM_DEFAULT_MODEL, LLM_DEFAULT_MAX_TOKENS, LlmClient } from "../os-agents/LlmClient";

export type BookingStatus = "confirmed" | "cancelled" | "rescheduled";

export type DayInterval = { start: string; end: string };

export type WeeklyAvailabilityConfig = {
  monday?: DayInterval[];
  tuesday?: DayInterval[];
  wednesday?: DayInterval[];
  thursday?: DayInterval[];
  friday?: DayInterval[];
  saturday?: DayInterval[];
  sunday?: DayInterval[];
};

export type AvailabilityConfig = WeeklyAvailabilityConfig & {
  slotDuration: number;
  timezone: string;
};

export type CreateBookingInput = {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  date: string;
  time: string;
  duration?: number;
  notes?: string;
};

export type Booking = {
  id: string;
  userId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  date: string;
  time: string;
  duration: number;
  notes: string | null;
  status: BookingStatus;
  confirmationToken: string;
  createdAt: string;
  updatedAt: string;
};

export type BookingFilters = {
  status?: BookingStatus;
  fromDate?: string;
  toDate?: string;
};

export type BookingServiceDeps = {
  db?: Pick<DbClient, "query">;
  llm?: ILlmClient;
};

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function parseTimeToMinutes(timeStr: string): number {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(timeStr.trim());
  if (!m) return 0;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return 0;
  return h * 60 + min;
}

export function formatMinutesToHHmm(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const mm = Math.floor(totalMinutes % 60);
  return `${pad2(h)}:${pad2(mm)}`;
}

function weekdayKeyFromISODate(dateStr: string): keyof WeeklyAvailabilityConfig | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  const key = DAY_KEYS[dow];
  return key as keyof WeeklyAvailabilityConfig;
}

function rangesOverlap(aStart: number, aLen: number, bStart: number, bLen: number): boolean {
  const aEnd = aStart + aLen;
  const bEnd = bStart + bLen;
  return aStart < bEnd && bStart < aEnd;
}

function normalizePgTime(t: unknown): string {
  if (typeof t === "string") {
    const m = /^(\d{2}):(\d{2})/.exec(t);
    return m ? `${m[1]}:${m[2]}` : t.slice(0, 5);
  }
  return "00:00";
}

function normalizePgDate(d: unknown): string {
  if (typeof d === "string") return d.slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

function mapBookingRow(r: {
  id: string;
  user_id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  booking_date: unknown;
  booking_time: unknown;
  duration: number;
  notes: string | null;
  status: string;
  confirmation_token: string;
  created_at: Date | string;
  updated_at: Date | string;
}): Booking {
  return {
    id: r.id,
    userId: r.user_id,
    clientName: r.client_name,
    clientEmail: r.client_email,
    clientPhone: r.client_phone,
    date: normalizePgDate(r.booking_date),
    time: normalizePgTime(r.booking_time),
    duration: typeof r.duration === "number" ? r.duration : Number(r.duration ?? 30),
    notes: r.notes,
    status: r.status as BookingStatus,
    confirmationToken: r.confirmation_token,
    createdAt:
      r.created_at == null
        ? new Date().toISOString()
        : typeof r.created_at === "string"
          ? r.created_at
          : r.created_at.toISOString(),
    updatedAt:
      r.updated_at == null
        ? new Date().toISOString()
        : typeof r.updated_at === "string"
          ? r.updated_at
          : r.updated_at.toISOString(),
  };
}

function weeklyFromConfig(config: Record<string, unknown>): WeeklyAvailabilityConfig {
  const keys: (keyof WeeklyAvailabilityConfig)[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  const out: WeeklyAvailabilityConfig = {};
  for (const k of keys) {
    const v = config[k];
    if (Array.isArray(v)) {
      const intervals: DayInterval[] = [];
      for (const item of v) {
        if (typeof item === "object" && item !== null) {
          const o = item as Record<string, unknown>;
          const start = typeof o.start === "string" ? o.start : "";
          const end = typeof o.end === "string" ? o.end : "";
          if (start && end) intervals.push({ start, end });
        }
      }
      if (intervals.length > 0) out[k] = intervals;
    }
  }
  return out;
}

function mergeAvailabilityRecord(row: {
  config: unknown;
  timezone: string;
  slot_duration: number;
}): AvailabilityConfig {
  const conf =
    typeof row.config === "object" && row.config !== null ? (row.config as Record<string, unknown>) : {};
  const weekly = weeklyFromConfig(conf);
  return {
    ...weekly,
    slotDuration: row.slot_duration,
    timezone: row.timezone,
  };
}

export class BookingService {
  constructor(private readonly deps: BookingServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? LlmClient.getInstance();
  }

  async createAvailability(userId: string, config: AvailabilityConfig): Promise<AvailabilityConfig> {
    const weeklyJson: Record<string, unknown> = {};
    const keys: (keyof WeeklyAvailabilityConfig)[] = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    for (const k of keys) {
      const v = config[k];
      if (Array.isArray(v) && v.length > 0) weeklyJson[k as string] = v;
    }

    const rows = await this.db.query<{
      config: unknown;
      timezone: string;
      slot_duration: number;
    }>(
      `INSERT INTO booking_availability (user_id, config, timezone, slot_duration, updated_at)
       VALUES ($1::uuid, $2::jsonb, $3, $4, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         config = EXCLUDED.config,
         timezone = EXCLUDED.timezone,
         slot_duration = EXCLUDED.slot_duration,
         updated_at = NOW()
       RETURNING config, timezone, slot_duration`,
      [userId, JSON.stringify(weeklyJson), config.timezone, config.slotDuration],
    );
    const row = rows[0];
    if (!row) throw new Error("createAvailability: no row returned");
    return mergeAvailabilityRecord(row);
  }

  async getAvailability(userId: string): Promise<AvailabilityConfig | null> {
    const rows = await this.db.query<{
      config: unknown;
      timezone: string;
      slot_duration: number;
    }>(
      `SELECT config, timezone, slot_duration
       FROM booking_availability
       WHERE user_id = $1::uuid
       LIMIT 1`,
      [userId],
    );
    const row = rows[0];
    if (!row) return null;
    return mergeAvailabilityRecord(row);
  }

  async getAvailableSlots(userId: string, date: string): Promise<string[]> {
    const avail = await this.getAvailability(userId);
    if (!avail) return [];

    const dayKey = weekdayKeyFromISODate(date);
    if (!dayKey) return [];

    const windows = (avail as WeeklyAvailabilityConfig)[dayKey];
    if (!Array.isArray(windows) || windows.length === 0) return [];

    const slotDur = avail.slotDuration > 0 ? avail.slotDuration : 30;

    const bookingRows = await this.db.query<{
      booking_time: unknown;
      duration: number;
      status: string;
    }>(
      `SELECT booking_time, duration, status
       FROM bookings
       WHERE user_id = $1::uuid
         AND booking_date = $2::date
         AND status IN ('confirmed', 'rescheduled')`,
      [userId, date],
    );

    const occupied = bookingRows.map((b) => ({
      startMin: parseTimeToMinutes(normalizePgTime(b.booking_time)),
      dur:
        typeof b.duration === "number" && Number.isFinite(b.duration) && b.duration > 0 ? b.duration : slotDur,
    }));

    const slots: string[] = [];

    for (const win of windows) {
      let cursor = parseTimeToMinutes(win.start);
      const winEnd = parseTimeToMinutes(win.end);
      while (cursor + slotDur <= winEnd) {
        let clash = false;
        for (const o of occupied) {
          if (rangesOverlap(cursor, slotDur, o.startMin, o.dur)) {
            clash = true;
            break;
          }
        }
        if (!clash) slots.push(formatMinutesToHHmm(cursor));
        cursor += slotDur;
      }
    }

    return [...new Set(slots)].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
  }

  async createBooking(ownerUserId: string, input: CreateBookingInput): Promise<Booking> {
    const avail = await this.getAvailability(ownerUserId);
    const slotDur = avail?.slotDuration && avail.slotDuration > 0 ? avail.slotDuration : 30;
    const duration = typeof input.duration === "number" && input.duration > 0 ? input.duration : slotDur;

    const token = randomBytes(24).toString("hex");

    const rows = await this.db.query<Parameters<typeof mapBookingRow>[0]>(
      `INSERT INTO bookings (
         user_id, client_name, client_email, client_phone,
         booking_date, booking_time, duration, notes,
         status, confirmation_token, updated_at
       )
       VALUES (
         $1::uuid, $2, $3, $4,
         $5::date, $6::time, $7, $8,
         'confirmed', $9, NOW()
       )
       RETURNING id::text, user_id::text, client_name, client_email, client_phone,
                 booking_date, booking_time, duration, notes,
                 status, confirmation_token, created_at, updated_at`,
      [
        ownerUserId,
        input.clientName.trim(),
        input.clientEmail.trim(),
        input.clientPhone?.trim() || null,
        input.date,
        input.time.length === 5 ? `${input.time}:00` : input.time,
        duration,
        input.notes?.trim() || null,
        token,
      ],
    );
    const r = rows[0];
    if (!r) throw new Error("createBooking: insert failed");
    return mapBookingRow(r);
  }

  async cancelBooking(bookingId: string, token: string): Promise<Booking | null> {
    const rows = await this.db.query<Parameters<typeof mapBookingRow>[0]>(
      `UPDATE bookings
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1::uuid AND confirmation_token = $2 AND status <> 'cancelled'
       RETURNING id::text, user_id::text, client_name, client_email, client_phone,
                 booking_date, booking_time, duration, notes,
                 status, confirmation_token, created_at, updated_at`,
      [bookingId, token],
    );
    const r = rows[0];
    return r ? mapBookingRow(r) : null;
  }

  async rescheduleBooking(bookingId: string, token: string, newDate: string, newTime: string): Promise<Booking | null> {
    const timeSql = newTime.length === 5 ? `${newTime}:00` : newTime;
    const rows = await this.db.query<Parameters<typeof mapBookingRow>[0]>(
      `UPDATE bookings
       SET booking_date = $3::date,
           booking_time = $4::time,
           status = 'rescheduled',
           updated_at = NOW()
       WHERE id = $1::uuid AND confirmation_token = $2 AND status <> 'cancelled'
       RETURNING id::text, user_id::text, client_name, client_email, client_phone,
                 booking_date, booking_time, duration, notes,
                 status, confirmation_token, created_at, updated_at`,
      [bookingId, token, newDate, timeSql],
    );
    const r = rows[0];
    return r ? mapBookingRow(r) : null;
  }

  async getBookings(userId: string, filters?: BookingFilters): Promise<Booking[]> {
    const params: unknown[] = [userId];
    let idx = 2;
    let sql = `SELECT id::text, user_id::text, client_name, client_email, client_phone,
                      booking_date, booking_time, duration, notes,
                      status, confirmation_token, created_at, updated_at
               FROM bookings
               WHERE user_id = $1::uuid`;

    if (filters?.status) {
      sql += ` AND status = $${idx}::varchar`;
      params.push(filters.status);
      idx += 1;
    }
    if (filters?.fromDate) {
      sql += ` AND booking_date >= $${idx}::date`;
      params.push(filters.fromDate);
      idx += 1;
    }
    if (filters?.toDate) {
      sql += ` AND booking_date <= $${idx}::date`;
      params.push(filters.toDate);
      idx += 1;
    }

    sql += ` ORDER BY booking_date ASC, booking_time ASC`;

    const rows = await this.db.query<Parameters<typeof mapBookingRow>[0]>(sql, params);
    return rows.map(mapBookingRow);
  }

  async getBookingById(bookingId: string, userId: string): Promise<Booking | null> {
    const rows = await this.db.query<Parameters<typeof mapBookingRow>[0]>(
      `SELECT id::text, user_id::text, client_name, client_email, client_phone,
              booking_date, booking_time, duration, notes,
              status, confirmation_token, created_at, updated_at
       FROM bookings
       WHERE id = $1::uuid AND user_id = $2::uuid
       LIMIT 1`,
      [bookingId, userId],
    );
    const r = rows[0];
    return r ? mapBookingRow(r) : null;
  }

  async sendReminder(userId: string, bookingId: string): Promise<string> {
    const booking = await this.getBookingById(bookingId, userId);
    if (!booking) {
      throw new Error("sendReminder: booking not found");
    }
    const prompt = `Eres un asistente de agenda. Escribe un mensaje breve y cordial de recordatorio de cita (español),
listo para enviar por WhatsApp o email (texto plano, sin JSON).

Datos:
- Cliente: ${booking.clientName}
- Email: ${booking.clientEmail}
- Fecha: ${booking.date}
- Hora: ${booking.time}
- Duración (min): ${booking.duration}
${booking.notes ? `- Notas: ${booking.notes}` : ""}

Incluye confirmación implícita y cómo reprogramar si necesitan cambiar (sin inventar enlaces).`;

    return this.llm.complete(prompt, {
      model: LLM_DEFAULT_MODEL,
      maxTokens: LLM_DEFAULT_MAX_TOKENS,
      temperature: 0.1,
    });
  }
}

let cachedBookingService: BookingService | undefined;

export function getBookingService(): BookingService {
  if (!cachedBookingService) cachedBookingService = new BookingService();
  return cachedBookingService;
}

export function resetBookingServiceForTests(): void {
  cachedBookingService = undefined;
}
