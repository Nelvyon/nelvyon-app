import React from "react";
import { render, screen } from "@testing-library/react";

import { CampaignForm } from "@/features/campaigns/components/CampaignForm";

describe("CampaignForm", () => {
  it("disables submit when role cannot create/edit", () => {
    render(
      <CampaignForm
        canSubmit={false}
        onSubmit={async () => {
          return;
        }}
      />,
    );

    expect(screen.getByRole("button", { name: /save campaign/i })).toBeDisabled();
    expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
  });
});
