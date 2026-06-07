/** Isolated landing builder wrapper — mock only, no production deploy */

import { runBuildLandingMock } from "../agents/mockAgents";

export interface LandingBuildInput {
  brief: Record<string, unknown>;
  copy: Record<string, unknown>;
  design: Record<string, unknown>;
}

export function buildLandingIsolated(input: LandingBuildInput) {
  const result = runBuildLandingMock(input.brief, input.copy, input.design);
  return {
    ...result.build,
    isolated: true,
    production_deploy: false,
    builder: "landing_builder_mock_wrapper",
  };
}
