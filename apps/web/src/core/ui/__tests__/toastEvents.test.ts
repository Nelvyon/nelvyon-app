import { describe, expect, it, vi } from "vitest";

import { emitToast, subscribeToasts } from "@/core/ui/toastEvents";

describe("toastEvents", () => {
  it("delivers payload to subscribers", () => {
    const fn = vi.fn();
    const unsub = subscribeToasts(fn);
    emitToast({ id: "1", tone: "success", message: "Saved" });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ message: "Saved", tone: "success" }));
    unsub();
    emitToast({ id: "2", tone: "info", message: "x" });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
