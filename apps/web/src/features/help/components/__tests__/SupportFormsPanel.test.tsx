import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SupportFormsPanel } from "@/features/help/components/SupportFormsPanel";
import { useCreateTicket } from "@/features/inbox_helpdesk/hooks";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/core/auth/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u-1", email: "u@test.com", role: "operator" },
  }),
}));

vi.mock("@/features/inbox_helpdesk/hooks", () => ({
  useCreateTicket: vi.fn(),
}));

describe("SupportFormsPanel", () => {
  beforeEach(() => {
    push.mockReset();
    vi.clearAllMocks();
  });

  it("submits bug form as structured helpdesk ticket", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ id: 88 });
    vi.mocked(useCreateTicket).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateTicket>);

    render(<SupportFormsPanel />);

    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Campaign save fails" } });
    fireEvent.change(screen.getByLabelText("Details"), { target: { value: "500 when saving status draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "[BUG] Campaign save fails",
          category: "bug",
          channel: "in_app_help_center",
          status: "open",
          priority: "high",
        }),
      );
      expect(push).toHaveBeenCalledWith("/inbox/tickets/88");
    });
  });
});
