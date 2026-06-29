import React from "react";
import AdminLogin from "./AdminLogin";
import EditableText from "./EditableText";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "../lib/i18n/AppSettingsContext";

export default function AdminGate({ onLogin, onBackToClient }) {
  const { dir } = useI18n();

  return (
    <div className="welcome-page flex flex-col items-center justify-center flex-1 min-h-0 py-8 px-4">
      <div className="welcome-hero text-center mb-8 max-w-lg">
        <img
          src="/kremer-logo.png"
          alt="KREMER"
          className="h-12 sm:h-14 w-auto mx-auto mb-6 object-contain"
        />
        <p className="font-lcd text-[10px] tracking-[0.35em] text-xdj-cyan uppercase mb-3">
          Kramer Music
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-xdj-gold mb-3">
          <EditableText k="welcome.adminLogin" />
        </h1>
      </div>

      <div className="welcome-actions w-full max-w-md flex flex-col gap-4">
        <div className="welcome-login-wrap" dir={dir}>
          <AdminLogin onLogin={onLogin} />
        </div>
        <button
          type="button"
          onClick={onBackToClient}
          className="w-full text-xs text-xdj-muted hover:text-xdj-text py-2"
        >
          <EditableText k="welcome.backToClient" />
        </button>
      </div>

      <div className="mt-8">
        <LanguageSwitcher />
      </div>
    </div>
  );
}
