import { describe, it, expect, vi } from "vitest";
import { runWithCronDeadline, CRON_ROUTE_DEADLINE_MS } from "../cronDeadline";

describe("runWithCronDeadline", () => {
  it("returns result when fn completes in time", async () => {
    await expect(runWithCronDeadline("test", async () => 42, 1000)).resolves.toBe(42);
  });

  it("rejects when fn exceeds deadline", async () => {
    vi.useFakeTimers();
    const pending = runWithCronDeadline(
      "slow",
      () => new Promise<number>((resolve) => setTimeout(() => resolve(1), CRON_ROUTE_DEADLINE_MS)),
      50,
    );
    // El manejador se engancha ANTES de mover el reloj.
    //
    // Al reves, `pending` rechazaba durante `advanceTimersByTimeAsync` sin
    // ningun `catch` puesto todavia, Node lo contaba como rechazo no
    // gestionado y vitest tumbaba el fichero entero por un error fuera de
    // toda prueba —verde en aislamiento, rojo en la suite completa—. La
    // asercion es exactamente la misma; lo unico que cambia es llegar a
    // tiempo.
    const esperado = expect(pending).rejects.toThrow(/deadline exceeded/);
    await vi.advanceTimersByTimeAsync(60);
    await esperado;
    vi.useRealTimers();
  });
});
