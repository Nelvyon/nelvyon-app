"use client";

import { useEffect } from "react";

import { useLocaleContext } from "@/core/i18n/LocaleProvider";
import { localeSettingsApi } from "@/features/settings/localeApi";
import { isAppLocale } from "../../../i18n";

/** Load workspace timezone + user language from API after auth is ready. */
export function RegionBootstrap() {
  const { setTimezone, setDateFormat, setLocale, locale } = useLocaleContext();

  useEffect(() => {
    localeSettingsApi
      .getRegion()
      .then((r) => {
        if (r.timezone) setTimezone(r.timezone);
        if (r.date_format) setDateFormat(r.date_format);
        if (r.language && isAppLocale(r.language) && r.language !== locale) {
          void setLocale(r.language);
        }
      })
      .catch(() => undefined);
  }, [setTimezone, setDateFormat, setLocale, locale]);

  return null;
}
