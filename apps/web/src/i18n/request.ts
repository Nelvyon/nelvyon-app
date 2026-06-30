import { getRequestConfig } from "next-intl/server";

import { routing, type AppLocale } from "../../i18n";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as AppLocale)) {
    locale = routing.defaultLocale;
  }

  try {
    const messages = (await import(`../../messages/${locale}.json`)).default;
    return { locale, messages, timeZone: "Europe/Madrid" };
  } catch {
    const messages = (await import("../../messages/es.json")).default;
    return { locale: routing.defaultLocale, messages, timeZone: "Europe/Madrid" };
  }
});
