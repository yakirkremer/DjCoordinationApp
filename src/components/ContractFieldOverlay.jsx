import React, { useCallback, useEffect } from "react";

const TYPE_LABELS = {
  text: "טקסט",
  date: "תאריך",
  checkbox: "☑",
  signature: "חתימה",
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

  return (
    <div
      className={`contract-field-marker contract-field-marker--${field.type}${
        selected ? " is-selected" : ""
      }`}
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
      <span className="contract-field-marker-label">{field.label || TYPE_LABELS[field.type]}</span>
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
  selectedFieldId,
  onSelectField,
  onFieldChange,
  onDeleteField,
  containerRef,
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
        const style = {
          left: `${field.x}%`,
          top: `${field.y}%`,
          width: `${field.width}%`,
          height: `${field.height}%`,
        };

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
