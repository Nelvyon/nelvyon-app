import {
  resolveTenantLocale,
  type LocaleId,
} from "../../../../../backend/agency/LocalizationCore";

/**
 * Region bootstrap locale resolution.
 * Precedence matches LocalizationCore.resolveTenantLocale:
 * workspace/tenant locale > user language > cookie (browser) > es.
 */
export function resolveBootstrapLocale(input: {
  workspaceLocale?: string | null;
  userLanguage?: string | null;
  cookieLocale?: string | null;
}): LocaleId {
  return resolveTenantLocale({
    tenantPreferredLocale: input.workspaceLocale,
    userPreferredLocale: input.userLanguage,
    browserLocale: input.cookieLocale,
  });
}
