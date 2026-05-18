import { apiClient } from "@/core/api";
import { ExampleItem } from "@/features/example/types";

interface ExampleListResponse {
  items: ExampleItem[];
}

export const exampleApi = {
  list: () => apiClient.get<ExampleListResponse>("/api/v1/entities/contacts", { tenantScoped: true }),
};
