import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  /** Default locale (es) at `/`; `/en` for English. `/es` also resolves via `[locale]/page`. */
  localePrefix: "as-needed",
  localeCookie: {
    name: "NELVYON_LOCALE",
  },
});

export type AppLocale = (typeof routing.locales)[number];
