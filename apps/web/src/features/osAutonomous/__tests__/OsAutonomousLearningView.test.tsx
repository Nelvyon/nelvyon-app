import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import type { UserRole } from "@/core/auth/types";

let mockRole: UserRole = "operator";

const useDashboardMock = vi.fn();

vi.mock("@/features/osAutonomous/hooks", () => ({
  useOsAutonomousLearningDashboard: () => useDashboardMock(),
}));

vi.mock("@/core/auth/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: "u-1", email: "u@test.com", role: mockRole },
  }),
}));

import { OsAutonomousLearningView } from "@/features/osAutonomous/OsAutonomousLearningView";

const sampleDashboard = {
  computed_at: "2026-06-08T00:00:00Z",
  storage_mode: "local",
  ga4: {
    mode: "none",
    real_enabled: false,
    mock_realistic: false,
    property_configured: false,
    credentials_configured: false,
    message: "Sin GA4 configurado.",
  },
  outcomes_count: 2,
  enriched_count: 0,
  autonomy_pct: 86,
  top_templates: [
    {
      template_id: "landing-cro-v3",
      sector: "restaurant",
      service: "landing",
      category: "landing",
      rank_position: 1,
      final_template_score: 79.5,
      conversion_score: 72.1,
      quality_score: 80,
      sample_size: 3,
      qa_score: 88,
      conversion_rate: 9.2,
      lead_count: 12,
      approved_by_client: true,
      approved_by_client_rate: 1,
      revisions_count: 0,
      cold_start: false,
    },
  ],
  by_sector: [
    {
      sector: "restaurant",
      service: null,
      templates_count: 1,
      top_template_id: "landing-cro-v3",
      top_final_score: 79.5,
      avg_conversion_score: 72.1,
      templates: [],
    },
  ],
  by_service: [
    {
      sector: null,
      service: "landing",
      templates_count: 1,
      top_template_id: "landing-cro-v3",
      top_final_score: 79.5,
      avg_conversion_score: 72.1,
      templates: [],
    },
  ],
  trend_30d: [],
  alerts: [],
  alerts_count: 0,
  refresh_status: null,
  exports_available: { rankings: true, outcomes: false, sector_summary: false },
};

describe("OsAutonomousLearningView", () => {
  beforeEach(() => {
    mockRole = "operator";
    vi.clearAllMocks();
    useDashboardMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: sampleDashboard,
    });
  });

  it("renders top templates", async () => {
    render(<OsAutonomousLearningView />);
    await waitFor(() => expect(screen.getByText("landing-cro-v3")).toBeTruthy());
    expect(screen.getByText(/Top plantillas/i)).toBeTruthy();
    expect(screen.getByText("79.5")).toBeTruthy();
  });

  it("shows empty state without data", async () => {
    useDashboardMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        ...sampleDashboard,
        outcomes_count: 0,
        top_templates: [],
        by_sector: [],
        by_service: [],
      },
    });
    render(<OsAutonomousLearningView />);
    await waitFor(() => expect(screen.getByText(/Sin datos de learning/i)).toBeTruthy());
  });

  it("shows API error", async () => {
    useDashboardMock.mockReturnValue({
      isLoading: false,
      error: { status: 403, message: "Forbidden" },
      data: undefined,
    });
    render(<OsAutonomousLearningView />);
    await waitFor(() => expect(screen.getByText(/No se pudo cargar/i)).toBeTruthy());
  });

  it("shows alerts panel", async () => {
    useDashboardMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        ...sampleDashboard,
        alerts_count: 1,
        alerts: [
          {
            id: "a1",
            type: "qa_score_low",
            severity: "warn",
            message: "QA score 72 < 85",
            at: "2026-06-08T00:00:00Z",
          },
        ],
      },
    });
    render(<OsAutonomousLearningView />);
    await waitFor(() => expect(screen.getByText(/Alertas internas/i)).toBeTruthy());
    expect(screen.getByText(/qa_score_low/i)).toBeTruthy();
  });

  it("blocks viewer role", () => {
    mockRole = "viewer";
    render(<OsAutonomousLearningView />);
    expect(screen.getByText(/Acceso restringido/i)).toBeTruthy();
    expect(screen.queryByText(/Top plantillas/i)).toBeNull();
  });
});
