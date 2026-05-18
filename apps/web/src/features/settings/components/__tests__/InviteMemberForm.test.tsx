import React from "react";
import { render, screen } from "@testing-library/react";

import { InviteMemberForm } from "@/features/settings/components/InviteMemberForm";

describe("InviteMemberForm", () => {
  it("disables submit when role cannot invite", () => {
    render(
      <InviteMemberForm
        canSubmit={false}
        onSubmit={async () => {
          return;
        }}
      />,
    );

    expect(screen.getByRole("button", { name: /send invite/i })).toBeDisabled();
    expect(screen.getByText(/only operator\/admin/i)).toBeInTheDocument();
  });
});
