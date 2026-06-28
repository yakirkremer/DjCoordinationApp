import React, { useEffect, useRef, useState } from "react";
import { TEXT_SIZE_OPTIONS } from "../lib/accessibility";
import { useAppSettingsContext, useI18n } from "../lib/i18n/AppSettingsContext";

function A11ySwitch({ id, label, description, checked, onChange }) {
  return (
    <div className="a11y-toggle-row">
      <div className="a11y-toggle-copy">
        <span className="a11y-toggle-label" id={`${id}-label`}>
          {label}
        </span>
        {description ? <span className="a11y-toggle-desc">{description}</span> : null}
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        className={`a11y-switch ${checked ? "is-on" : ""}`}
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}

export default function AccessibilityToolbar() {
  const { accessibility, setAccessibility, resetAccessibility } = useAppSettingsContext();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const hasCustomPrefs =
    accessibility.textSize !== "default" ||
    accessibility.highContrast ||
    accessibility.reducedMotion ||
    accessibility.strongFocus ||
    accessibility.underlineLinks ||
    accessibility.readableText;

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="a11y-toolbar">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`a11y-toolbar-toggle ${open || hasCustomPrefs ? "is-active" : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t("a11y.toolbar")}
      >
        <svg
          className="a11y-toolbar-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden="true"
        >
          <circle cx="12" cy="4.5" r="2" />
          <path d="M12 7v3" />
          <path d="M5.5 9.5 8 14" />
          <path d="M18.5 9.5 16 14" />
          <circle cx="7" cy="17.5" r="2" />
          <circle cx="17" cy="17.5" r="2" />
          <path d="M9 17.5h6" />
        </svg>
        <span className="a11y-toolbar-toggle-label">{t("a11y.toolbarShort")}</span>
      </button>

      {open ? (
        <div className="a11y-panel" role="dialog" aria-label={t("a11y.toolbar")}>
          <h2 className="a11y-panel-title">{t("a11y.toolbar")}</h2>

          <section className="a11y-section">
            <span className="a11y-section-label">{t("a11y.textSize")}</span>
            <div className="a11y-text-size-row" role="group" aria-label={t("a11y.textSize")}>
              {TEXT_SIZE_OPTIONS.map((option) => {
                const isActive = accessibility.textSize === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    data-size={option.id}
                    className={`a11y-text-size-btn ${isActive ? "is-active" : ""}`}
                    aria-pressed={isActive}
                    onClick={() => setAccessibility({ textSize: option.id })}
                  >
                    {t(`a11y.textSize.${option.id}`)}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="a11y-section">
            <A11ySwitch
              id="a11y-high-contrast"
              label={t("a11y.highContrast")}
              description={t("a11y.highContrastDesc")}
              checked={accessibility.highContrast}
              onChange={(highContrast) => setAccessibility({ highContrast })}
            />
            <A11ySwitch
              id="a11y-reduced-motion"
              label={t("a11y.reducedMotion")}
              description={t("a11y.reducedMotionDesc")}
              checked={accessibility.reducedMotion}
              onChange={(reducedMotion) => setAccessibility({ reducedMotion })}
            />
            <A11ySwitch
              id="a11y-strong-focus"
              label={t("a11y.strongFocus")}
              description={t("a11y.strongFocusDesc")}
              checked={accessibility.strongFocus}
              onChange={(strongFocus) => setAccessibility({ strongFocus })}
            />
            <A11ySwitch
              id="a11y-underline-links"
              label={t("a11y.underlineLinks")}
              description={t("a11y.underlineLinksDesc")}
              checked={accessibility.underlineLinks}
              onChange={(underlineLinks) => setAccessibility({ underlineLinks })}
            />
            <A11ySwitch
              id="a11y-readable-text"
              label={t("a11y.readableText")}
              description={t("a11y.readableTextDesc")}
              checked={accessibility.readableText}
              onChange={(readableText) => setAccessibility({ readableText })}
            />
          </section>

          <button
            type="button"
            className="a11y-reset-btn"
            onClick={() => {
              resetAccessibility();
            }}
          >
            {t("a11y.reset")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
