import React, { useState } from "react";
import ClientLogin from "./ClientLogin";
import LanguageSwitcher from "./LanguageSwitcher";
import EditableText from "./EditableText";
import { useI18n } from "../lib/i18n/AppSettingsContext";

export default function WelcomePage({ onLogin, onEnterAdmin, onOpenGuide, onOpenTutorial }) {
  const [showClientLogin, setShowClientLogin] = useState(false);
  const { dir } = useI18n();

  return (
    <div className="welcome-page flex flex-col items-center justify-center flex-1 min-h-0 py-8 px-4">
      <div className="welcome-hero text-center mb-10 max-w-lg">
        <img
          src="/kremer-logo.png"
          alt="KREMER"
          className="h-12 sm:h-14 w-auto mx-auto mb-6 object-contain"
        />
        <p className="font-lcd text-[10px] tracking-[0.35em] text-xdj-cyan uppercase mb-3">
          Kramer Music
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-xdj-gold mb-3">
          <EditableText k="welcome.title" />
        </h1>
        <p className="text-sm text-xdj-muted leading-relaxed">
          <EditableText k="welcome.subtitle" />
        </p>
      </div>

      <div className="welcome-actions w-full max-w-md flex flex-col gap-4">
        {!showClientLogin ? (
          <>
            <button
              type="button"
              onClick={() => setShowClientLogin(true)}
              className="btn-luxury-primary px-6 py-4 rounded-sm text-sm tracking-widest min-h-[52px]"
            >
              <EditableText k="welcome.clientLogin" />
            </button>
            <div className="flex items-center gap-3 text-xdj-muted text-xs">
              <span className="flex-1 h-px bg-xdj-border" />
              <span>
                <EditableText k="common.or" />
              </span>
              <span className="flex-1 h-px bg-xdj-border" />
            </div>
            <button
              type="button"
              onClick={onEnterAdmin}
              className="btn-luxury px-6 py-4 rounded-sm text-sm tracking-wider min-h-[52px]"
            >
              <EditableText k="welcome.adminLogin" />
            </button>
            <button
              type="button"
              onClick={onOpenTutorial}
              className="text-xs text-xdj-cyan hover:text-xdj-text py-2 underline-offset-2 hover:underline"
            >
              <EditableText k="welcome.openTutorial" />
            </button>
            <button
              type="button"
              onClick={onOpenGuide}
              className="text-xs text-xdj-muted hover:text-xdj-text py-2 underline-offset-2 hover:underline"
            >
              <EditableText k="welcome.openGuide" />
            </button>
          </>
        ) : (
          <div className="welcome-login-wrap" dir={dir}>
            <ClientLogin
              onLogin={(code) => {
                const ok = onLogin(code);
                if (ok) setShowClientLogin(false);
                return ok;
              }}
            />
            <button
              type="button"
              onClick={() => setShowClientLogin(false)}
              className="w-full mt-3 text-xs text-xdj-muted hover:text-xdj-text py-2"
            >
              <EditableText k="common.back" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-8">
        <LanguageSwitcher />
      </div>
    </div>
  );
}
