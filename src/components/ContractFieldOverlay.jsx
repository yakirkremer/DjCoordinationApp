import React from "react";

const TYPE_LABELS = {
  text: "טקסט",
  date: "תאריך",
  checkbox: "☑",
  signature: "חתימה",
};

export default function ContractFieldOverlay({
  fields = [],
  mode = "admin",
  values = {},
  onChange,
  selectedFieldId,
  onSelectField,
}) {
  return (
    <div className="contract-field-layer" aria-hidden={mode === "admin"}>
      {fields.map((field) => {
        const style = {
          left: `${field.x}%`,
          top: `${field.y}%`,
          width: `${field.width}%`,
          height: `${field.height}%`,
        };

        if (mode === "admin") {
          return (
            <button
              key={field.id}
              type="button"
              className={`contract-field-marker contract-field-marker--${field.type}${
                selectedFieldId === field.id ? " is-selected" : ""
              }`}
              style={style}
              onClick={(e) => {
                e.stopPropagation();
                onSelectField?.(field.id);
              }}
              title={field.label}
            >
              <span className="contract-field-marker-label">{field.label || TYPE_LABELS[field.type]}</span>
            </button>
          );
        }

        if (field.type === "checkbox") {
          return (
            <label key={field.id} className="contract-field-input contract-field-input--checkbox" style={style}>
              <input
                type="checkbox"
                checked={Boolean(values[field.id])}
                onChange={(e) => onChange?.(field.id, e.target.checked)}
                aria-label={field.label}
              />
            </label>
          );
        }

        if (field.type === "signature") {
          return (
            <div key={field.id} className="contract-field-input contract-field-input--signature" style={style}>
              {values[field.id] ? (
                <img src={values[field.id]} alt={field.label} className="contract-signature-preview" />
              ) : (
                <span className="contract-field-placeholder">{field.label}</span>
              )}
            </div>
          );
        }

        return (
          <input
            key={field.id}
            type={field.type === "date" ? "date" : "text"}
            value={values[field.id] ?? ""}
            onChange={(e) => onChange?.(field.id, e.target.value)}
            placeholder={field.label}
            className={`contract-field-input contract-field-input--${field.type}`}
            style={style}
            aria-label={field.label}
          />
        );
      })}
    </div>
  );
}
