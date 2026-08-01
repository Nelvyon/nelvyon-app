"use client";

import { useEffect } from "react";

import { useLocaleContext } from "@/core/i18n/LocaleProvider";
import { resolveBootstrapLocale } from "@/core/i18n/resolveBootstrapLocale";
import { localeSettingsApi } from "@/features/settings/localeApi";
import { isAppLocale } from "../../../i18n";

/** Load workspace timezone + locale from API after auth is ready. */
export function RegionBootstrap() {
  const { setTimezone, setDateFormat, setLocale, locale } = useLocaleContext();

  useEffect(() => {
    // Public marketing does not need FastAPI region bootstrap; skip to avoid CSP/console noise.
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    const isAppSurface =
      path.startsWith("/saas") ||
      path.startsWith("/os") ||
      path.startsWith("/portal") ||
      path.startsWith("/admin") ||
      path.startsWith("/dashboard");
    if (!isAppSurface) return;

    localeSettingsApi
      .getRegion()
      .then((r) => {
        if (r.timezone) setTimezone(r.timezone);
        if (r.date_format) setDateFormat(r.date_format);
        // Precedence: workspace locale > user language > cookie > es.
        // Cookie remains the source when the API call fails (catch below).
        const resolved = resolveBootstrapLocale({
          workspaceLocale: r.workspace_locale,
          userLanguage: r.language,
          cookieLocale: locale,
        });
        if (isAppLocale(resolved) && resolved !== locale) {
          void setLocale(resolved);
        }
      })
      .catch(() => undefined);
  }, [setTimezone, setDateFormat, setLocale, locale]);

  return null;
}
