import React from "react";
import { render, screen } from "@testing-library/react";

import { DealsAtRiskPanel } from "@/features/deals/components/DealsAtRiskPanel";

describe("DealsAtRiskPanel", () => {
  it("shows risky deals from stage aging", () => {
    render(
      <DealsAtRiskPanel
        deals={[
          { id: 1, user_id: "u", workspace_id: 1, title: "Deal A", days_in_stage: 20, stage: "proposal" },
          { id: 2, user_id: "u", workspace_id: 1, title: "Deal B", days_in_stage: 3, stage: "lead" },
        ]}
      />,
    );
    expect(screen.getByText(/deal a/i)).toBeInTheDocument();
    expect(screen.queryByText(/deal b/i)).not.toBeInTheDocument();
  });
});
