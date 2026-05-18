import React from "react";
import { render, screen } from "@testing-library/react";

import { OsHealthBanner } from "@/features/os/components/OsHealthBanner";

describe("OsHealthBanner", () => {
  it("shows incidents copy when there are failed jobs", () => {
    render(<OsHealthBanner billingUsageAlerts={0} failedJobs={2} pendingJobs={0} />);

    expect(screen.getByText(/incidents/i)).toBeInTheDocument();
    expect(screen.getByText(/failed automation jobs/i)).toBeInTheDocument();
  });

  it("shows all-clear when healthy", () => {
    render(<OsHealthBanner billingUsageAlerts={0} failedJobs={0} pendingJobs={0} />);

    expect(screen.getByText(/workspace status/i)).toBeInTheDocument();
  });
});
