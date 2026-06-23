import React from "react";
import { render, screen } from "@testing-library/react";

import { TicketStatusForm } from "@/features/inbox_helpdesk/components/TicketStatusForm";

describe("TicketStatusForm", () => {
  it("disables update for non-operator roles", () => {
    render(
      <TicketStatusForm
        canSubmit={false}
        onSubmit={async () => {
          return;
        }}
      />,
    );

    expect(screen.getByRole("button", { name: /guardar estado/i })).toBeDisabled();
    expect(screen.getByText(/solo operadores/i)).toBeInTheDocument();
  });
});
