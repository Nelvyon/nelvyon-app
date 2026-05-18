import { useQuery } from "@tanstack/react-query";

import { exampleApi } from "@/features/example/api";

export function useExampleItems() {
  return useQuery({
    queryKey: ["example-items"],
    queryFn: exampleApi.list,
  });
}
