import React from "react";
import { render, screen } from "@testing-library/react";

import { BillingUpgradeCta } from "@/features/billing/components/BillingUpgradeCta";

describe("BillingUpgradeCta", () => {
  it("shows admin-only copy when upgrade is not allowed", () => {
    render(
      <BillingUpgradeCta canUpgrade={false} metersAtRisk={["contacts"]} planId="starter" />,
    );

    expect(screen.getByText(/managed by your account owner/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /review upgrade options/i })).not.toBeInTheDocument();
  });
});
