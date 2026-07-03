import React from "react";
import { isClientEditable } from "../lib/contractFields";
import {
  contractDateToIsoInput,
  normalizeContractDateValue,
} from "../lib/contractDateFormat";
import { useI18n } from "../lib/i18n/AppSettingsContext";

function MobileFieldControl({ field, value, onChange }) {
  const label = field.label || field.type;

  if (field.type === "checkbox") {
    return (
      <label className="contract-mobile-field contract-mobile-field--checkbox">
        <input
          type="checkbox"
          className="contract-mobile-field-checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(field.id, e.target.checked)}
        />
        <span className="contract-mobile-field-label">
          {label}
          {field.required ? <span className="contract-mobile-field-required"> *</span> : null}
        </span>
      </label>
    );
  }

  if (field.type === "date") {
    return (
      <label className="contract-mobile-field">
        <span className="contract-mobile-field-label">
          {label}
          {field.required ? <span className="contract-mobile-field-required"> *</span> : null}
        </span>
        <input
          type="date"
          className="contract-mobile-field-input"
          value={contractDateToIsoInput(value)}
          onChange={(e) =>
            onChange(field.id, normalizeContractDateValue(e.target.value))
          }
          aria-label={label}
        />
      </label>
    );
  }

  return (
    <label className="contract-mobile-field">
      <span className="contract-mobile-field-label">
        {label}
        {field.required ? <span className="contract-mobile-field-required"> *</span> : null}
      </span>
      <input
        type="text"
        className="contract-mobile-field-input"
        value={value ?? ""}
        onChange={(e) => onChange(field.id, e.target.value)}
        aria-label={label}
        autoComplete="off"
      />
    </label>
  );
}

export default function ContractMobileFieldForm({ fields = [], values = {}, onChange }) {
  const { t } = useI18n();
  const editableFields = fields.filter(
    (field) => field.type !== "signature" && isClientEditable(field)
  );

  if (!editableFields.length) return null;

  return (
    <section className="contract-mobile-fields panel-luxury" aria-label={t("home.contractMobileFieldsTitle")}>
      <h2 className="contract-mobile-fields-title">{t("home.contractMobileFieldsTitle")}</h2>
      <p className="contract-mobile-fields-desc">{t("home.contractMobileFieldsDesc")}</p>
      <div className="contract-mobile-fields-grid">
        {editableFields.map((field) => (
          <MobileFieldControl
            key={field.id}
            field={field}
            value={values[field.id]}
            onChange={onChange}
          />
        ))}
      </div>
    </section>
  );
}
