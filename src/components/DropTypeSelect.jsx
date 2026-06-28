import React from "react";
import { normalizeDropTypes } from "../lib/dropTypes";
import { useAppSettingsContext, useI18n } from "../lib/i18n/AppSettingsContext";

export default function DropTypeSelect({
  value,
  onChange,
  disabled = false,
  className = "input-luxury px-2 py-1.5 text-xs rounded-sm",
  required = false,
}) {
  const { settings } = useAppSettingsContext();
  const { t } = useI18n();
  const options = normalizeDropTypes(settings.dropTypes);
  const hasLegacy = value && !options.some((d) => d.toLowerCase() === value.toLowerCase());

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={className}
      required={required}
    >
      <option value="">{t("admin.selectDrop")}</option>
      {hasLegacy ? <option value={value}>{value}</option> : null}
      {options.map((drop) => (
        <option key={drop} value={drop}>
          {drop}
        </option>
      ))}
    </select>
  );
}
