import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, it, vi } from "vitest";

import { CampaignBootstrapWizard } from "@/features/campaigns/components/CampaignBootstrapWizard";
import { useClients } from "@/features/crm/hooks";
import { useCreateProject } from "@/features/projects/hooks";

vi.mock("@/features/crm/hooks", () => ({
  useClients: vi.fn(),
}));

vi.mock("@/features/projects/hooks", () => ({
  useCreateProject: vi.fn(),
}));

describe("CampaignBootstrapWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates project first and uses returned project id for campaign", async () => {
    vi.mocked(useClients).mockReturnValue({
      data: {
        items: [{ id: 9, business_name: "Acme", sector: "tech", workspace_id: 1, user_id: "u-1" }],
        total: 1,
        skip: 0,
        limit: 20,
      },
      isLoading: false,
    } as ReturnType<typeof useClients>);

    const mutateAsync = vi.fn().mockResolvedValue({ id: 41 });
    vi.mocked(useCreateProject).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateProject>);

    const onCreateCampaign = vi.fn().mockResolvedValue(undefined);
    render(<CampaignBootstrapWizard canSubmit isCreatingCampaign={false} onCreateCampaign={onCreateCampaign} />);

    expect(screen.queryByText(/Project id/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "9" } });
    fireEvent.change(screen.getByPlaceholderText("Q2 Launch Project"), { target: { value: "Launch 2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Create project" }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        client_id: 9,
        name: "Launch 2026",
        project_type: "marketing",
        status: "active",
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Create first campaign" }));

    await waitFor(() => {
      expect(onCreateCampaign).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: 41,
          client_id: 9,
          platform: "meta_ads",
          campaign_type: "lead_gen",
          status: "draft",
        }),
      );
    });
  });
});
