import React from "react";
import { render, screen } from "@testing-library/react";

import { RetryJobSection } from "@/features/automations/components/RetryJobSection";

describe("RetryJobSection", () => {
  it("disables retry when role cannot mutate", () => {
    render(
      <RetryJobSection
        canSubmit={false}
        onRetry={async () => {
          return;
        }}
      />,
    );

    expect(screen.getByRole("button", { name: /retry job/i })).toBeDisabled();
    expect(screen.getByText(/only operator\/admin/i)).toBeInTheDocument();
  });
});
