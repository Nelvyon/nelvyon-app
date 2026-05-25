import { apiClient } from "@/core/api";

import type { AppLocale } from "../../../i18n";

export type RegionSettings = {
  language: string;
  timezone: string;
  date_format: string;
  workspace_locale?: string;
};

export const localeSettingsApi = {
  getRegion: () =>
    apiClient.get<RegionSettings>("/api/settings/region", { tenantScoped: true }),

  setLanguage: (language: AppLocale) =>
    apiClient.put<{ language: string }>("/api/settings/language", {
      tenantScoped: true,
      body: { language },
    }),

  setTimezone: (timezone: string, date_format?: string) =>
    apiClient.put<{ timezone: string; date_format?: string }>("/api/settings/timezone", {
      tenantScoped: true,
      body: { timezone, date_format },
    }),

  listTimezones: () =>
    apiClient.get<{ timezones: string[]; date_formats: string[] }>("/api/settings/timezones"),
};
