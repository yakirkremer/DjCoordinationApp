import React from "react";
import { TUTORIAL_ILLUSTRATIONS } from "./TutorialIllustrations";
import { useI18n } from "../lib/i18n/AppSettingsContext";

const STEP_IDS = [
  "login",
  "dashboard",
  "eventDetails",
  "timeline",
  "genres",
  "energy",
  "phases",
  "playlists",
  "summary",
  "browse",
];

function getStepOptions(t, stepId) {
  const options = [];
  for (let i = 0; i < 12; i += 1) {
    const key = `tutorial.steps.${stepId}.options.${i}`;
    const value = t(key);
    if (value === key) break;
    options.push(value);
  }
  return options;
}

export default function TutorialPage({ onBack, onOpenGuide }) {
  const { t, dir } = useI18n();

  return (
    <div className="tutorial-page flex flex-col gap-5 sm:gap-6 pb-6" dir={dir}>
      <div className="tutorial-hero panel-luxury rounded-sm p-5 sm:p-8">
        <p className="tutorial-kicker font-[system-ui,-apple-system,BlinkMacSystemFont,sans-serif] text-[10px] tracking-[0.25em] text-xdj-cyan uppercase mb-2">
          {t("tutorial.kicker")}
        </p>
        <h1 className="text-xl sm:text-2xl font-semibold text-xdj-gold mb-2">{t("tutorial.title")}</h1>
        <p className="text-sm text-xdj-muted max-w-2xl leading-relaxed">{t("tutorial.intro")}</p>
        <div className="tutorial-flow-overview mt-6">
          {STEP_IDS.map((id, index) => (
            <span key={id} className="tutorial-flow-chip">
              <span className="tutorial-flow-num">{index + 1}</span>
              {t(`tutorial.steps.${id}.short`)}
            </span>
          ))}
        </div>
        {onBack ? (
          <button type="button" onClick={onBack} className="btn-luxury mt-5 px-4 py-2 rounded-sm text-xs">
            {t("common.back")}
          </button>
        ) : null}
      </div>

      <div className="tutorial-steps flex flex-col gap-4 sm:gap-5">
        {STEP_IDS.map((id, index) => {
          const Illustration = TUTORIAL_ILLUSTRATIONS[id];
          const weddingOnly = id === "timeline" || id === "phases";
          const options = getStepOptions(t, id);

          return (
            <article key={id} className="tutorial-step panel-luxury rounded-sm">
              <div className="tutorial-step-header">
                <span className="tutorial-step-num" aria-hidden>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="tutorial-step-heading">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="tutorial-step-title">{t(`tutorial.steps.${id}.title`)}</h2>
                    {weddingOnly ? (
                      <span className="tutorial-badge">{t("tutorial.weddingOnly")}</span>
                    ) : null}
                  </div>
                  <p className="tutorial-step-desc">{t(`tutorial.steps.${id}.description`)}</p>
                </div>
              </div>

              <div className="tutorial-step-body">
                {Illustration ? <Illustration label={t(`tutorial.steps.${id}.title`)} /> : null}
                {options.length > 0 ? (
                  <div className="tutorial-options">
                    <h3 className="tutorial-options-title">{t("tutorial.optionsTitle")}</h3>
                    <ul className="tutorial-options-list">
                      {options.map((option) => (
                        <li key={option}>{option}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <section className="tutorial-footer panel-luxury rounded-sm p-5 sm:p-6">
        <h2 className="guide-section-title">{t("tutorial.footerTitle")}</h2>
        <p className="text-xs text-xdj-muted mb-4 max-w-2xl leading-relaxed">{t("tutorial.footerBody")}</p>
        {onOpenGuide ? (
          <button type="button" onClick={onOpenGuide} className="btn-luxury-gold px-4 py-2 rounded-sm text-xs">
            {t("tutorial.openGuide")}
          </button>
        ) : null}
      </section>
    </div>
  );
}
