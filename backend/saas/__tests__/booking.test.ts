// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  BookingService,
  formatMinutesToHHmm,
  getBookingService,
  parseTimeToMinutes,
  resetBookingServiceForTests,
} from "../BookingService";

const USER_ID = "00000000-0000-0000-0000-0000000000dd";
const BOOK_ID = "11111111-1111-1111-1111-111111111111";

function rowTemplate(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: BOOK_ID,
    user_id: USER_ID,
    client_name: "Ana",
    client_email: "ana@test.com",
    client_phone: null,
    booking_date: "2026-07-01",
    booking_time: "10:00:00",
    duration: 30,
    notes: null,
    status: "confirmed",
    confirmation_token: "secrettoken",
    created_at: new Date("2026-06-01T12:00:00.000Z"),
    updated_at: new Date("2026-06-01T12:00:00.000Z"),
    ...over,
  };
}

describe("BookingService", () => {
  beforeEach(() => {
    resetBookingServiceForTests();
    vi.clearAllMocks();
  });

  it("parseTimeToMinutes / formatMinutesToHHmm", () => {
    expect(parseTimeToMinutes("09:30")).toBe(570);
    expect(formatMinutesToHHmm(570)).toBe("09:30");
  });

  it("createAvailability upsert", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        config: { monday: [{ start: "09:00", end: "17:00" }] },
        timezone: "UTC",
        slot_duration: 30,
      },
    ]);
    const svc = new BookingService({ db: { query }, llm: { complete: vi.fn() } });
    const out = await svc.createAvailability(USER_ID, {
      slotDuration: 30,
      timezone: "UTC",
      monday: [{ start: "09:00", end: "17:00" }],
    });
    expect(out.slotDuration).toBe(30);
    expect(String(query.mock.calls[0][0])).toContain("booking_availability");
  });

  it("getAvailableSlots excluye ocupadas", async () => {
    const availRow = {
      config: {
        wednesday: [{ start: "09:00", end: "11:00" }],
      },
      timezone: "UTC",
      slot_duration: 60,
    };
    const query = vi
      .fn()
      .mockResolvedValueOnce([availRow])
      .mockResolvedValueOnce([
        {
          booking_time: "09:00:00",
          duration: 60,
          status: "confirmed",
        },
      ]);
    const svc = new BookingService({ db: { query }, llm: { complete: vi.fn() } });
    const slots = await svc.getAvailableSlots(USER_ID, "2026-07-08");
    expect(slots).not.toContain("09:00");
    expect(slots).toContain("10:00");
  });

  it("createBooking inserta confirmada con token", async () => {
    const availRow = {
      config: { monday: [{ start: "09:00", end: "17:00" }] },
      timezone: "UTC",
      slot_duration: 30,
    };
    const query = vi.fn().mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes("INSERT INTO bookings")) return Promise.resolve([rowTemplate()]);
      if (s.includes("FROM booking_availability")) return Promise.resolve([availRow]);
      return Promise.resolve([]);
    });
    const svc = new BookingService({ db: { query }, llm: { complete: vi.fn() } });
    const booking = await svc.createBooking(USER_ID, {
      clientName: "Ana",
      clientEmail: "ana@test.com",
      date: "2026-07-01",
      time: "10:00",
    });
    expect(booking.status).toBe("confirmed");
    expect(booking.confirmationToken).toBeTruthy();
  });

  it("cancelBooking por token", async () => {
    const query = vi.fn().mockResolvedValueOnce([rowTemplate({ status: "cancelled" })]);
    const svc = new BookingService({ db: { query }, llm: { complete: vi.fn() } });
    const out = await svc.cancelBooking(BOOK_ID, "secrettoken");
    expect(out?.status).toBe("cancelled");
  });

  it("rescheduleBooking", async () => {
    const query = vi.fn().mockResolvedValueOnce([rowTemplate({ status: "rescheduled", booking_date: "2026-07-02", booking_time: "15:00:00" })]);
    const svc = new BookingService({ db: { query }, llm: { complete: vi.fn() } });
    const out = await svc.rescheduleBooking(BOOK_ID, "secrettoken", "2026-07-02", "15:00");
    expect(out?.status).toBe("rescheduled");
  });

  it("getBookings con filtros", async () => {
    const query = vi.fn().mockResolvedValueOnce([rowTemplate()]);
    const svc = new BookingService({ db: { query }, llm: { complete: vi.fn() } });
    const rows = await svc.getBookings(USER_ID, { status: "confirmed", fromDate: "2026-06-01", toDate: "2026-12-31" });
    expect(rows).toHaveLength(1);
    expect(query.mock.calls[0][0]).toContain("status");
  });

  it("sendReminder usa LLM", async () => {
    const llm = { complete: vi.fn().mockResolvedValue("Hola Ana, te recordamos tu cita.") };
    const query = vi.fn().mockResolvedValueOnce([rowTemplate()]);
    const svc = new BookingService({ db: { query }, llm });
    const text = await svc.sendReminder(USER_ID, BOOK_ID);
    expect(text).toContain("recordamos");
    expect(llm.complete).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ temperature: 0.1 }));
  });

  it("getBookingService singleton", () => {
    resetBookingServiceForTests();
    expect(getBookingService()).toBe(getBookingService());
  });
});
