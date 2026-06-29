import React, { useMemo } from "react";
import { useI18n } from "../lib/i18n/AppSettingsContext";

function formatRelativeTime(date, locale) {
  if (!date) return null;
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 15000) return "justNow";
  if (diffMs < 60000) return "seconds";
  if (diffMs < 3600000) return "minutes";
  return "time";
}

export default function WizardSaveStatus({ isSaving, lastSavedAt }) {
  const { t, locale } = useI18n();

  const label = useMemo(() => {
    if (isSaving) return t("wizard.savingNow");
    if (!lastSavedAt) return t("wizard.autoSave");
    const kind = formatRelativeTime(lastSavedAt, locale);
    if (kind === "justNow") return t("wizard.savedJustNow");
    if (kind === "seconds") {
      const secs = Math.max(1, Math.round((Date.now() - lastSavedAt.getTime()) / 1000));
      return t("wizard.savedSecondsAgo", { count: secs });
    }
    if (kind === "minutes") {
      const mins = Math.max(1, Math.round((Date.now() - lastSavedAt.getTime()) / 60000));
      return t("wizard.savedMinutesAgo", { count: mins });
    }
    return t("wizard.savedAt", {
      time: lastSavedAt.toLocaleTimeString(locale === "he" ? "he-IL" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  }, [isSaving, lastSavedAt, t, locale]);

  return (
    <p className={`wizard-autosave-hint${isSaving ? " is-saving" : ""}`} aria-live="polite">
      {label}
    </p>
  );
}
