import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { SecurityEventsTable } from "@/features/settings/components/SecurityEventsTable";

describe("SecurityEventsTable", () => {
  it("renders core columns and filters by severity", () => {
    render(
      <SecurityEventsTable
        events={[
          {
            id: 1,
            user_id: "u1",
            event_type: "saas.helpdesk.transition_ticket",
            severity: "info",
            status: "ok",
            created_at: "2026-04-27T08:00:00.000Z",
            details_json: JSON.stringify({ actor_email: "ops@test.com" }),
          },
          {
            id: 2,
            user_id: "u2",
            event_type: "saas.rbac.denied",
            severity: "warning",
            status: "denied",
            created_at: "2026-04-27T08:10:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByText("saas.helpdesk.transition_ticket")).toBeInTheDocument();
    expect(screen.getByText("saas.rbac.denied")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filter severity"), { target: { value: "warning" } });
    expect(screen.queryByText("saas.helpdesk.transition_ticket")).not.toBeInTheDocument();
    expect(screen.getByText("saas.rbac.denied")).toBeInTheDocument();
  });
});
