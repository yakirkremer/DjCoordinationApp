import React from "react";
import { getStyleDesc, getStyleLabel } from "../lib/designStyles";

function StylePreview({ kind, active }) {
  return (
    <span
      className={`design-style-preview design-style-preview--${kind} ${active ? "is-active" : ""}`}
      aria-hidden
    />
  );
}

export default function DesignStylePicker({ styles, value, onChange, locale }) {
  return (
    <div className="appearance-style-grid">
      {styles.map((style) => {
        const active = value === style.id;
        return (
          <button
            key={style.id}
            type="button"
            onClick={() => onChange(style.id)}
            className={`design-style-card ${active ? "is-active" : ""}`}
            aria-pressed={active}
          >
            <StylePreview kind={style.preview} active={active} />
            <span className="design-style-card-name">{getStyleLabel(style, locale)}</span>
            <span className="design-style-card-desc">{getStyleDesc(style, locale)}</span>
          </button>
        );
      })}
    </div>
  );
}
