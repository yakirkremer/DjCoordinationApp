import React from "react";
import { LOCALE_LABELS, LOCALES } from "../lib/i18n/translations";
import { useI18n } from "../lib/i18n/AppSettingsContext";

export default function LanguageSwitcher({ className = "" }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className={`flex items-center gap-1 ${className}`} role="group" aria-label={t("common.language")}>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`chip-xdj text-[10px] px-2 py-1 min-h-[32px] ${locale === code ? "is-active" : ""}`}
          aria-pressed={locale === code}
        >
          {LOCALE_LABELS[code]}
        </button>
      ))}
    </div>
  );
}
