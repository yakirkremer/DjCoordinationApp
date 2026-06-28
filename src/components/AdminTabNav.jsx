import React from "react";
import { useI18n } from "../lib/i18n/AppSettingsContext";

const TAB_IDS = ["catalog", "clients", "form", "analytics", "settings"];

export default function AdminTabNav({ activeTab, onTabChange }) {
  const { t, dir } = useI18n();

  return (
    <div className="flex gap-2 mb-6 border-b border-xdj-border pb-2 flex-wrap" dir={dir}>
      {TAB_IDS.map((id) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`chip-xdj ${activeTab === id ? "is-active" : ""}`}
        >
          {t(`admin.tabs.${id}`)}
        </button>
      ))}
    </div>
  );
}
