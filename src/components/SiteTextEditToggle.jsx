import React from "react";
import { useAppSettingsContext, useI18n } from "../lib/i18n/AppSettingsContext";

export default function SiteTextEditToggle({ className = "" }) {
  const { siteTextEditMode, setSiteTextEditMode } = useAppSettingsContext();
  const { t } = useI18n();

  return (
    <button
      type="button"
      onClick={() => setSiteTextEditMode(!siteTextEditMode)}
      className={`btn-luxury px-3 py-2 rounded-sm text-xs ${siteTextEditMode ? "border-xdj-cyan text-xdj-cyan" : ""} ${className}`}
      aria-pressed={siteTextEditMode}
    >
      {siteTextEditMode ? t("admin.siteTextEditOff") : t("admin.siteTextEditOn")}
    </button>
  );
}
