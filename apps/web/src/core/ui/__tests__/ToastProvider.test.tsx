import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { emitToast } from "@/core/ui/toastEvents";
import { ToastProvider } from "@/core/ui/ToastProvider";

describe("ToastProvider", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders emitted toast and auto-dismisses after delay", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <span>child</span>
      </ToastProvider>,
    );

    expect(screen.getByText("child")).toBeInTheDocument();

    act(() => {
      emitToast({ id: "toast-1", tone: "success", message: "Saved." });
    });
    expect(screen.getByText("Saved.")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4600);
    });
    expect(screen.queryByText("Saved.")).not.toBeInTheDocument();
  });

  it("removes toast when dismiss is activated", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <span>child</span>
      </ToastProvider>,
    );

    act(() => {
      emitToast({ id: "toast-2", tone: "info", message: "Note" });
    });
    expect(screen.getByText("Note")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /dismiss notification/i }));
    expect(screen.queryByText("Note")).not.toBeInTheDocument();
  });
});
