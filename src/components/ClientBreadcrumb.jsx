import React from "react";
import { useI18n } from "../lib/i18n/AppSettingsContext";

const SCREEN_KEYS = {
  home: "breadcrumb.home",
  wizard: "breadcrumb.preferences",
  browse: "breadcrumb.browse",
  guide: "breadcrumb.guide",
  tutorial: "breadcrumb.tutorial",
};

export default function ClientBreadcrumb({ screen, wizardStepTitle = "" }) {
  const { t, dir } = useI18n();

  const crumbs = [{ id: "home", label: t("breadcrumb.home") }];
  if (screen === "wizard") {
    crumbs.push({ id: "wizard", label: t("breadcrumb.preferences") });
    if (wizardStepTitle) {
      crumbs.push({ id: "step", label: wizardStepTitle, current: true });
    }
  } else if (screen !== "home") {
    crumbs.push({
      id: screen,
      label: t(SCREEN_KEYS[screen] ?? "breadcrumb.home"),
      current: true,
    });
  } else {
    crumbs[0].current = true;
  }

  return (
    <nav className="client-breadcrumb" aria-label={t("breadcrumb.label")} dir={dir}>
      <ol className="client-breadcrumb-list">
        {crumbs.map((crumb, index) => (
          <li key={crumb.id} className="client-breadcrumb-item">
            {index > 0 ? (
              <span className="client-breadcrumb-sep" aria-hidden>
                {dir === "rtl" ? "‹" : "›"}
              </span>
            ) : null}
            <span
              className={`client-breadcrumb-text${crumb.current ? " is-current" : ""}`}
              aria-current={crumb.current ? "page" : undefined}
            >
              {crumb.label}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
