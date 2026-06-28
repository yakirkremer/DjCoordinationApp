import React from "react";
import EditableText from "./EditableText";
import { useAppSettingsContext, useI18n } from "../lib/i18n/AppSettingsContext";

export default function SiteTextEditBanner() {
  const { siteTextEditMode } = useAppSettingsContext();
  const { t } = useI18n();

  if (!siteTextEditMode) return null;

  return (
    <div className="site-text-edit-banner" role="status">
      <EditableText k="admin.siteTextEditHint" />
    </div>
  );
}
