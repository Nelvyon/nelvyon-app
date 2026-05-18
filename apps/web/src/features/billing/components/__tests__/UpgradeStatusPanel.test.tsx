import React from "react";
import { render, screen } from "@testing-library/react";

import { UpgradeStatusPanel } from "@/features/billing/components/UpgradeStatusPanel";

describe("UpgradeStatusPanel", () => {
  it("renders paid state", () => {
    render(<UpgradeStatusPanel status="paid" />);
    expect(screen.getByText(/payment verified/i)).toBeInTheDocument();
  });

  it("renders cancelled state", () => {
    render(<UpgradeStatusPanel status="cancelled" />);
    expect(screen.getByText(/checkout cancelled/i)).toBeInTheDocument();
  });

  it("renders error state", () => {
    render(<UpgradeStatusPanel status="error" />);
    expect(screen.getByText(/checkout error/i)).toBeInTheDocument();
  });

  it("renders forbidden state", () => {
    render(<UpgradeStatusPanel status="forbidden" />);
    expect(screen.getByText(/admins only/i)).toBeInTheDocument();
  });
});
