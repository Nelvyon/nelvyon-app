"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useLocaleContext } from "@/core/i18n/LocaleProvider";
import { cn } from "@/core/ui/utils";
import {
  APP_LOCALES,
  LOCALE_FLAGS,
  LOCALE_LABELS,
  type AppLocale,
} from "../../i18n";

export function DashboardLanguageSelector() {
  const t = useTranslations("shell");
  const { locale, setLocale } = useLocaleContext();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function pick(next: AppLocale) {
    setOpen(false);
    if (next === locale) return;
    setBusy(true);
    try {
      await setLocale(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={t("selectLanguage")}
        disabled={busy}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm",
          "hover:bg-muted transition-colors",
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{LOCALE_FLAGS[locale]}</span>
        <span className="hidden sm:inline">{LOCALE_LABELS[locale]}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label={t("closeMenu")}
            onClick={() => setOpen(false)}
          />
          <ul className="absolute right-0 z-50 mt-1 min-w-[160px] rounded-lg border border-border bg-card py-1 shadow-lg">
            {APP_LOCALES.map((code) => (
              <li key={code}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted",
                    code === locale && "bg-primary/10 font-medium",
                  )}
                  onClick={() => pick(code)}
                >
                  <span>{LOCALE_FLAGS[code]}</span>
                  <span>{LOCALE_LABELS[code]}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
