import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "never",
  localeCookie: {
    name: "NELVYON_LOCALE",
  },
});

export type AppLocale = (typeof routing.locales)[number];
