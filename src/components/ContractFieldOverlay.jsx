import React, { useCallback, useEffect } from "react";
import {
  FIELD_EDITORS,
  isAdminEditable,
  isClientEditable,
  normalizeFieldEditor,
  normalizeFieldDefault,
} from "../lib/contractFields";

const TYPE_LABELS = {
  text: "טקסט",
  date: "תאריך",
  checkbox: "☑",
  signature: "חתימה",
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function FieldBadge({ field }) {
  const editor = normalizeFieldEditor(field);
  const badgeClass =
    editor === FIELD_EDITORS.admin
      ? " is-admin"
      : editor === FIELD_EDITORS.both
        ? " is-both"
        : " is-client";
  const label =
    editor === FIELD_EDITORS.admin ? "אדמין" : editor === FIELD_EDITORS.both ? "שניהם" : "לקוח";

  return <span className={`contract-field-badge${badgeClass}`}>{label}</span>;
}

function ClientFieldInput({ field, value, onChange, readOnly }) {
  const style = {
    left: `${field.x}%`,
    top: `${field.y}%`,
    width: `${field.width}%`,
    height: `${field.height}%`,
  };

  if (readOnly) {
    const display =
      field.type === "checkbox"
        ? value
          ? "☑"
          : "☐"
        : String(value ?? normalizeFieldDefault(field) ?? "");

    return (
      <div
        className={`contract-field-input contract-field-input--readonly contract-field-input--${field.type}`}
        style={style}
        title={field.label}
        aria-label={field.label}
      >
        <span className="contract-field-readonly-text">{display || "—"}</span>
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label key={field.id} className="contract-field-input contract-field-input--checkbox" style={style}>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange?.(field.id, e.target.checked)}
          aria-label={field.label}
        />
      </label>
    );
  }

  if (field.type === "signature") {
    return (
      <div className="contract-field-input contract-field-input--signature" style={style}>
        {value ? (
          <img src={value} alt={field.label} className="contract-signature-preview" />
        ) : (
          <span className="contract-field-placeholder">{field.label}</span>
        )}
      </div>
    );
  }

  return (
    <input
      type={field.type === "date" ? "date" : "text"}
      value={value ?? ""}
      onChange={(e) => onChange?.(field.id, e.target.value)}
      placeholder={field.label}
      className={`contract-field-input contract-field-input--${field.type}`}
      style={style}
      aria-label={field.label}
    />
  );
}

function AdminFieldMarker({
  field,
  selected,
  onSelect,
  onChange,
  onDelete,
  containerRef,
}) {
  const startInteraction = useCallback(
    (e, mode) => {
      e.stopPropagation();
      e.preventDefault();
      onSelect?.(field.id);

      const container = containerRef?.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const start = { x: field.x, y: field.y, width: field.width, height: field.height };

      const onMove = (ev) => {
        const dx = ((ev.clientX - startX) / rect.width) * 100;
        const dy = ((ev.clientY - startY) / rect.height) * 100;

        if (mode === "move") {
          onChange?.(field.id, {
            x: clamp(start.x + dx, 0, 100 - field.width),
            y: clamp(start.y + dy, 0, 100 - field.height),
          });
        } else {
          onChange?.(field.id, {
            width: clamp(start.width + dx, 2, 100 - start.x),
            height: clamp(start.height + dy, 2, 100 - start.y),
          });
        }
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [containerRef, field, onChange, onSelect]
  );

  const style = {
    left: `${field.x}%`,
    top: `${field.y}%`,
    width: `${field.width}%`,
    height: `${field.height}%`,
  };

  const preview = normalizeFieldDefault(field);
  const previewText =
    field.type === "checkbox"
      ? preview
        ? "☑"
        : ""
      : preview
        ? String(preview)
        : "";

  return (
    <div
      className={`contract-field-marker contract-field-marker--${field.type}${
        normalizeFieldEditor(field) === FIELD_EDITORS.admin
          ? " is-admin-field"
          : normalizeFieldEditor(field) === FIELD_EDITORS.both
            ? " is-both-field"
            : ""
      }${selected ? " is-selected" : ""}`}
      style={style}
      onPointerDown={(e) => {
        if (e.target.closest(".contract-field-resize-handle, .contract-field-delete-btn")) return;
        startInteraction(e, "move");
      }}
      onClick={(e) => e.stopPropagation()}
      title={field.label}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          onDelete?.(field.id);
        }
      }}
    >
      <FieldBadge field={field} />
      <span className="contract-field-marker-label">{field.label || TYPE_LABELS[field.type]}</span>
      {previewText ? <span className="contract-field-marker-preview">{previewText}</span> : null}
      {selected ? (
        <>
          <button
            type="button"
            className="contract-field-delete-btn"
            aria-label="מחק שדה"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(field.id);
            }}
          >
            ×
          </button>
          <span
            className="contract-field-resize-handle"
            aria-hidden
            onPointerDown={(e) => startInteraction(e, "resize")}
          />
        </>
      ) : null}
    </div>
  );
}

export default function ContractFieldOverlay({
  fields = [],
  mode = "admin",
  values = {},
  onChange,
  onDefaultValueChange,
  selectedFieldId,
  onSelectField,
  onFieldChange,
  onDeleteField,
  containerRef,
  onScrollToSignature,
}) {
  useEffect(() => {
    if (mode !== "admin" || !selectedFieldId || !onDeleteField) return;

    const onKey = (e) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        onDeleteField(selectedFieldId);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, selectedFieldId, onDeleteField]);

  return (
    <div className="contract-field-layer" aria-hidden={mode === "admin"}>
      {fields.map((field) => {
        if (mode === "admin-fill") {
          return (
            <ClientFieldInput
              key={field.id}
              field={field}
              value={values[field.id]}
              onChange={onDefaultValueChange}
              readOnly={false}
            />
          );
        }

        if (mode === "admin-ticket") {
          const readOnly = !isAdminEditable(field);
          const value = values[field.id] ?? normalizeFieldDefault(field);
          return (
            <ClientFieldInput
              key={field.id}
              field={field}
              value={value}
              onChange={onChange}
              readOnly={readOnly}
            />
          );
        }

        if (mode === "admin") {
          return (
            <AdminFieldMarker
              key={field.id}
              field={field}
              selected={selectedFieldId === field.id}
              onSelect={onSelectField}
              onChange={onFieldChange}
              onDelete={onDeleteField}
              containerRef={containerRef}
            />
          );
        }

        if (mode === "client-signature-hint") {
          const style = {
            left: `${field.x}%`,
            top: `${field.y}%`,
            width: `${field.width}%`,
            height: `${field.height}%`,
          };
          const signed = Boolean(values[field.id]);
          return (
            <button
              key={field.id}
              type="button"
              className={`contract-field-signature-hint${signed ? " is-signed" : ""}`}
              style={style}
              onClick={() => onScrollToSignature?.()}
              title={field.label}
            >
              {signed ? "✓ חתום" : "✍️ לחצו לחתום"}
            </button>
          );
        }

        const readOnly = !isClientEditable(field);
        const value = values[field.id] ?? normalizeFieldDefault(field);

        return (
          <ClientFieldInput
            key={field.id}
            field={field}
            value={value}
            onChange={onChange}
            readOnly={readOnly}
          />
        );
      })}
    </div>
  );
}
