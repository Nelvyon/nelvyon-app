import { useQuery } from "@tanstack/react-query";

import { osAutonomousLearningApi } from "@/features/osAutonomous/api";

export function useOsAutonomousLearningDashboard() {
  return useQuery({
    queryKey: ["os", "autonomous", "learning"],
    queryFn: () => osAutonomousLearningApi.dashboard(),
    staleTime: 60_000,
  });
}
